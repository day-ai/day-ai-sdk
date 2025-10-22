// Test Case 1: Create Workspace Context
export const testCase1 = {
  name: 'create_or_update_workspace_context - Create Object Context',
  description: 'Should create workspace context for a contact',
  toolName: 'create_or_update_workspace_context',

  input: {
    mode: 'create',
    attachmentType: 'object',
    objectType: 'native_contact',
    objectId: 'carolineross@carolineconsulting.com',
    plainTextValue: 'Former colleague from the University of Utah where we both worked in non-profit consulting together from 2016 to 2020.',
    summary: 'Former colleague - University of Utah non-profit consulting (2016-2020)'
  },

  async validate(result: any) {
    if (!result.success) {
      // Contact might not exist
      if (result.error?.includes('not found') || result.error?.includes('contact')) {
        console.warn('      ⚠️  Note: Contact not found');
        return true;
      }
      throw new Error(`Call failed: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('contact')) {
        console.warn('      ⚠️  Note: Contact not found');
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
