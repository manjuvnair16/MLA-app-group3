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

async function testRateLimitAggressive() {
  logger.info({ type: 'test', testName: 'test-rate-limit-aggressive' }, 'Testing Rate Limiting Aggressively...');
  logger.info({ type: 'test', limit: 200, window: '15 minutes' }, 'Limit: 200 requests per 15 minutes');
  logger.info({ type: 'test', requestCount: 210 }, 'Sending 210 rapid requests to trigger rate limiting...\n');

  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0
  };

  try {
    // Send 210 rapid requests (more than the 200 limit)
    const promises = [];
    for (let i = 0; i < 210; i++) {
      promises.push(
        axios.post(GRAPHQL_ENDPOINT, testQuery, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }).then(response => {
          results.success++;
          if (i < 10 || i % 20 === 0) { // Log first 10 and every 20th
            logger.info({ type: 'test', requestNumber: i + 1, status: response.status }, `Request ${i + 1}: Status ${response.status}`);
            if (response.headers['ratelimit-remaining']) {
              logger.info({ type: 'test', requestNumber: i + 1, remaining: response.headers['ratelimit-remaining'] }, `   Rate limit remaining: ${response.headers['ratelimit-remaining']}`);
            }
          }
        }).catch(error => {
          if (error.response?.status === 429) {
            results.rateLimited++;
            if (results.rateLimited <= 5) { // Log first 5 rate limited responses
              logger.info({ type: 'test', requestNumber: i + 1, status: 429 }, `Request ${i + 1}: Rate limit exceeded (429)`);
              logger.info({ type: 'test', requestNumber: i + 1, message: error.response.data.message }, `   Message: ${error.response.data.message}`);
              logger.info({ type: 'test', requestNumber: i + 1, retryAfter: error.response.data.retryAfter }, `   Retry after: ${error.response.data.retryAfter}`);
            }
          } else {
            results.errors++;
            if (results.errors <= 3) { // Log first 3 other errors
              logger.error({ type: 'test', requestNumber: i + 1, error: error.response?.status || error.code }, `Request ${i + 1}: Error ${error.response?.status || error.code}`);
            }
          }
        })
      );
    }

    logger.info({ type: 'test' }, 'Sending requests...');
    await Promise.all(promises);
    
    logger.info({ type: 'test' }, '\nTest Results:');
    logger.info({ type: 'test', results }, `   Successful requests: ${results.success}`);
    logger.info({ type: 'test', results }, `   Rate limited requests (429): ${results.rateLimited}`);
    logger.info({ type: 'test', results }, `   Other errors: ${results.errors}`);
    
    if (results.rateLimited > 0) {
      logger.info({ type: 'test', rateLimited: results.rateLimited }, '\nRate limiting is working correctly!');
      logger.info({ type: 'test', rateLimited: results.rateLimited }, `   The system blocked ${results.rateLimited} requests after the limit was exceeded.`);
    } else {
      logger.warn({ type: 'test' }, '\nNo rate limiting detected.');
      logger.warn({ type: 'test' }, '   This could mean:');
      logger.warn({ type: 'test' }, '   - The rate limit window has reset');
      logger.warn({ type: 'test' }, '   - Requests were made from different IPs');
      logger.warn({ type: 'test' }, '   - The rate limiting configuration needs adjustment');
    }
    
  } catch (error) {
    logger.error({ type: 'test', error: error.message }, 'Test failed:', error.message);
  }
}

// Run the test
testRateLimitAggressive();
