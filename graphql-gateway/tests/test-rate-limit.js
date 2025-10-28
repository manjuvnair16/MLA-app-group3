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

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting...');
  console.log('📊 Limit: 200 requests per 15 minutes');
  console.log('⏱️  Testing with 5 rapid requests...\n');

  try {
    // Send 5 rapid requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.post(GRAPHQL_ENDPOINT, testQuery, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }).then(response => {
          console.log(`✅ Request ${i + 1}: Status ${response.status}`);
          if (response.headers['ratelimit-remaining']) {
            console.log(`   Rate limit remaining: ${response.headers['ratelimit-remaining']}`);
          }
        }).catch(error => {
          if (error.response?.status === 429) {
            console.log(`🚫 Request ${i + 1}: Rate limit exceeded (429)`);
            console.log(`   Message: ${error.response.data.message}`);
          } else {
            console.log(`❌ Request ${i + 1}: Error ${error.response?.status || error.code}`);
          }
        })
      );
    }

    await Promise.all(promises);
    
    console.log('\n✅ Rate limiting test completed!');
    console.log('📝 Note: With only 5 requests, you should not hit the limit.');
    console.log('🔍 To test the actual limit, you would need to send 200+ requests rapidly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRateLimit();
