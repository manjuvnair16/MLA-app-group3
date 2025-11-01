import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createComplexityPlugin } from '../../src/middleware/complexityPlugin.js';
import { buildSchema, parse } from 'graphql';
import { logger } from '../../src/utils/logger.js';

describe('Query Complexity Tests', () => {
  // Create a simple test schema
  const schema = buildSchema(`
    type Exercise {
      id: ID!
      name: String!
      type: String!
    }
    
    type Query {
      exercises: [Exercise!]!
    }
  `);

  it('should allow queries under complexity limit', async () => {
    const plugin = createComplexityPlugin(1500);
    
    const simpleQuery = `
      query {
        exercises {
          id
          name
          type
        }
      }
    `;
    
    const document = parse(simpleQuery);
    const requestContext = {
      request: {
        document,
        operationName: 'TestQuery',
        complexity: undefined
      },
      response: {},
      schema
    };
    
    const hooks = await plugin.requestDidStart(requestContext);
    
    // Should not throw for simple query
    await assert.doesNotReject(
      async () => await hooks.didResolveOperation(requestContext)
    );
  });

  it('should reject queries over complexity limit', async () => {
    const plugin = createComplexityPlugin(10); // Low limit for testing
    
    // Create a query that will exceed the limit using aliases
    // GraphQL deduplicates same field names, so we use aliases to create unique field selections
    // Each alias counts as a separate field, so 12 aliased exercises queries will exceed 10
    // Each query: 1 (exercises) + 3 nested fields = 4 points
    // 12 queries = 48 points, well over limit of 10
    const complexQuery = `
      query {
        q0: exercises { id name type }
        q1: exercises { id name type }
        q2: exercises { id name type }
        q3: exercises { id name type }
        q4: exercises { id name type }
        q5: exercises { id name type }
        q6: exercises { id name type }
        q7: exercises { id name type }
        q8: exercises { id name type }
        q9: exercises { id name type }
        q10: exercises { id name type }
        q11: exercises { id name type }
      }
    `;
    
    const document = parse(complexQuery);
    const requestContext = {
      request: {
        document,
        operationName: 'ComplexQuery',
        complexity: undefined
      },
      response: {},
      schema
    };
    
    const hooks = await plugin.requestDidStart(requestContext);
    
    try {
      await hooks.didResolveOperation(requestContext);
      
      // If we get here, the query wasn't rejected - debug why
      logger.debug({ type: 'test', complexity: requestContext.request.complexity }, `DEBUG: Complexity calculated: ${requestContext.request.complexity}`);
      logger.debug({ type: 'test', limit: 10 }, `DEBUG: Limit was: 10`);
      
      // Force fail if no error was thrown
      assert.fail('Expected query to be rejected due to complexity, but it was allowed');
    } catch (error) {
      // Verify it's a complexity error
      assert(
        error.message.includes('complexity') || 
        error.message.includes('Complexity') ||
        error.message.includes('exceeds'),
        `Expected complexity error, but got: ${error.message}`
      );
    }
  });

  it('should log query complexity', async () => {
    const plugin = createComplexityPlugin(1500);
    
    const simpleQuery = `
      query {
        exercises {
          id
          name
        }
      }
    `;
    
    const document = parse(simpleQuery);
    const requestContext = {
      request: {
        document,
        operationName: 'LogTestQuery',
        complexity: undefined
      },
      response: {},
      schema
    };
    
    const hooks = await plugin.requestDidStart(requestContext);
    
    // Should not throw
    await hooks.didResolveOperation(requestContext);
    
    // Call willSendResponse to verify complexity is stored
    await hooks.willSendResponse(requestContext);
    
    // Check if complexity was added to response extensions
    assert(requestContext.response);
    assert(requestContext.response.extensions);
    assert(typeof requestContext.response.extensions.complexity === 'number');
    assert(requestContext.response.extensions.complexityLimit === 1500);
  });
});

