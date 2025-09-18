#!/usr/bin/env node

import { DayAIClient } from '../src/client';

async function main() {
  console.log('🎬 Day AI SDK - Recent Meeting Recordings Context Example\n');

  try {
    // Initialize the client (will load from .env automatically)
    const client = new DayAIClient();

    // Test the connection first
    console.log('1. Testing connection...');
    const connectionTest = await client.testConnection();
    
    if (!connectionTest.success) {
      console.error('❌ Connection failed:', connectionTest.error);
      process.exit(1);
    }

    console.log('✅ Connected to Day AI');
    console.log(`   Workspace: ${connectionTest.data.workspace.workspaceName}\n`);

    // Initialize MCP connection
    console.log('2. Initializing MCP connection...');
    const mcpInit = await client.mcpInitialize();
    
    if (!mcpInit.success) {
      console.error('❌ MCP initialization failed:', mcpInit.error);
      process.exit(1);
    }

    console.log('✅ MCP connection initialized\n');

    // Calculate timestamp for 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const timestampFilter = Math.floor(sevenDaysAgo.getTime() / 1000);

    console.log(`3. Searching for meeting recordings from the last 7 days...`);
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Search from: ${sevenDaysAgo.toISOString()}`);
    console.log(`   Timestamp filter: ${timestampFilter}\n`);

    // Search for recent meeting recordings
    const searchPayload = {
      queries: [{
        objectType: 'native_meetingrecording'
      }],
      timeframeStart: sevenDaysAgo.toISOString(),
      timeframeEnd: now.toISOString(),
      limit: 10
    };

    console.log('3. Searching with time filter...');
    
    const searchResult = await client.mcpCallTool('search_objects', searchPayload);
    
    if (!searchResult.success) {
      console.error('❌ Search failed:', searchResult.error);
      process.exit(1);
    }

    if (searchResult.data?.isError) {
      console.error('❌ Search returned an error:');
      console.error(searchResult.data?.content[0]?.text);
      process.exit(1);
    }

    console.log('✅ Search completed!');
    
    // Parse the search results
    let meetingRecordings;
    try {
      const searchContent = searchResult.data?.content[0]?.text;
      if (!searchContent) {
        console.log('⚠️  No search content returned');
        process.exit(1);
      }
      
      const parsedResponse = JSON.parse(searchContent);
      meetingRecordings = parsedResponse.native_meetingrecording?.results || [];
      
      console.log(`✅ Found ${meetingRecordings.length} meeting recordings\n`);
      
      if (meetingRecordings.length === 0) {
        console.log('ℹ️  No meeting recordings found in the last 7 days');
        process.exit(0);
      }

      // Show the first few results
      console.log('📋 Recent meeting recordings:');
      meetingRecordings.slice(0, 3).forEach((recording: any, index: number) => {
        console.log(`   ${index + 1}. ${recording.objectId}`);
        console.log(`      Title: ${recording.title || 'Untitled'}`);
        console.log(`      Updated: ${recording.updatedAt || 'Unknown'}`);
        console.log(`      Description: ${recording.description || 'No description'}`);
      });
      console.log();

    } catch (parseError) {
      console.error('❌ Failed to parse search results:', parseError);
      console.log('Raw search content:', searchResult.data?.content[0]?.text);
      process.exit(1);
    }

    // Get the first recording's objectId
    const firstRecording = meetingRecordings[0];
    const recordingId = firstRecording.objectId;

    console.log(`4. Getting context for meeting recording: ${recordingId}...`);
    console.log(`   Title: ${firstRecording.title || 'Untitled'}\n`);

    // Get meeting recording context
    const contextResult = await client.mcpCallTool('get_meeting_recording_context', {
      meetingRecordingId: recordingId
    });
    
    if (!contextResult.success) {
      console.error('❌ Failed to get meeting context:', contextResult.error);
      process.exit(1);
    }

    if (contextResult.data?.isError) {
      console.error('❌ Tool returned an error:');
      console.error(contextResult.data?.content[0]?.text);
      process.exit(1);
    }

    console.log('✅ Meeting context retrieved successfully!');
    console.log('\n🎬 Meeting Recording Context:');
    console.log('=' .repeat(60));
    
    contextResult.data?.content.forEach((content, index) => {
      console.log(`\n📄 Content ${index + 1} (${content.type}):`);
      console.log(content.text);
    });

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}