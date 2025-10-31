#!/usr/bin/env node

import axios from 'axios';

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
  console.log(`\n🔒 Testing ${description}...`);
  console.log(`   Endpoint: ${endpoint}`);
  
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
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers found: ${Object.keys(lowerCaseHeaders).length}`);
    
    // Test required headers
    let allPassed = true;
    console.log('\n   ✅ Checking required security headers:');
    
    for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
      const headerValue = lowerCaseHeaders[headerName];
      
      if (headerValue) {
        if (expectedValue instanceof RegExp) {
          if (expectedValue.test(headerValue)) {
            console.log(`      ✓ ${headerName}: ${headerValue.substring(0, 80)}...`);
          } else {
            console.log(`      ✗ ${headerName}: Value doesn't match pattern`);
            console.log(`        Expected pattern: ${expectedValue}`);
            console.log(`        Actual value: ${headerValue}`);
            allPassed = false;
          }
        } else {
          if (headerValue.toLowerCase() === expectedValue.toLowerCase()) {
            console.log(`      ✓ ${headerName}: ${headerValue}`);
          } else {
            console.log(`      ✗ ${headerName}: Expected "${expectedValue}", got "${headerValue}"`);
            allPassed = false;
          }
        }
      } else {
        console.log(`      ✗ ${headerName}: Missing`);
        allPassed = false;
      }
    }
    
    // Check that CSP is NOT present (disabled for Apollo Sandbox)
    if (lowerCaseHeaders['content-security-policy']) {
      console.log(`      ⚠️  content-security-policy: Present (but should be disabled for Apollo Sandbox)`);
      console.log(`         Value: ${lowerCaseHeaders['content-security-policy'].substring(0, 80)}...`);
      // Don't fail the test for this, just warn
    } else {
      console.log(`      ℹ️  content-security-policy: Correctly absent (disabled for Apollo Sandbox compatibility)`);
    }
    
    // Test forbidden headers
    console.log('\n   🚫 Checking forbidden headers:');
    let forbiddenFound = false;
    
    for (const headerName of forbiddenHeaders) {
      if (lowerCaseHeaders[headerName]) {
        console.log(`      ✗ ${headerName}: Should not be present, but found "${lowerCaseHeaders[headerName]}"`);
        forbiddenFound = true;
        allPassed = false;
      } else {
        console.log(`      ✓ ${headerName}: Correctly absent`);
      }
    }
    
    // Display all security-related headers found
    console.log('\n   📋 All security-related headers found:');
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
        console.log(`      • ${header}: ${truncatedValue}`);
      });
    } else {
      console.log('      (No additional security headers found)');
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
      
      console.log(`   ⚠️  Received error status ${error.response.status}, but checking headers...`);
      
      // Check if security headers are still present even on error
      const hasSecurityHeaders = requiredHeaders['x-frame-options'] && 
                                 lowerCaseHeaders['x-frame-options'];
      
      if (hasSecurityHeaders) {
        console.log(`   ℹ️  Security headers are present even on error response (good!)`);
        return true; // Headers present even on error
      } else {
        console.log(`   ✗ Security headers missing on error response`);
        return false;
      }
    } else {
      console.log(`   ❌ Connection error: ${error.message}`);
      console.log(`   ℹ️  Make sure the server is running on ${SERVER_URL}`);
      return false;
    }
  }
}

async function runSecurityHeadersTests() {
  console.log('🛡️  Testing Security Headers Implementation');
  console.log('=' .repeat(60));
  console.log('\nThis test verifies that the following security headers are properly set:');
  console.log('  • X-Content-Type-Options: nosniff (prevents MIME type sniffing)');
  console.log('  • X-Frame-Options: SAMEORIGIN (allows same-origin frames for Apollo Sandbox)');
  console.log('  • X-XSS-Protection: 1; mode=block (XSS protection)');
  console.log('  • Content-Security-Policy: DISABLED (disabled for Apollo Sandbox compatibility)');
  console.log('  • Strict-Transport-Security (HSTS)');
  console.log('  • X-Powered-By should NOT be present (hidden)');
  
  const results = {
    graphql: false,
    health: false
  };
  
  // Test GraphQL endpoint
  results.graphql = await testSecurityHeaders(GRAPHQL_ENDPOINT, 'GraphQL Endpoint');
  
  // Test health endpoint
  results.health = await testSecurityHeaders(HEALTH_ENDPOINT, 'Health Check Endpoint');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   GraphQL Endpoint: ${results.graphql ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = results.graphql && results.health;
  
  if (allPassed) {
    console.log('\n✅ All security headers tests passed!');
    console.log('🛡️  Your application is protected with proper security headers.');
  } else {
    console.log('\n❌ Some security header tests failed.');
    console.log('⚠️  Please review the configuration and ensure all headers are properly set.');
  }
  
  return allPassed;
}

// Run the tests
runSecurityHeadersTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution error:', error);
  process.exit(1);
});

