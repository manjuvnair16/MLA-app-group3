import pino from 'pino';
import { config } from '../config/index.js';

/**
 * List of sensitive fields that should be redacted from logs
 * This ensures educational-friendly logs without exposing sensitive data
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'secret',
  'authorization',
  'authHeader',
  'jwtPayload',
  'jwt',
  'jwtSecret',
  'jwtSecretKey',
  'jwtSecretKeyHere',
  'JWT_SECRET_KEY',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
];

/**
 * Recursively redact sensitive fields from objects
 * @param {any} obj - Object to redact
 * @param {number} depth - Current recursion depth (prevents infinite loops)
 * @returns {any} - Object with sensitive fields redacted
 */
export function redactSensitiveData(obj, depth = 0) {
  if (depth > 10) return '[Max Depth Reached]'; // Prevent infinite recursion
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }
  
  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));
    
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Create base logger instance with appropriate configuration
 */
function createLogger() {
  const isDevelopment = config.nodeEnv === 'development';
  
  const loggerOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: SENSITIVE_FIELDS,
      remove: true, // Remove instead of just hiding
    },
    serializers: {
      req: (req) => {
        if (!req) return req;
        const sanitized = {
          method: req.method,
          url: req.url,
          headers: redactSensitiveData(req.headers || {}),
          ip: req.ip || req.remoteAddress,
          userAgent: req.get?.('user-agent') || req.headers?.['user-agent'],
        };
        // Remove authorization header completely if present
        if (sanitized.headers?.authorization) {
          sanitized.headers.authorization = '[REDACTED]';
        }
        return sanitized;
      },
      res: (res) => {
        if (!res) return res;
        return {
          statusCode: res.statusCode,
        };
      },
      err: pino.stdSerializers.err,
    },
  };
  
  // In development, use pino-pretty for human-readable logs
  if (isDevelopment) {
    loggerOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    };
  }
  
  return pino(loggerOptions);
}

/**
 * Custom logger with GraphQL-specific methods
 */
export const logger = createLogger();

/**
 * Log GraphQL request details
 * @param {object} params - Request parameters
 * @param {string} params.operation - Operation type (query/mutation/subscription)
 * @param {string} params.operationName - Operation name
 * @param {number} params.duration - Request duration in milliseconds
 * @param {object} params.variables - GraphQL variables (will be sanitized)
 * @param {string} params.query - GraphQL query string
 * @param {boolean} params.hasErrors - Whether the request had errors
 * @param {number} params.complexity - Query complexity score
 */
export function logGraphQLRequest({
  operation,
  operationName,
  duration,
  variables,
  query,
  hasErrors = false,
  complexity,
}) {
  const logData = {
    type: 'graphql_request',
    operation: operation || 'unknown',
    operationName: operationName || 'anonymous',
    durationMs: duration,
    hasErrors,
  };
  
  // Add complexity if available
  if (complexity !== undefined) {
    logData.complexity = complexity;
  }
  
  // Sanitize variables before logging
  if (variables && Object.keys(variables).length > 0) {
    logData.variables = redactSensitiveData(variables);
  }
  
  // Include query (it's safe to log as it doesn't contain values)
  if (query) {
    // Trim long queries for readability
    logData.query = query.length > 500 ? query.substring(0, 500) + '...' : query;
  }
  
  const logLevel = hasErrors ? 'warn' : 'info';
  logger[logLevel](logData, 'GraphQL request completed');
}

/**
 * Log GraphQL error details
 * @param {object} params - Error parameters
 * @param {Error} params.error - Error object
 * @param {string} params.operation - Operation type
 * @param {string} params.operationName - Operation name
 * @param {object} params.context - Additional context
 */
export function logGraphQLError({ error, operation, operationName, context = {} }) {
  const logData = {
    type: 'graphql_error',
    operation: operation || 'unknown',
    operationName: operationName || 'anonymous',
    error: {
      message: error.message,
      name: error.name,
      code: error.extensions?.code || error.code,
    },
  };
  
  // Add sanitized context
  if (context && Object.keys(context).length > 0) {
    logData.context = redactSensitiveData(context);
  }
  
  // Include path if available (useful for debugging)
  if (error.path) {
    logData.error.path = error.path;
  }
  
  // Include locations if available
  if (error.locations) {
    logData.error.locations = error.locations;
  }
  
  logger.error(logData, 'GraphQL error occurred');
}

/**
 * Log server startup information
 * @param {object} info - Server information
 */
export function logServerStart(info) {
  logger.info({
    type: 'server_start',
    ...info,
  }, 'GraphQL Gateway started');
}

/**
 * Log server shutdown information
 */
export function logServerShutdown() {
  logger.info({ type: 'server_shutdown' }, 'GraphQL Gateway shutting down');
}

export default logger;

