#!/usr/bin/env node

import axios from 'axios';

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
        exercises {
          id
          username
          exerciseType {
            name
          }
        }
      }
    `
  }
};

async function testDepthLimit() {
  console.log('🧪 Testing GraphQL Depth Limiting...');
  console.log('📊 Max depth: 6 levels');
  console.log('⏱️  Testing with different query depths...\n');

  try {
    // Test valid query (depth 2)
    console.log('1️⃣ Testing valid query (depth 2)...');
    try {
      const response = await axios.post(GRAPHQL_ENDPOINT, testQueries.valid, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      console.log(`✅ Valid query: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ Valid query failed: ${error.response?.status || error.code}`);
    }

    console.log('\n2️⃣ Testing educational query (depth 3)...');
    try {
      const response = await axios.post(GRAPHQL_ENDPOINT, testQueries.educational, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      console.log(`✅ Educational query: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ Educational query failed: ${error.response?.status || error.code}`);
    }

    console.log('\n3️⃣ Testing too deep query (depth 7)...');
    try {
      const response = await axios.post(GRAPHQL_ENDPOINT, testQueries.tooDeep, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      console.log(`❌ Deep query should have been blocked but got: Status ${response.status}`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`✅ Deep query blocked: Status ${error.response.status}`);
        console.log(`   Error: ${error.response.data.errors?.[0]?.message || 'Depth limit exceeded'}`);
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status || error.code}`);
      }
    }
    
    console.log('\n✅ Depth limiting test completed!');
    console.log('📝 Note: Educational queries should work, but recursive/deep queries should be blocked.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDepthLimit();
