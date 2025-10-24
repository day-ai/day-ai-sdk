import { DayAIClient } from '../../src/client';

// Helper to parse MCP response
function parseSearchResults(result: any) {
  if (!result.success) {
    throw new Error(`Call failed: ${result.error}`);
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

// Test Case 1: Search Contacts
export const testCase1 = {
  name: 'search_objects - Search Contacts',
  description: 'Should return a list of contacts',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_contact'
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    // Response should have native_contact key
    if (!parsed.native_contact) {
      throw new Error('Response missing native_contact data');
    }

    const contactData = parsed.native_contact;

    // Should have results array
    if (!Array.isArray(contactData.results)) {
      throw new Error('Results should be an array');
    }

    // If we have results, validate structure
    if (contactData.results.length > 0) {
      contactData.results.forEach((contact: any, index: number) => {
        if (!contact.objectId) {
          throw new Error(`Contact at index ${index} missing objectId`);
        }
      });
    }

    return true;
  }
};

// Test Case 2: Search Organizations
export const testCase2 = {
  name: 'search_objects - Search Organizations',
  description: 'Should return a list of organizations',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_organization'
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_organization) {
      throw new Error('Response missing native_organization data');
    }

    const orgData = parsed.native_organization;

    if (!Array.isArray(orgData.results)) {
      throw new Error('Results should be an array');
    }

    // Validate organization structure
    if (orgData.results.length > 0) {
      orgData.results.forEach((org: any, index: number) => {
        if (!org.objectId) {
          throw new Error(`Organization at index ${index} missing objectId`);
        }
      });
    }

    return true;
  }
};

// Test Case 3: Pagination Info
export const testCase3 = {
  name: 'search_objects - Pagination Info',
  description: 'Should include pagination information when there are more results',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_contact'
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);
    const contactData = parsed.native_contact;

    if (!Array.isArray(contactData.results)) {
      throw new Error('Results should be an array');
    }

    // Should have pagination fields if there are more results
    if (contactData.hasMore !== undefined) {
      // If hasMore is true, should have nextOffset
      if (contactData.hasMore && !contactData.nextOffset) {
        throw new Error('hasMore is true but nextOffset is missing');
      }
    }

    return true;
  }
};

// Test Case 4: Multiple Object Types
export const testCase4 = {
  name: 'search_objects - Multiple Object Types',
  description: 'Should handle searching multiple object types in one call',
  toolName: 'search_objects',

  input: {
    queries: [
      {
        objectType: 'native_contact'
      },
      {
        objectType: 'native_organization'
      }
    ]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    // Should have both object types in response
    if (!parsed.native_contact) {
      throw new Error('Missing native_contact in response');
    }
    if (!parsed.native_organization) {
      throw new Error('Missing native_organization in response');
    }

    // Both should have results arrays
    if (!Array.isArray(parsed.native_contact.results)) {
      throw new Error('Contact results should be an array');
    }
    if (!Array.isArray(parsed.native_organization.results)) {
      throw new Error('Organization results should be an array');
    }

    return true;
  }
};

// Test Case 5: Search Opportunities with Filters
export const testCase5 = {
  name: 'search_objects - Search Opportunities with Filters',
  description: 'Should filter opportunities by owner and stage',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_opportunity',
      where: {
        AND: [
          {
            propertyId: 'ownerEmail',
            operator: 'eq',
            value: 'gwendolynr@gmail.com'
          },
          {
            propertyId: 'stageId',
            operator: 'contains',
            value: '32f7f72a-5db3-470e-abfe-ad5341e74780'
          }
        ]
      }
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_opportunity) {
      throw new Error('Response missing native_opportunity data');
    }

    const oppData = parsed.native_opportunity;
    if (!Array.isArray(oppData.results)) {
      throw new Error('Results should be an array');
    }

    return true;
  }
};

// Test Case 6: Search Actions by Status
export const testCase6 = {
  name: 'search_objects - Search Actions by Status',
  description: 'Should filter actions by READ status',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_action',
      where: {
        AND: [{
          propertyId: 'status',
          operator: 'eq',
          value: 'READ'
        }]
      }
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_action) {
      throw new Error('Response missing native_action data');
    }

    const actionData = parsed.native_action;
    if (!Array.isArray(actionData.results)) {
      throw new Error('Results should be an array');
    }

    return true;
  }
};

// Test Case 7: Search Gmail Threads with Timeframe
export const testCase7 = {
  name: 'search_objects - Search Gmail Threads with Timeframe',
  description: 'Should filter gmail threads by emails, domains, and timeframe',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_gmailthread',
      where: {
        AND: [
          {
            propertyId: 'allEmails',
            operator: 'contains',
            value: 'will@day.ai'
          },
          {
            propertyId: 'allDomains',
            operator: 'contains',
            value: 'inngest.com'
          }
        ]
      }
    }],
    timeframeStart: '2020-01-01',
    timeframeEnd: '2025-12-31'
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_gmailthread) {
      throw new Error('Response missing native_gmailthread data');
    }

    const threadData = parsed.native_gmailthread;
    if (!Array.isArray(threadData.results)) {
      throw new Error('Results should be an array');
    }

    return true;
  }
};

// Test Case 8: Search Templates by Type
export const testCase8 = {
  name: 'search_objects - Search Templates by Type',
  description: 'Should filter templates by EMAIL type',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_template',
      where: {
        propertyId: 'type',
        operator: 'contains',
        value: 'EMAIL'
      }
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_template) {
      throw new Error('Response missing native_template data');
    }

    const templateData = parsed.native_template;
    if (!Array.isArray(templateData.results)) {
      throw new Error('Results should be an array');
    }

    return true;
  }
};

// Test Case 9: Search Contacts with Multiple Filters
export const testCase9 = {
  name: 'search_objects - Search Contacts with Multiple Filters',
  description: 'Should filter contacts by email and firstName',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_contact',
      where: {
        AND: [
          {
            propertyId: 'email',
            operator: 'contains',
            value: 'sequoia'
          },
          {
            propertyId: 'firstName',
            operator: 'contains',
            value: 'Dannie'
          }
        ]
      }
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_contact) {
      throw new Error('Response missing native_contact data');
    }

    const contactData = parsed.native_contact;
    if (!Array.isArray(contactData.results)) {
      throw new Error('Results should be an array');
    }

    return true;
  }
};

// Test Case 10: Search Pages by Object ID
export const testCase10 = {
  name: 'search_objects - Search Pages by Object ID',
  description: 'Should find specific page by objectId',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_page',
      where: {
        propertyId: 'objectId',
        operator: 'eq',
        value: '41bc2380-eea0-408d-a557-994366c70531'
      }
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_page) {
      throw new Error('Response missing native_page data');
    }

    const pageData = parsed.native_page;
    if (!Array.isArray(pageData.results)) {
      throw new Error('Results should be an array');
    }

    return true;
  }
};

// Test Case 11: Search Stages by Pipeline ID
export const testCase11 = {
  name: 'search_objects - Search Stages by Pipeline ID',
  description: 'Should filter stages by pipelineId',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_stage',
      where: {
        propertyId: 'pipelineId',
        operator: 'contains',
        value: '201b3c8e-53bd-4026-a59b-c08c39751517'
      }
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_stage) {
      throw new Error('Response missing native_stage data');
    }

    const stageData = parsed.native_stage;
    if (!Array.isArray(stageData.results)) {
      throw new Error('Results should be an array');
    }

    return true;
  }
};

// Test Case 12: Meeting Recording Pagination
export const testCase12 = {
  name: 'search_objects - Meeting Recording Pagination',
  description: 'Should properly handle pagination for meeting recordings with hasMore and nextOffset',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_meetingrecording'
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_meetingrecording) {
      throw new Error('Response missing native_meetingrecording data');
    }

    const meetingData = parsed.native_meetingrecording;

    // Validate results array exists
    if (!Array.isArray(meetingData.results)) {
      throw new Error('Results should be an array');
    }

    console.log(`\n📊 Pagination Test Results (Page 1):`);
    console.log(`   Results returned: ${meetingData.results.length}`);
    console.log(`   Total count: ${meetingData.totalCount || 'not provided'}`);
    console.log(`   hasMore: ${parsed.hasMore}`);  // ← Top level!
    console.log(`   nextOffset: ${parsed.nextOffset || 'not provided'}`);  // ← Top level!

    // Check pagination fields
    if (parsed.hasMore === true) {
      // If hasMore is true, nextOffset must be provided
      if (!parsed.nextOffset) {
        throw new Error('hasMore is true but nextOffset is missing - cannot fetch next page');
      }
      console.log(`   ✅ Pagination info correctly provided`);
      console.log(`   🔄 More pages available - use offset: ${parsed.nextOffset}`);
    } else if (parsed.hasMore === false) {
      console.log(`   ℹ️  hasMore is false - this is the last page`);
    } else {
      // hasMore is undefined - all results fit in single response
      console.log(`   ℹ️  All results returned in single page (no pagination needed)`);
    }

    // Validate meeting recording structure
    if (meetingData.results.length > 0) {
      const firstMeeting = meetingData.results[0];
      if (!firstMeeting.objectId) {
        throw new Error('Meeting recording missing objectId');
      }
      console.log(`   Sample meeting ID: ${firstMeeting.objectId}`);
    } else {
      console.log(`   ℹ️  No meeting recordings found`);
    }

    return true;
  }
};

// Test Case 13: Meeting Recording Pagination - Second Page
export const testCase13 = {
  name: 'search_objects - Meeting Recording Pagination (Page 2)',
  description: 'Should fetch second page using offset parameter when more results exist',
  toolName: 'search_objects',

  input: {
    offset: 50,  // Get second page (top-level parameter)
    queries: [{
      objectType: 'native_meetingrecording'
    }]
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    if (!parsed.native_meetingrecording) {
      throw new Error('Response missing native_meetingrecording data');
    }

    const meetingData = parsed.native_meetingrecording;

    if (!Array.isArray(meetingData.results)) {
      throw new Error('Results should be an array');
    }

    console.log(`\n📊 Pagination Test Results (Page 2 with offset: 50):`);
    console.log(`   Results returned: ${meetingData.results.length}`);
    console.log(`   Total count: ${meetingData.totalCount || 'not provided'}`);
    console.log(`   hasMore: ${parsed.hasMore}`);  // ← Top level!
    console.log(`   nextOffset: ${parsed.nextOffset || 'not provided'}`);  // ← Top level!

    // Validate that offset worked - we should get different results or no results if only 1 page
    if (meetingData.results.length > 0) {
      console.log(`   ✅ Successfully fetched page 2`);

      // Check pagination for third page
      if (parsed.hasMore === true) {
        if (!parsed.nextOffset) {
          throw new Error('hasMore is true but nextOffset missing for page 3');
        }
        console.log(`   🔄 More pages available - use offset: ${parsed.nextOffset}`);
      } else if (parsed.hasMore === false) {
        console.log(`   ℹ️  hasMore is false - this is the last page`);
      }
    } else {
      console.log(`   ℹ️  No results on page 2 - only one page of meetings exists`);
    }

    return true;
  }
};

// Test Case 14: Multi-Object Pagination with Timeframe
export const testCase14 = {
  name: 'search_objects - Multi-Object Pagination',
  description: 'Should handle pagination for multiple object types with timeframe filters',
  toolName: 'search_objects',

  input: {
    queries: [
      {
        objectType: 'native_organization'
      },
      {
        objectType: 'native_opportunity'
      }
    ],
    timeframeStart: '2025-09-02T00:00:00-04:00',
    timeframeEnd: '2025-10-10T23:59:59-04:00'
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    console.log(`\n📊 Multi-Object Pagination Test:`);
    console.log(`   Timeframe: 2025-09-02 to 2025-10-10`);

    // Check for organizations
    if (parsed.native_organization) {
      const orgData = parsed.native_organization;
      console.log(`\n   Organizations:`);
      console.log(`     Results: ${orgData.results?.length || 0}`);
      console.log(`     Total count: ${orgData.totalCount || 'not provided'}`);

      if (!Array.isArray(orgData.results)) {
        throw new Error('Organization results should be an array');
      }
    } else {
      console.log(`\n   Organizations: No data returned`);
    }

    // Check for opportunities
    if (parsed.native_opportunity) {
      const oppData = parsed.native_opportunity;
      console.log(`\n   Opportunities:`);
      console.log(`     Results: ${oppData.results?.length || 0}`);
      console.log(`     Total count: ${oppData.totalCount || 'not provided'}`);

      if (!Array.isArray(oppData.results)) {
        throw new Error('Opportunity results should be an array');
      }
    } else {
      console.log(`\n   Opportunities: No data returned`);
    }

    // Check top-level pagination
    console.log(`\n   Pagination (top-level):`);
    console.log(`     hasMore: ${parsed.hasMore}`);
    console.log(`     nextOffset: ${parsed.nextOffset || 'not provided'}`);

    // Validate pagination logic
    const hasOrgResults = parsed.native_organization?.results?.length > 0;
    const hasOppResults = parsed.native_opportunity?.results?.length > 0;

    if ((hasOrgResults || hasOppResults) && parsed.hasMore === true) {
      if (!parsed.nextOffset) {
        throw new Error('hasMore is true but nextOffset is missing');
      }
      console.log(`     ✅ Pagination info provided for next page`);
    } else if (parsed.hasMore === false || parsed.hasMore === undefined) {
      console.log(`     ℹ️  No more pages (hasMore: ${parsed.hasMore})`);
    }

    // Validate structure of results
    if (hasOrgResults) {
      const firstOrg = parsed.native_organization.results[0];
      if (!firstOrg.objectId) {
        throw new Error('Organization missing objectId');
      }
    }

    if (hasOppResults) {
      const firstOpp = parsed.native_opportunity.results[0];
      if (!firstOpp.objectId) {
        throw new Error('Opportunity missing objectId');
      }
    }

    return true;
  }
};

// Test Case 15: Multi-Object Pagination WITHOUT Timeframe
export const testCase15 = {
  name: 'search_objects - Multi-Object Pagination (No Timeframe)',
  description: 'Should handle pagination for orgs/opps without timeframe filters',
  toolName: 'search_objects',

  input: {
    queries: [
      {
        objectType: 'native_organization'
      },
      {
        objectType: 'native_opportunity'
      }
    ]
    // No timeframe filters
  },

  async validate(result: any) {
    const parsed = parseSearchResults(result);

    console.log(`\n📊 Multi-Object Pagination Test (NO TIMEFRAME):`);

    // Check for organizations
    if (parsed.native_organization) {
      const orgData = parsed.native_organization;
      console.log(`\n   Organizations:`);
      console.log(`     Results: ${orgData.results?.length || 0}`);
      console.log(`     Total count: ${orgData.totalCount || 'not provided'}`);

      if (!Array.isArray(orgData.results)) {
        throw new Error('Organization results should be an array');
      }
    } else {
      console.log(`\n   Organizations: No data returned`);
    }

    // Check for opportunities
    if (parsed.native_opportunity) {
      const oppData = parsed.native_opportunity;
      console.log(`\n   Opportunities:`);
      console.log(`     Results: ${oppData.results?.length || 0}`);
      console.log(`     Total count: ${oppData.totalCount || 'not provided'}`);

      if (!Array.isArray(oppData.results)) {
        throw new Error('Opportunity results should be an array');
      }
    } else {
      console.log(`\n   Opportunities: No data returned`);
    }

    // Check top-level pagination
    console.log(`\n   Pagination (top-level):`);
    console.log(`     hasMore: ${parsed.hasMore}`);
    console.log(`     nextOffset: ${parsed.nextOffset || 'not provided'}`);

    // Calculate approximate response size
    const totalResults = (parsed.native_organization?.results?.length || 0) +
                        (parsed.native_opportunity?.results?.length || 0);
    console.log(`     Total results across all types: ${totalResults}`);

    // Validate pagination logic
    if (parsed.hasMore === true) {
      if (!parsed.nextOffset) {
        throw new Error('hasMore is true but nextOffset is missing');
      }
      console.log(`     ✅ Response exceeded 20k tokens - pagination active`);
    } else if (parsed.hasMore === false) {
      console.log(`     ℹ️  hasMore is false - all data fits in response`);
    } else {
      console.log(`     ℹ️  hasMore undefined - response under 20k token limit`);
    }

    return true;
  }
};

// Export all test cases
export const testCase = testCase1; // Default export for single test runs
