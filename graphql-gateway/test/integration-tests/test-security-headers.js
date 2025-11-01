#!/usr/bin/env node

import axios from 'axios';
import { logger } from '../../src/utils/logger.js';

const SERVER_URL = 'http://localhost:4000';
const GRAPHQL_ENDPOINT = `${SERVER_URL}/graphql`;
const HEALTH_ENDPOINT = `${SERVER_URL}/health`;

// Security headers to verify
// Note: CSP is disabled for Apollo Sandbox compatibility
// Frameguard changed from DENY to SAMEORIGIN for Apollo Sandbox
const requiredHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN', // Changed from DENY to allow Apollo Sandbox
  'x-xss-protection': '1; mode=block',
  // 'content-security-policy' is disabled for Apollo Sandbox compatibility
  'strict-transport-security': /max-age=31536000/,
};

// Expected headers that should NOT be present
const forbiddenHeaders = [
  'x-powered-by'
];

async function testSecurityHeaders(endpoint, description) {
  logger.info({ type: 'test', testName: 'test-security-headers', endpoint, description }, `\nTesting ${description}...`);
  logger.info({ type: 'test', endpoint }, `   Endpoint: ${endpoint}`);
  
  try {
    let response;
    
    if (endpoint === GRAPHQL_ENDPOINT) {
      // For GraphQL endpoint, send a POST request
      response = await axios.post(endpoint, {
        query: `query { _empty }`
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status code
      });
    } else {
      // For other endpoints, send a GET request
      response = await axios.get(endpoint, {
        timeout: 5000,
        validateStatus: () => true
      });
    }
    
    const headers = response.headers;
    const lowerCaseHeaders = {};
    
    // Convert headers to lowercase for case-insensitive comparison
    Object.keys(headers).forEach(key => {
      lowerCaseHeaders[key.toLowerCase()] = headers[key];
    });
    
    logger.info({ type: 'test', status: response.status }, `   Status: ${response.status}`);
    logger.info({ type: 'test', headerCount: Object.keys(lowerCaseHeaders).length }, `   Headers found: ${Object.keys(lowerCaseHeaders).length}`);
    
    // Test required headers
    let allPassed = true;
    logger.info({ type: 'test' }, '\n   Checking required security headers:');
    
    for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
      const headerValue = lowerCaseHeaders[headerName];
      
      if (headerValue) {
        if (expectedValue instanceof RegExp) {
          if (expectedValue.test(headerValue)) {
            logger.info({ type: 'test', headerName, headerValue: headerValue.substring(0, 80) }, `      PASS ${headerName}: ${headerValue.substring(0, 80)}...`);
          } else {
            logger.info({ type: 'test', headerName, expectedValue, actualValue: headerValue }, `      FAIL ${headerName}: Value doesn't match pattern`);
            logger.info({ type: 'test', headerName, expectedValue }, `        Expected pattern: ${expectedValue}`);
            logger.info({ type: 'test', headerName, actualValue: headerValue }, `        Actual value: ${headerValue}`);
            allPassed = false;
          }
        } else {
          if (headerValue.toLowerCase() === expectedValue.toLowerCase()) {
            logger.info({ type: 'test', headerName, headerValue }, `      PASS ${headerName}: ${headerValue}`);
          } else {
            logger.info({ type: 'test', headerName, expectedValue, actualValue: headerValue }, `      FAIL ${headerName}: Expected "${expectedValue}", got "${headerValue}"`);
            allPassed = false;
          }
        }
      } else {
        logger.info({ type: 'test', headerName, missing: true }, `      FAIL ${headerName}: Missing`);
        allPassed = false;
      }
    }
    
    // Check that CSP is NOT present (disabled for Apollo Sandbox)
    if (lowerCaseHeaders['content-security-policy']) {
      logger.warn({ type: 'test', headerName: 'content-security-policy' }, `      WARN content-security-policy: Present (but should be disabled for Apollo Sandbox)`);
      logger.warn({ type: 'test', headerValue: lowerCaseHeaders['content-security-policy'].substring(0, 80) }, `         Value: ${lowerCaseHeaders['content-security-policy'].substring(0, 80)}...`);
      // Don't fail the test for this, just warn
    } else {
      logger.info({ type: 'test' }, `      INFO content-security-policy: Correctly absent (disabled for Apollo Sandbox compatibility)`);
    }
    
    // Test forbidden headers
    logger.info({ type: 'test' }, '\n   Checking forbidden headers:');
    let forbiddenFound = false;
    
    for (const headerName of forbiddenHeaders) {
      if (lowerCaseHeaders[headerName]) {
        logger.info({ type: 'test', headerName, found: true, value: lowerCaseHeaders[headerName] }, `      FAIL ${headerName}: Should not be present, but found "${lowerCaseHeaders[headerName]}"`);
        forbiddenFound = true;
        allPassed = false;
      } else {
        logger.info({ type: 'test', headerName, found: false }, `      PASS ${headerName}: Correctly absent`);
      }
    }
    
    // Display all security-related headers found
    logger.info({ type: 'test' }, '\n   All security-related headers found:');
    const securityHeaders = Object.keys(lowerCaseHeaders).filter(h => 
      h.includes('x-') || 
      h.includes('content-security') || 
      h.includes('strict-transport') ||
      h.includes('cross-origin') ||
      h.includes('referrer')
    );
    
    if (securityHeaders.length > 0) {
      securityHeaders.forEach(header => {
        const value = lowerCaseHeaders[header];
        const truncatedValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
        logger.info({ type: 'test', header, value: truncatedValue }, `      - ${header}: ${truncatedValue}`);
      });
    } else {
      logger.info({ type: 'test' }, '      (No additional security headers found)');
    }
    
    return allPassed && !forbiddenFound;
    
  } catch (error) {
    if (error.response) {
      // Server responded but might have security headers even on error
      const headers = error.response.headers;
      const lowerCaseHeaders = {};
      
      Object.keys(headers).forEach(key => {
        lowerCaseHeaders[key.toLowerCase()] = headers[key];
      });
      
      logger.warn({ type: 'test', status: error.response.status }, `   WARN Received error status ${error.response.status}, but checking headers...`);
      
      // Check if security headers are still present even on error
      const hasSecurityHeaders = requiredHeaders['x-frame-options'] && 
                                 lowerCaseHeaders['x-frame-options'];
      
      if (hasSecurityHeaders) {
        logger.info({ type: 'test' }, `   INFO Security headers are present even on error response (good!)`);
        return true; // Headers present even on error
      } else {
        logger.error({ type: 'test', missing: true }, `   FAIL Security headers missing on error response`);
        return false;
      }
    } else {
      logger.error({ type: 'test', error: error.message, serverUrl: SERVER_URL }, `   ERROR Connection error: ${error.message}`);
      logger.info({ type: 'test', serverUrl: SERVER_URL }, `   INFO Make sure the server is running on ${SERVER_URL}`);
      return false;
    }
  }
}

async function runSecurityHeadersTests() {
  logger.info({ type: 'test', testName: 'test-security-headers' }, 'Testing Security Headers Implementation');
  logger.info({ type: 'test' }, '=' .repeat(60));
  logger.info({ type: 'test' }, '\nThis test verifies that the following security headers are properly set:');
  logger.info({ type: 'test' }, '  - X-Content-Type-Options: nosniff (prevents MIME type sniffing)');
  logger.info({ type: 'test' }, '  - X-Frame-Options: SAMEORIGIN (allows same-origin frames for Apollo Sandbox)');
  logger.info({ type: 'test' }, '  - X-XSS-Protection: 1; mode=block (XSS protection)');
  logger.info({ type: 'test' }, '  - Content-Security-Policy: DISABLED (disabled for Apollo Sandbox compatibility)');
  logger.info({ type: 'test' }, '  - Strict-Transport-Security (HSTS)');
  logger.info({ type: 'test' }, '  - X-Powered-By should NOT be present (hidden)');
  
  const results = {
    graphql: false,
    health: false
  };
  
  // Test GraphQL endpoint
  results.graphql = await testSecurityHeaders(GRAPHQL_ENDPOINT, 'GraphQL Endpoint');
  
  // Test health endpoint
  results.health = await testSecurityHeaders(HEALTH_ENDPOINT, 'Health Check Endpoint');
  
  // Summary
  logger.info({ type: 'test' }, '\n' + '='.repeat(60));
  logger.info({ type: 'test' }, 'Test Summary:');
  logger.info({ type: 'test', endpoint: 'graphql', passed: results.graphql }, `   GraphQL Endpoint: ${results.graphql ? 'PASS' : 'FAIL'}`);
  logger.info({ type: 'test', endpoint: 'health', passed: results.health }, `   Health Endpoint: ${results.health ? 'PASS' : 'FAIL'}`);
  
  const allPassed = results.graphql && results.health;
  
  if (allPassed) {
    logger.info({ type: 'test', allPassed: true }, '\nAll security headers tests passed!');
    logger.info({ type: 'test' }, 'Your application is protected with proper security headers.');
  } else {
    logger.info({ type: 'test', allPassed: false }, '\nSome security header tests failed.');
    logger.warn({ type: 'test' }, 'WARN Please review the configuration and ensure all headers are properly set.');
  }
  
  return allPassed;
}

// Run the tests
runSecurityHeadersTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  logger.error({ type: 'test', error: error.message }, 'Test execution error:', error);
  process.exit(1);
});

