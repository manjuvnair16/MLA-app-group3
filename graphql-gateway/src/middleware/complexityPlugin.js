import { createComplexityRule, simpleEstimator } from 'graphql-query-complexity';
import { validate } from 'graphql';
import { logger } from '../utils/logger.js';

/**
 * Create Apollo Server plugin for query complexity limiting
 * @param {number} maxComplexity - Maximum allowed query complexity (default: 1500)
 * @returns {object} Apollo Server plugin
 */
export function createComplexityPlugin(maxComplexity = 1500) {
  let requestSchema = null;

  return {
    async requestDidStart(requestContext) {
      requestSchema = requestContext.schema;
      
      return {
        async didResolveOperation(requestContext) {
          const { document, operationName } = requestContext.request;
          const schema = requestContext.schema || requestSchema;
          
          if (!document || !schema) {
            return;
          }

          // Create complexity validation rule with schema
          // graphql-query-complexity v1.1.0 requires schema to be passed during rule creation
          try {
            let calculatedComplexity = null;
            
            const complexityRule = createComplexityRule({
              schema,
              maximumComplexity: maxComplexity,
              estimators: [
                simpleEstimator({ defaultComplexity: 1 })
              ],
              onComplete: (complexity) => {
                // Store complexity in request context for logging/metrics
                calculatedComplexity = complexity;
                requestContext.request.complexity = complexity;
                
                // Log complexity for monitoring and debugging
                const opName = operationName || 'anonymous';
                logger.debug({
                  type: 'query_complexity',
                  operationName: opName,
                  complexity,
                  maxComplexity,
                }, `Query complexity: ${opName}, Cost: ${complexity} points (limit: ${maxComplexity})`);
              }
            });

            // Use GraphQL's validate function which properly executes validation rules
            // This ensures the complexity rule's onComplete callback is triggered
            const errors = validate(schema, document, [complexityRule]);

            // Ensure complexity is stored from the callback
            // If callback was called, calculatedComplexity and requestContext.request.complexity should be set
            if (calculatedComplexity !== null) {
              requestContext.request.complexity = calculatedComplexity;
            }

            if (errors && errors.length > 0) {
              const complexity = requestContext.request.complexity || calculatedComplexity || 'unknown';
              const errorMessage = `Query complexity of ${complexity} exceeds the maximum allowed complexity of ${maxComplexity}`;
              throw new Error(errorMessage);
            }
            
            // Ensure complexity is always available even if callback pattern differs
            // Some test environments might not trigger the callback synchronously
            if (requestContext.request.complexity === undefined && calculatedComplexity !== null) {
              requestContext.request.complexity = calculatedComplexity;
            }
          } catch (error) {
            // Re-throw with more context if it's a complexity error
            if (error.message && (error.message.includes('complexity') || error.message.includes('Complexity'))) {
              throw error;
            }
            // Wrap other errors
            throw new Error(`Query complexity validation failed: ${error.message}`);
          }
        },
        async willSendResponse(requestContext) {
          // Access complexity from request context if available
          const complexity = requestContext.request.complexity;
          
          if (complexity !== undefined) {
            // Add complexity to response extensions for debugging
            if (!requestContext.response.extensions) {
              requestContext.response.extensions = {};
            }
            requestContext.response.extensions.complexity = complexity;
            requestContext.response.extensions.complexityLimit = maxComplexity;
          }
        }
      };
    }
  };
}

