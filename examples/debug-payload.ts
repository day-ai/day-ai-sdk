#!/usr/bin/env node

import { DayAIClient } from '../src/client';

async function main() {
  console.log('🔍 Day AI SDK - Debug Search Payload\n');

  try {
    const client = new DayAIClient();

    // Test connection
    console.log('1. Testing connection...');
    const connectionTest = await client.testConnection();
    
    if (!connectionTest.success) {
      console.error('❌ Connection failed:', connectionTest.error);
      process.exit(1);
    }
    console.log('✅ Connected\n');

    // Initialize MCP
    await client.mcpInitialize();

    // Calculate timestamp for 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const timestampFilter = Math.floor(sevenDaysAgo.getTime() / 1000);

    console.log('2. Search parameters:');
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Search from: ${sevenDaysAgo.toISOString()}`);
    console.log(`   Unix timestamp: ${timestampFilter}\n`);

    // Show the exact payload we're sending
    const searchPayload = {
      queries: [{
        objectType: 'native_meetingrecording'
      }],
      timeframeStart: sevenDaysAgo.toISOString(),
      timeframeEnd: now.toISOString(),
      limit: 10
    };

    console.log('3. Exact search payload:');
    console.log(JSON.stringify(searchPayload, null, 2));
    console.log();

    // Try the search
    console.log('4. Executing search...');
    const searchResult = await client.mcpCallTool('search_objects', searchPayload);
    
    if (!searchResult.success) {
      console.error('❌ Search failed:', searchResult.error);
    } else if (searchResult.data?.isError) {
      console.error('❌ Tool error:', searchResult.data?.content[0]?.text);
    } else {
      const content = searchResult.data?.content[0]?.text;
      console.log('✅ Search successful');
      console.log('Raw response:', content);
      
      if (content) {
        try {
          const parsed = JSON.parse(content);
          console.log(`Found ${parsed.objects?.length || 0} objects`);
        } catch (e) {
          console.log('Could not parse response as JSON');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}