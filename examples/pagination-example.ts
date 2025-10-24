#!/usr/bin/env node

import { DayAIClient } from '../src/client';

/**
 * Day AI SDK - Pagination Example
 *
 * This example demonstrates how to use pagination when searching for CRM objects.
 * It covers:
 * - Basic pagination with offset and hasMore
 * - Fetching all results across multiple pages
 * - Multi-object type pagination
 * - Pagination with filters and timeframes
 */

// Helper to parse MCP response
function parseResponse(result: any) {
  if (!result.success) {
    throw new Error(`Request failed: ${result.error}`);
  }

  if (result.data?.isError) {
    throw new Error(`Tool error: ${result.data.content[0]?.text}`);
  }

  const text = result.data?.content?.[0]?.text;
  if (!text) {
    throw new Error('No content in response');
  }

  return JSON.parse(text);
}

async function main() {
  console.log('📄 Day AI SDK - Pagination Example\n');

  try {
    // Initialize the client
    const client = new DayAIClient();

    // Test the connection
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

    // =============================================================================
    // Example 1: Basic Pagination
    // =============================================================================
    console.log('=' .repeat(70));
    console.log('📖 EXAMPLE 1: Basic Pagination');
    console.log('=' .repeat(70) + '\n');

    console.log('REQUEST:');
    console.log(JSON.stringify({
      queries: [{
        objectType: 'native_contact'
      }]
    }, null, 2));
    console.log();

    const firstPageResponse = await client.mcpCallTool('search_objects', {
      queries: [{
        objectType: 'native_contact'
      }]
    });

    const firstPageData = parseResponse(firstPageResponse);
    const contacts = firstPageData.native_contact;

    console.log('RESPONSE STRUCTURE:');
    console.log('-------------------');
    console.log('Top-level pagination fields:');
    console.log(`  hasMore: ${firstPageData.hasMore}`);
    console.log(`  nextOffset: ${firstPageData.nextOffset}\n`);

    console.log('Per-object-type data:');
    console.log(`  native_contact.totalCount: ${contacts.totalCount}`);
    console.log(`  native_contact.results.length: ${contacts.results.length}`);

    // Show a few contact names
    if (contacts.results.length > 0) {
      console.log('\n  Sample results:');
      contacts.results.slice(0, 3).forEach((contact: any, i: number) => {
        console.log(`    ${i + 1}. objectId: ${contact.objectId}`);
        console.log(`       title: ${contact.title || '(no title)'}`);
        console.log(`       updatedAt: ${contact.updatedAt}`);
      });
    }

    if (firstPageData.hasMore) {
      console.log(`\n💡 To get the next page, use: offset: ${firstPageData.nextOffset}`);
    }

    // =============================================================================
    // Example 2: Fetch Second Page (if available)
    // =============================================================================
    if (firstPageData.hasMore) {
      console.log('\n' + '=' .repeat(70));
      console.log('📖 EXAMPLE 2: Fetching Second Page Using nextOffset');
      console.log('=' .repeat(70) + '\n');

      console.log('REQUEST (using offset from previous response):');
      console.log(JSON.stringify({
        offset: firstPageData.nextOffset,
        queries: [{
          objectType: 'native_contact'
        }]
      }, null, 2));
      console.log();

      const secondPageResponse = await client.mcpCallTool('search_objects', {
        offset: firstPageData.nextOffset,  // Use nextOffset from first page
        queries: [{
          objectType: 'native_contact'
        }]
      });

      const secondPageData = parseResponse(secondPageResponse);
      const secondPageContacts = secondPageData.native_contact;

      console.log('RESPONSE:');
      console.log('---------');
      console.log(`Results on page 2: ${secondPageContacts.results.length}`);
      console.log(`hasMore: ${secondPageData.hasMore}`);

      if (secondPageData.hasMore) {
        console.log(`nextOffset: ${secondPageData.nextOffset}`);
        console.log(`\n💡 Use offset: ${secondPageData.nextOffset} to get page 3`);
      } else {
        console.log('✅ Reached the end of results');
      }
    } else {
      console.log('\n⚠️  Only one page of results available - skipping Example 2\n');
    }

    // =============================================================================
    // Example 3: Fetch All Results with Pagination Loop
    // =============================================================================
    console.log('\n' + '=' .repeat(70));
    console.log('📖 EXAMPLE 3: Fetching All Meeting Recordings with Pagination');
    console.log('=' .repeat(70) + '\n');

    let allMeetings: any[] = [];
    let currentOffset: number | undefined = undefined;
    let hasMore = true;
    let pageNum = 0;

    console.log('Fetching all meeting recordings (may take a moment)...\n');

    while (hasMore) {
      pageNum++;

      const response = await client.mcpCallTool('search_objects', {
        offset: currentOffset,
        queries: [{
          objectType: 'native_meetingrecording'
        }]
      });

      const data = parseResponse(response);
      const meetings = data.native_meetingrecording?.results || [];

      allMeetings.push(...meetings);

      console.log(`   Page ${pageNum}: Fetched ${meetings.length} meetings (total so far: ${allMeetings.length})`);

      // Check if there are more pages
      hasMore = data.hasMore === true;
      currentOffset = data.nextOffset;

      // Safety check to prevent infinite loops
      if (pageNum > 20) {
        console.log('\n⚠️  Stopping after 20 pages for safety');
        break;
      }
    }

    console.log(`\n✅ Finished! Retrieved ${allMeetings.length} total meeting recordings`);

    // =============================================================================
    // Example 4: Multi-Object Pagination
    // =============================================================================
    console.log('\n' + '=' .repeat(70));
    console.log('📖 EXAMPLE 4: Multi-Object Pagination');
    console.log('=' .repeat(70) + '\n');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    console.log('REQUEST (searching multiple object types):');
    console.log(JSON.stringify({
      queries: [
        { objectType: 'native_organization' },
        { objectType: 'native_opportunity' }
      ],
      timeframeStart: thirtyDaysAgo.toISOString(),
      timeframeEnd: now.toISOString()
    }, null, 2));
    console.log();

    const multiObjectResponse = await client.mcpCallTool('search_objects', {
      queries: [
        {
          objectType: 'native_organization'
        },
        {
          objectType: 'native_opportunity'
        }
      ],
      timeframeStart: thirtyDaysAgo.toISOString(),
      timeframeEnd: now.toISOString()
    });

    const multiObjectData = parseResponse(multiObjectResponse);

    console.log('RESPONSE STRUCTURE:');
    console.log('-------------------');

    // Display results for each object type
    if (multiObjectData.native_organization) {
      const orgData = multiObjectData.native_organization;
      console.log(`\n📊 native_organization:`);
      console.log(`   totalCount: ${orgData.totalCount}`);
      console.log(`   results.length: ${orgData.results.length}`);

      if (orgData.results.length > 0) {
        console.log(`   Sample: ${orgData.results[0].name || orgData.results[0].objectId}`);
      }
    }

    if (multiObjectData.native_opportunity) {
      const oppData = multiObjectData.native_opportunity;
      console.log(`\n📊 native_opportunity:`);
      console.log(`   totalCount: ${oppData.totalCount}`);
      console.log(`   results.length: ${oppData.results.length}`);

      if (oppData.results.length > 0) {
        console.log(`   Sample: ${oppData.results[0].title || oppData.results[0].objectId}`);
      }
    }

    // Check top-level pagination
    console.log(`\n📄 Top-level pagination (applies to BOTH object types):`);
    console.log(`   hasMore: ${multiObjectData.hasMore}`);
    console.log(`   nextOffset: ${multiObjectData.nextOffset || '(not provided)'}`);

    if (multiObjectData.hasMore) {
      console.log(`\n💡 To get next page of BOTH organizations and opportunities:`);
      console.log(`   Use offset: ${multiObjectData.nextOffset}`);
      console.log(`   With the same queries array`);
    } else {
      console.log(`\n✅ All results fit in a single response`);
    }

    // =============================================================================
    // Example 5: Pagination with Filters
    // =============================================================================
    console.log('\n' + '=' .repeat(70));
    console.log('📖 EXAMPLE 5: Pagination with Filters');
    console.log('=' .repeat(70) + '\n');

    console.log('Searching for contacts with email domain filters...\n');

    const filteredResponse = await client.mcpCallTool('search_objects', {
      queries: [{
        objectType: 'native_contact',
        where: {
          propertyId: 'email',
          operator: 'contains',
          value: '@'  // Simple filter - has an email
        }
      }]
    });

    const filteredData = parseResponse(filteredResponse);
    const filteredContacts = filteredData.native_contact;

    console.log(`Found ${filteredContacts.results.length} contacts with emails`);
    console.log(`Total matching: ${filteredContacts.totalCount || 'all returned'}`);
    console.log(`Has more: ${filteredData.hasMore}`);

    if (filteredData.hasMore) {
      console.log(`\n💡 You can continue paginating with:`);
      console.log(`   offset: ${filteredData.nextOffset}`);
      console.log(`   The same filters will be applied automatically`);
    }

    // =============================================================================
    // Summary
    // =============================================================================
    console.log('\n' + '=' .repeat(70));
    console.log('📚 PAGINATION SUMMARY');
    console.log('=' .repeat(70));
    console.log(`
Key Takeaways:

1. Pagination is at the TOP LEVEL of the response
   - Check \`hasMore\` field at the root of the response
   - Use \`nextOffset\` value for the next request's \`offset\` parameter

2. Each object type has its own results
   - \`results\`: Array of objects returned
   - \`totalCount\`: Total objects in the current page for that type

3. Pagination works with all features
   - Filters (\`where\` conditions)
   - Timeframes (\`timeframeStart\`, \`timeframeEnd\`)
   - Multiple object types in one request
   - Sorting (\`orderBy\`)

4. Best practices
   - Always check \`hasMore\` before fetching next page
   - Use the provided \`nextOffset\` value (don't calculate it yourself)
   - Handle the case where \`hasMore\` is false
   - Add safety limits to prevent infinite loops
`);

    console.log('✅ Pagination example completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
