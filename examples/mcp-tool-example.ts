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

    // Example 1: Search for a contact with full properties
    const emailAddress = "markitecht@gmail.com";
    console.log(`4. Searching for contact: ${emailAddress}...`);

    const contactResult = await client.searchObjects(
      [
        {
          objectType: 'native_contact',
          where: {
            propertyId: 'email',
            operator: 'eq',
            value: emailAddress,
          },
        },
      ],
      {
        propertiesToReturn: '*',
        includeRelationships: true,
      }
    );

    if (!contactResult.success) {
      console.error('❌ Contact search failed:', contactResult.error);
    } else {
      console.log('✅ Contact search successful!');
      console.log('\n📋 Contact Result:');
      if (contactResult.data?.isError) {
        console.log('⚠️  Tool returned an error:');
        console.log(contactResult.data?.content[0]?.text);
      } else {
        const resultText = contactResult.data?.content[0]?.text;
        if (resultText) {
          const parsed = JSON.parse(resultText);
          console.log(`   Found ${parsed.native_contact?.results?.length || 0} contacts`);
          if (parsed.native_contact?.results?.[0]) {
            const contact = parsed.native_contact.results[0];
            console.log(`   Name: ${contact.title || contact.properties?.firstName + ' ' + contact.properties?.lastName}`);
            console.log(`   Relationships: ${contact.relationships?.length || 0}`);
          }
        }
      }
    }
    console.log();

    // Example 2: Find meetings with a specific attendee (relationship-based search)
    console.log(`5. Finding meetings attended by ${emailAddress}...`);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const meetingsResult = await client.findMeetingsByAttendee(emailAddress, {
      timeframeStart: thirtyDaysAgo.toISOString(),
      includeRelationships: true,
    });

    if (!meetingsResult.success) {
      console.error('❌ Meetings search failed:', meetingsResult.error);
    } else {
      console.log('✅ Meetings search successful!');
      console.log('\n📋 Meetings Result:');
      if (meetingsResult.data?.isError) {
        console.log('⚠️  Tool returned an error:');
        console.log(meetingsResult.data?.content[0]?.text);
      } else {
        const resultText = meetingsResult.data?.content[0]?.text;
        if (resultText) {
          const parsed = JSON.parse(resultText);
          const meetings = parsed.native_meetingrecording?.results || [];
          console.log(`   Found ${meetings.length} meetings in the last 30 days`);
          meetings.slice(0, 3).forEach((meeting: any, i: number) => {
            console.log(`   ${i + 1}. ${meeting.title} (${meeting.updatedAt})`);
            if (meeting.relationships?.length > 0) {
              const attendees = meeting.relationships.filter((r: any) => r.relationship === 'attendee' || r.relationship === 'attended meeting');
              console.log(`      Attendees: ${attendees.map((a: any) => a.title || a.objectId).join(', ')}`);
            }
          });
          if (meetings.length > 3) {
            console.log(`   ... and ${meetings.length - 3} more`);
          }
        }
      }
    }
    console.log();

    // Example 3: Search for opportunities with a company (relationship-based)
    console.log('6. Searching for opportunities...');

    const oppsResult = await client.searchObjects(
      [
        {
          objectType: 'native_opportunity',
        },
      ],
      {
        propertiesToReturn: ['title', 'expectedRevenue', 'ownerEmail'],
        includeRelationships: true,
      }
    );

    if (!oppsResult.success) {
      console.error('❌ Opportunities search failed:', oppsResult.error);
    } else {
      console.log('✅ Opportunities search successful!');
      const resultText = oppsResult.data?.content[0]?.text;
      if (resultText) {
        const parsed = JSON.parse(resultText);
        const opps = parsed.native_opportunity?.results || [];
        console.log(`   Found ${opps.length} opportunities`);
        opps.slice(0, 3).forEach((opp: any, i: number) => {
          console.log(`   ${i + 1}. ${opp.title}`);
          if (opp.properties?.expectedRevenue) {
            console.log(`      Expected Revenue: $${opp.properties.expectedRevenue}`);
          }
          if (opp.properties?.ownerEmail) {
            console.log(`      Owner: ${opp.properties.ownerEmail}`);
          }
        });
      }
    }

    console.log('\n✨ Example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
