import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import depthLimit from "graphql-depth-limit";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

// Import service components
import { activityTypeDefs } from './src/services/activity/schema/index.js';
import { analyticsTypeDefs } from './src/services/analytics/schema/index.js';
import { activityResolvers } from './src/services/activity/resolvers/index.js';
import { analyticsResolvers } from './src/services/analytics/resolvers/index.js';
import { ActivityService } from './src/services/activity/datasource/activityService.js';
import { AnalyticsService } from './src/services/analytics/datasource/analyticsService.js';
import { config } from './src/config/index.js';

/**
 * Prometheus Metrics Setup
 */
const register = new Registry();
collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const graphqlRequestsTotal = new Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation', 'operationName']
});

const graphqlRequestDuration = new Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'Duration of GraphQL requests in seconds',
  labelNames: ['operation', 'operationName'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(graphqlRequestsTotal);
register.registerMetric(graphqlRequestDuration);

/**
 * GraphQL Schema Configuration
 */
const typeDefs = `
  type Query {
    _empty: String
  }
  
  type Mutation {
    _empty: String
  }
  
  ${activityTypeDefs}
  ${analyticsTypeDefs}
`;

/**
 * GraphQL Resolvers Configuration
 */
const resolvers = {
  Query: {
    ...activityResolvers.Query,
    ...analyticsResolvers.Query,
  },
  Mutation: {
    ...activityResolvers.Mutation,
  },
  AnalyticsQuery: {
    ...analyticsResolvers.AnalyticsQuery,
  }
};

/**
 * Service Instances
 */
const activityService = new ActivityService();
const analyticsService = new AnalyticsService();

/**
 * Rate Limiting Configuration
 */
const graphqlRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health Check Handler
 */
const handleHealthCheck = async (req, res) => {
  try {
    const [activityHealth, analyticsHealth] = await Promise.all([
      activityService.healthCheck(),
      analyticsService.healthCheck()
    ]);
    
    const overallStatus = (activityHealth.status === 'healthy' && analyticsHealth.status === 'healthy') 
      ? 'healthy' : 'degraded';
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      status: overallStatus,
      services: {
        activity: activityHealth,
        analytics: analyticsHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GraphQL Error Formatter
 */
const formatGraphQLError = (error) => {
  console.error('GraphQL Error:', error);
  return {
    message: error.message,
    locations: error.locations,
    path: error.path,
    timestamp: new Date().toISOString()
  };
};

/**
 * Graceful Shutdown Handler
 */
const setupGracefulShutdown = (server) => {
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.stop().then(() => {
      console.log('GraphQL server stopped');
      process.exit(0);
    });
  });
};

/**
 * Main Server Startup Function
 */
async function start() {
  try {
    const app = express();
    
    // HTTP request metrics middleware
    app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path || 'unknown';
        const status = res.statusCode.toString();
        
        httpRequestDuration.observe({ method: req.method, route, status }, duration);
        httpRequestTotal.inc({ method: req.method, route, status });
      });
      
      next();
    });
    
    // Metrics endpoint for Prometheus
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).end(error.message);
      }
    });
    
    // Health check endpoint
    app.get('/health', handleHealthCheck);

    // Create Apollo Server
    const server = new ApolloServer({ 
      typeDefs, 
      resolvers, 
      introspection: true,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({
          embed: true,      
          includeCookies: false
        }),
        {
          requestDidStart(requestContext) {
            const startTime = Date.now();
            
            return {
              willSendResponse(requestContext) {
                const { operation, operationName } = requestContext.request;
                const duration = (Date.now() - startTime) / 1000;
                const operationType = operation?.operation || 'unknown';
                
                graphqlRequestsTotal.inc({
                  operation: operationType,
                  operationName: operationName || 'anonymous'
                });
                
                graphqlRequestDuration.observe({
                  operation: operationType,
                  operationName: operationName || 'anonymous'
                }, duration);
              }
            };
          }
        }
      ],
      formatError: formatGraphQLError,
      validationRules: [depthLimit(6)] // Limit query depth to 6 levels
    });
    
    await server.start();

    // Configure GraphQL endpoint with rate limiting
    app.use("/graphql",
      graphqlRateLimit, // Apply rate limiting first
      cors({ origin: config.corsOrigins, credentials: true }),
      bodyParser.json(),
      expressMiddleware(server)
    );
    
    // Redirect root to GraphQL playground
    app.get("/", (_req, res) => res.redirect("/graphql"));
    
    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 GraphQL Gateway running at http://localhost:${config.port}/graphql`);
      console.log(`📊 Health check available at http://localhost:${config.port}/health`);
      console.log(`📈 Metrics endpoint available at http://localhost:${config.port}/metrics`);
      console.log(`🔗 Activity Service: ${config.activityUrl}`);
      console.log(`📈 Analytics Service: ${config.analyticsUrl}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('Failed to start GraphQL Gateway:', error);
    process.exit(1);
  }
}

// Start the server
start().catch(error => {
  console.error('Startup error:', error);
  process.exit(1);
});
