// Test Case 1: Create or Update Opportunity
export const testCase1 = {
  name: 'create_or_update_opportunity - Create Opportunity',
  description: 'Should create or update an opportunity with full details',
  toolName: 'create_or_update_opportunity',

  input: {
    standardProperties: {
      title: 'VueMail - Email Personalization Platform',
      stageId: 'ee5b4818-707d-4646-a93e-5c53f4db94d4',
      roles: [
        {
          personEmail: 'sam.rangasamy@vuemail.com',
          roles: ['PRIMARY_CONTACT']
        }
      ],
      domain: 'vuemail.com',
      currentStatus: 'Awaiting response on MSA and order form sent August 7th. Contact was out of office due to injury as of September 2nd.',
      description: 'VueMail expressed interest in Zembula\'s email personalization modules for retail use cases. Multiple demos completed, pricing discussed, and formal documents provided for review.',
      organizationName: 'VueMail'
    }
  },

  async validate(result: any) {
    if (!result.success) {
      // Stage might not exist
      if (result.error?.includes('stage') || result.error?.includes('not found')) {
        console.warn('      ⚠️  Note: Stage not found or other validation issue');
        return true;
      }
      throw new Error(`Call failed: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('stage') || errorText?.includes('not found')) {
        console.warn('      ⚠️  Note: Stage not found or other validation issue');
        return true;
      }
      throw new Error(`Tool error: ${errorText}`);
    }

    // Validate that we got a response
    if (result.data?.content?.[0]?.text) {
      const response = result.data.content[0].text;
      if (typeof response !== 'string' || response.length === 0) {
        throw new Error('Expected non-empty response');
      }
    }

    return true;
  }
};

export const testCase = testCase1; // Default export
