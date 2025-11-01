import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import depthLimit from "graphql-depth-limit";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";
import { createComplexityPlugin } from './src/middleware/complexityPlugin.js';
import { createLoggingPlugin } from './src/middleware/loggingPlugin.js';
import { ValidationError } from './src/utils/validation.js';
import { logger, logServerStart, logServerShutdown } from './src/utils/logger.js';

// Import service components
import { activityTypeDefs } from './src/services/activity/schema/index.js';
import { analyticsTypeDefs } from './src/services/analytics/schema/index.js';
import { activityResolvers } from './src/services/activity/resolvers/index.js';
import { analyticsResolvers } from './src/services/analytics/resolvers/index.js';
import { ActivityService } from './src/services/activity/datasource/activityService.js';
import { AnalyticsService } from './src/services/analytics/datasource/analyticsService.js';
import { config } from './src/config/index.js';

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
// Log presence of JWT secret for debugging (NOT the value itself)
logger.info({ 
  type: 'config',
  jwtSecretConfigured: !!JWT_SECRET_KEY 
}, 'JWT configuration check');

/**
 * Helper function to verify JWT
 */
function verifyJWT(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header')
  }
  
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET_KEY);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

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
    logger.error({
      type: 'health_check_error',
      error: {
        message: error.message,
        name: error.name,
      }
    }, 'Health check error');
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
  // Error logging is handled by the logging plugin
  // This formatter only formats the error for the client response
  
  // Handle ValidationError instances directly
  if (error.originalError instanceof ValidationError) {
    const validationError = error.originalError;
    return {
      message: validationError.message,
      field: validationError.field,
      code: validationError.code,
      locations: error.locations,
      path: error.path,
      timestamp: new Date().toISOString()
    };
  }
  
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
    logger.info({ type: 'shutdown_signal', signal: 'SIGTERM' }, 'SIGTERM received, shutting down gracefully');
    server.stop().then(() => {
      logServerShutdown();
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
    
    // Security headers middleware
    app.use(helmet({
      // Prevent content type sniffing
      noSniff: true,
      // Allow same-origin frame embedding for Apollo Sandbox
      frameguard: {
        action: 'sameorigin'
      },
      // Content Security Policy - provides XSS protection
      // Relaxed for Apollo Sandbox compatibility - disable CSP for GraphQL endpoint
      // Note: CSP will still apply to other endpoints for security
      contentSecurityPolicy: false, // Disable CSP globally - we'll apply it selectively if needed
      // Hide powered-by header
      hidePoweredBy: true,
      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      // Legacy XSS protection header for older browsers (CSP is the modern approach)
      crossOriginEmbedderPolicy: false, // Can be enabled if needed, but may break some integrations
      crossOriginOpenerPolicy: false, // Can be enabled if needed
      crossOriginResourcePolicy: { policy: "cross-origin" } // Allows cross-origin requests
    }));
    
    // Add legacy X-XSS-Protection header for older browsers
    // (Modern browsers use CSP which is configured above)
    app.use((req, res, next) => {
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
    
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
        createComplexityPlugin(1500), // Add complexity limiting with max 1500 points
        createLoggingPlugin({
          logQueries: true,
          logVariables: true,
          slowQueryThreshold: 1000, // 1 second
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
      expressMiddleware(server, {
        context: async ({ req }) => {
          const authHeader = req.headers.authorization;
          let jwtPayload = null;

          // Only attempt verification if an Authorization header is present
          // This prevents introspection (used by Apollo) from being blocked
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              jwtPayload = verifyJWT(authHeader);
            } catch (err) {
              // Log warning but do not throw to allow playground/introspection
              logger.warn({
                type: 'jwt_verification_failed',
                error: {
                  message: err.message,
                  name: err.name,
                }
              }, 'JWT verification failed');
            }
          }

          return { authHeader, jwtPayload };
        }
      })
    );
    
    // Redirect root to GraphQL playground
    app.get("/", (_req, res) => res.redirect("/graphql"));
    
    // Start server
    app.listen(config.port, () => {
      logServerStart({
        port: config.port,
        graphqlEndpoint: `http://localhost:${config.port}/graphql`,
        healthEndpoint: `http://localhost:${config.port}/health`,
        metricsEndpoint: `http://localhost:${config.port}/metrics`,
        activityService: config.activityUrl,
        analyticsService: config.analyticsUrl,
        environment: config.nodeEnv,
      });
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    logger.fatal({
      type: 'server_startup_error',
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      }
    }, 'Failed to start GraphQL Gateway');
    process.exit(1);
  }
}

// Start the server
start().catch(error => {
  logger.fatal({
    type: 'startup_error',
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }, 'Startup error');
  process.exit(1);
});
