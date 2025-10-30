#!/usr/bin/env node

import axios from 'axios';

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
  console.log('🚀 Testing Rate Limiting Aggressively...');
  console.log('📊 Limit: 200 requests per 15 minutes');
  console.log('⚡ Sending 210 rapid requests to trigger rate limiting...\n');

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
            console.log(`✅ Request ${i + 1}: Status ${response.status}`);
            if (response.headers['ratelimit-remaining']) {
              console.log(`   Rate limit remaining: ${response.headers['ratelimit-remaining']}`);
            }
          }
        }).catch(error => {
          if (error.response?.status === 429) {
            results.rateLimited++;
            if (results.rateLimited <= 5) { // Log first 5 rate limited responses
              console.log(`🚫 Request ${i + 1}: Rate limit exceeded (429)`);
              console.log(`   Message: ${error.response.data.message}`);
              console.log(`   Retry after: ${error.response.data.retryAfter}`);
            }
          } else {
            results.errors++;
            if (results.errors <= 3) { // Log first 3 other errors
              console.log(`❌ Request ${i + 1}: Error ${error.response?.status || error.code}`);
            }
          }
        })
      );
    }

    console.log('⏳ Sending requests...');
    await Promise.all(promises);
    
    console.log('\n📈 Test Results:');
    console.log(`   ✅ Successful requests: ${results.success}`);
    console.log(`   🚫 Rate limited requests (429): ${results.rateLimited}`);
    console.log(`   ❌ Other errors: ${results.errors}`);
    
    if (results.rateLimited > 0) {
      console.log('\n🎯 Rate limiting is working correctly!');
      console.log(`   The system blocked ${results.rateLimited} requests after the limit was exceeded.`);
    } else {
      console.log('\n⚠️  No rate limiting detected.');
      console.log('   This could mean:');
      console.log('   - The rate limit window has reset');
      console.log('   - Requests were made from different IPs');
      console.log('   - The rate limiting configuration needs adjustment');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRateLimitAggressive();
