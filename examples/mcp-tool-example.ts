#!/usr/bin/env node

import { DayAIClient } from '../src/client';

async function main() {
  console.log('🔧 Day AI SDK - MCP Tool Call Example\n');

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
    console.log(`   Workspace: ${connectionTest.data.workspace.workspaceName}`);
    console.log(`   Assistant ID: ${connectionTest.data.workspace.assistantId || 'Not specified'}\n`);

    // Initialize MCP connection
    console.log('2. Initializing MCP connection...');
    const mcpInit = await client.mcpInitialize();
    
    if (!mcpInit.success) {
      console.error('❌ MCP initialization failed:', mcpInit.error);
      process.exit(1);
    }

    console.log('✅ MCP connection initialized\n');

    // List available tools
    console.log('3. Listing available MCP tools...');
    const toolsList = await client.mcpListTools();
    
    if (!toolsList.success) {
      console.error('❌ Failed to list tools:', toolsList.error);
      process.exit(1);
    }

    console.log(`✅ Found ${toolsList.data?.tools.length || 0} tools:`);
    toolsList.data?.tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description || 'No description'}`);
    });
    console.log();

    // Call get_context_for_objects with the specified email
    const emailAddress = "markitecht@gmail.com";
    console.log(`4. Calling get_context_for_objects with email: ${emailAddress}...`);
    
    const contextResult = await client.mcpCallTool('get_context_for_objects', {
      objects: [{ 
        objectId: emailAddress, 
        objectType: 'native_contact' 
      }]
    });
    
    if (!contextResult.success) {
      console.error('❌ Tool call failed:', contextResult.error);
      
      // Check if it's a tool not found error
      if (contextResult.error?.includes('get_context_for_objects')) {
        console.log('💡 The get_context_for_objects tool might not be available for this assistant.');
        console.log('   Available tools are listed above.');
      }
      
      process.exit(1);
    }

    console.log('✅ Tool call successful!');
    console.log('\n📋 Result:');
    
    if (contextResult.data?.isError) {
      console.log('⚠️  Tool returned an error:');
      console.log(contextResult.data?.content[0]?.text);
    } else {
      console.log('📄 Context data:');
      contextResult.data?.content.forEach((content, index) => {
        console.log(`   Content ${index + 1} (${content.type}):`);
        console.log(`   ${content.text}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}