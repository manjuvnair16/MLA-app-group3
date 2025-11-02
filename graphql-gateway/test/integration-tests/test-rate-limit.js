#!/usr/bin/env node

import axios from 'axios';
import { logger } from '../../src/utils/logger.js';

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

// Test query
const testQuery = {
  query: `
    query {
      _empty
    }
  `
};

async function testRateLimit() {
  logger.info({ type: 'test', testName: 'test-rate-limit' }, 'Testing Rate Limiting...');
  logger.info({ type: 'test', limit: 200, window: '15 minutes' }, 'Limit: 200 requests per 15 minutes');
  logger.info({ type: 'test', requestCount: 5 }, 'Testing with 5 rapid requests...\n');

  try {
    // Send 5 rapid requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.post(GRAPHQL_ENDPOINT, testQuery, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }).then(response => {
          logger.info({ type: 'test', requestNumber: i + 1, status: response.status }, `Request ${i + 1}: Status ${response.status}`);
          if (response.headers['ratelimit-remaining']) {
            logger.info({ type: 'test', requestNumber: i + 1, remaining: response.headers['ratelimit-remaining'] }, `   Rate limit remaining: ${response.headers['ratelimit-remaining']}`);
          }
        }).catch(error => {
          if (error.response?.status === 429) {
            logger.info({ type: 'test', requestNumber: i + 1, status: 429 }, `Request ${i + 1}: Rate limit exceeded (429)`);
            logger.info({ type: 'test', requestNumber: i + 1, message: error.response.data.message }, `   Message: ${error.response.data.message}`);
          } else {
            logger.error({ type: 'test', requestNumber: i + 1, error: error.response?.status || error.code }, `Request ${i + 1}: Error ${error.response?.status || error.code}`);
          }
        })
      );
    }

    await Promise.all(promises);
    
    logger.info({ type: 'test', completed: true }, '\nRate limiting test completed!');
    logger.info({ type: 'test' }, 'Note: With only 5 requests, you should not hit the limit.');
    logger.info({ type: 'test' }, 'To test the actual limit, you would need to send 200+ requests rapidly.');
    
  } catch (error) {
    logger.error({ type: 'test', error: error.message }, 'Test failed:', error.message);
  }
}

// Run the test
testRateLimit();
