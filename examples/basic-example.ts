#!/usr/bin/env node

import { DayAIClient } from '../src/client';

async function main() {
  console.log('🚀 Day AI SDK Basic Example\n');

  try {
    // Initialize the client (will load from .env automatically)
    const client = new DayAIClient();

    // Test the connection
    console.log('Testing connection...');
    const connectionTest = await client.testConnection();
    
    if (!connectionTest.success) {
      console.error('❌ Connection failed:', connectionTest.error);
      process.exit(1);
    }

    console.log('✅ Connection successful!\n');

    // Example: Get workspace metadata
    console.log('Getting workspace metadata...');
    const metadata = await client.getWorkspaceMetadata();
    
    if (metadata.success) {
      console.log('📋 Workspace Info:');
      console.log(`   Name: ${metadata.data.workspaceName}`);
      console.log(`   ID: ${metadata.data.workspaceId}`);
      console.log(`   User ID: ${metadata.data.userId}`);
      console.log(`   Scopes: ${metadata.data.scopes.join(', ')}\n`);
    } else {
      console.error('❌ Failed to get metadata:', metadata.error);
    }

    // Example: Make a GraphQL query
    console.log('Making a GraphQL query for recent activities...');
    const graphqlQuery = `
      query RecentActivities {
        activities(first: 5) {
          edges {
            node {
              id
              createdAt
              type
            }
          }
        }
      }
    `;

    const activitiesResult = await client.graphql(graphqlQuery);
    
    if (activitiesResult.success) {
      console.log('✅ Activities retrieved:', JSON.stringify(activitiesResult.data, null, 2));
    } else {
      console.log('ℹ️  Activities query failed (this is expected if the endpoint doesn\'t exist):', activitiesResult.error);
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