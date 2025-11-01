import { logger, logGraphQLRequest, logGraphQLError } from '../utils/logger.js';

/**
 * Create Apollo Server plugin for structured GraphQL logging
 * @param {object} options - Plugin options
 * @param {boolean} options.logQueries - Whether to log query strings (default: true)
 * @param {boolean} options.logVariables - Whether to log variables (default: true, but sanitized)
 * @param {number} options.slowQueryThreshold - Threshold in ms for slow query warnings (default: 1000)
 * @returns {object} Apollo Server plugin
 */
export function createLoggingPlugin(options = {}) {
  const {
    logQueries = true,
    logVariables = true,
    slowQueryThreshold = 1000,
  } = options;

  return {
    async requestDidStart(requestContext) {
      const startTime = Date.now();
      const requestId = requestContext.request.http?.headers?.get?.('x-request-id') || 
                       `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Log request start
      logger.debug({
        type: 'graphql_request_start',
        requestId,
        operation: requestContext.request.operationName || 'anonymous',
        operationType: requestContext.request.operation?.operation || 'unknown',
      }, 'GraphQL request started');

      return {
        /**
         * Log when the operation is resolved
         */
        async didResolveOperation(requestContext) {
          const { operation, operationName, query } = requestContext.request;
          const operationType = operation?.operation || 'unknown';
          
          logger.debug({
            type: 'graphql_operation_resolved',
            requestId,
            operation: operationType,
            operationName: operationName || 'anonymous',
          }, 'GraphQL operation resolved');
        },

        /**
         * Log parsing errors
         */
        async didEncounterErrors(requestContext) {
          const { errors, request } = requestContext;
          const { operation, operationName } = request;
          const operationType = operation?.operation || 'unknown';
          
          // Log each error
          errors.forEach((error) => {
            logGraphQLError({
              error,
              operation: operationType,
              operationName: operationName || 'anonymous',
              context: {
                requestId,
                extensions: error.extensions,
              },
            });
          });
        },

        /**
         * Log when response is about to be sent
         */
        async willSendResponse(requestContext) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const { request, response } = requestContext;
          const { operation, operationName, variables, query } = request;
          const operationType = operation?.operation || 'unknown';
          
          const hasErrors = response.errors && response.errors.length > 0;
          const complexity = request.complexity;
          
          // Prepare log data
          const logData = {
            operation: operationType,
            operationName: operationName || 'anonymous',
            duration,
            hasErrors,
            complexity,
          };
          
          // Conditionally include query and variables based on options
          if (logQueries && query) {
            logData.query = query;
          }
          
          if (logVariables && variables && Object.keys(variables).length > 0) {
            logData.variables = variables;
          }
          
          // Log the request
          logGraphQLRequest(logData);
          
          // Log slow query warning if threshold exceeded
          if (duration > slowQueryThreshold) {
            logger.warn({
              type: 'slow_query',
              requestId,
              operation: operationType,
              operationName: operationName || 'anonymous',
              durationMs: duration,
              thresholdMs: slowQueryThreshold,
            }, `Slow GraphQL query detected (${duration}ms > ${slowQueryThreshold}ms threshold)`);
          }
          
          // Log errors if present
          if (hasErrors) {
            const errorSummary = {
              totalErrors: response.errors.length,
              errorTypes: {},
            };
            
            response.errors.forEach((error) => {
              const errorType = error.extensions?.code || error.name || 'Unknown';
              errorSummary.errorTypes[errorType] = (errorSummary.errorTypes[errorType] || 0) + 1;
            });
            
            logger.warn({
              type: 'graphql_response_errors',
              requestId,
              operation: operationType,
              operationName: operationName || 'anonymous',
              ...errorSummary,
            }, `GraphQL response contains ${response.errors.length} error(s)`);
          }
        },
      };
    },
  };
}

