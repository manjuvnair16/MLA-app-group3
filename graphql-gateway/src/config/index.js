export const config = {
  port: process.env.PORT || 4000,
  activityUrl: process.env.ACTIVITY_URL || "http://activity-tracking:5300",
  analyticsUrl: process.env.ANALYTICS_URL || "http://analytics:5050",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost").split(","),
  nodeEnv: process.env.NODE_ENV || "development",
  
  // Timeout configurations
  timeouts: {
    query: 5000,      // 5 seconds for queries
    mutation: 10000,  // 10 seconds for mutations
    healthCheck: 3000 // 3 seconds for health checks
  },
  
  // Retry configurations
  retry: {
    maxRetries: 2,
    backoffMultiplier: 1000 // 1 second base delay
  }
};
