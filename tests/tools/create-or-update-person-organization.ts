// Test Case 1: Create or Update Contact
export const testCase1 = {
  name: 'create_or_update_person_organization - Create Contact',
  description: 'Should create or update a contact with standard properties',
  toolName: 'create_or_update_person_organization',

  input: {
    objectType: 'native_contact',
    standardProperties: {
      email: 'carolineross@carolineconsulting.com',
      firstName: 'Caroline',
      lastName: 'Ross'
    }
  },

  async validate(result: any) {
    if (!result.success) {
      throw new Error(`Call failed: ${result.error}`);
    }

    if (result.data?.isError) {
      throw new Error(`Tool error: ${result.data.content[0]?.text}`);
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
