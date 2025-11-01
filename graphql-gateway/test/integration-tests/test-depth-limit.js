#!/usr/bin/env node

import axios from 'axios';
import { logger } from '../../src/utils/logger.js';

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

// Test queries with different depths
const testQueries = {
  // Valid query - depth 2
  valid: {
    query: `
      query {
        exercises {
          id
          username
        }
      }
    `
  },
  
  // Deep query - depth 7 (should be blocked)
  tooDeep: {
    query: `
      query {
        exercises {
          id {
            toString {
              length {
                valueOf {
                  toString {
                    length
                  }
                }
              }
            }
          }
        }
      }
    `
  },
  
  // Educational query - depth 3 (should work)
  educational: {
    query: `
      query {
        analytics {
          allStats {
            username
          }
        }
      }
    `
  }
};

async function testDepthLimit() {
  logger.info({ type: 'test', testName: 'test-depth-limit' }, 'Testing GraphQL Depth Limiting...');
  logger.info({ type: 'test', maxDepth: 6 }, 'Max depth: 6 levels');
  logger.info({ type: 'test' }, 'Testing with different query depths...\n');

  try {
    // Test valid query (depth 2)
    logger.info({ type: 'test', step: 1 }, '1. Testing valid query (depth 2)...');
    try {
      const response = await axios.post(GRAPHQL_ENDPOINT, testQueries.valid, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      logger.info({ type: 'test', status: response.status }, `Valid query: Status ${response.status}`);
      logger.info({ type: 'test', response: JSON.stringify(response.data).substring(0, 100) }, `   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      logger.error({ type: 'test', error: error.response?.status || error.code }, `Valid query failed: ${error.response?.status || error.code}`);
    }

    logger.info({ type: 'test', step: 2 }, '\n2. Testing educational query (depth 3)...');
    try {
      const response = await axios.post(GRAPHQL_ENDPOINT, testQueries.educational, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      logger.info({ type: 'test', status: response.status }, `Educational query: Status ${response.status}`);
      logger.info({ type: 'test', response: JSON.stringify(response.data).substring(0, 100) }, `   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      logger.error({ type: 'test', error: error.response?.status || error.code }, `Educational query failed: ${error.response?.status || error.code}`);
    }

    logger.info({ type: 'test', step: 3 }, '\n3. Testing too deep query (depth 7)...');
    try {
      const response = await axios.post(GRAPHQL_ENDPOINT, testQueries.tooDeep, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      logger.warn({ type: 'test', status: response.status }, `Deep query should have been blocked but got: Status ${response.status}`);
    } catch (error) {
      if (error.response?.status === 400) {
        logger.info({ type: 'test', status: error.response.status }, `Deep query blocked: Status ${error.response.status}`);
        logger.info({ type: 'test', error: error.response.data.errors?.[0]?.message || 'Depth limit exceeded' }, `   Error: ${error.response.data.errors?.[0]?.message || 'Depth limit exceeded'}`);
      } else {
        logger.error({ type: 'test', error: error.response?.status || error.code }, `Unexpected error: ${error.response?.status || error.code}`);
      }
    }
    
    logger.info({ type: 'test', completed: true }, '\nDepth limiting test completed!');
    logger.info({ type: 'test' }, 'Note: Educational queries should work, but recursive/deep queries should be blocked.');
    
  } catch (error) {
    logger.error({ type: 'test', error: error.message }, 'Test failed:', error.message);
  }
}

// Run the test
testDepthLimit();
