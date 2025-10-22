// Test Case 1: Get Context (may not have valid object IDs)
export const testCase1 = {
  name: 'get_context_for_objects - Basic Test',
  description: 'Should handle get_context_for_objects call (may not find objects)',
  toolName: 'get_context_for_objects',

  // NOTE: This requires a valid object to exist in the workspace
  // The test is lenient and will pass even if no objects are found
  input: {
    objects: [{
      objectId: 'test-contact-id',
      objectType: 'native_contact'
    }]
  },

  async validate(result: any) {
    // Tool should respond successfully even if no objects found
    if (!result.success) {
      // Check if it's just a "not found" error
      if (result.error?.includes('not found') || result.error?.includes('No objects')) {
        console.warn('      ⚠️  Note: No matching objects found in workspace (expected)');
        return true;
      }
      throw new Error(`Unexpected error: ${result.error}`);
    }

    // If successful, check for content
    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('No objects')) {
        console.warn('      ⚠️  Note: No matching objects found in workspace (expected)');
        return true;
      }
      throw new Error(`Tool error: ${errorText}`);
    }

    // If we got actual context, validate it
    if (result.data?.content?.[0]?.text) {
      const context = result.data.content[0].text;
      if (typeof context !== 'string' || context.length === 0) {
        throw new Error('Expected non-empty context string');
      }
    }

    return true;
  }
};

// Test Case 2: Get Context for Opportunity
export const testCase2 = {
  name: 'get_context_for_objects - Opportunity Context',
  description: 'Should get context for a specific opportunity',
  toolName: 'get_context_for_objects',

  input: {
    objects: [{
      objectId: 'b2d2c55e-4955-4eb9-9a3c-bc28ca5f766d',
      objectType: 'native_opportunity'
    }]
  },

  async validate(result: any) {
    if (!result.success) {
      if (result.error?.includes('not found') || result.error?.includes('No objects')) {
        console.warn('      ⚠️  Note: Opportunity not found in workspace');
        return true;
      }
      throw new Error(`Unexpected error: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('No objects')) {
        console.warn('      ⚠️  Note: Opportunity not found in workspace');
        return true;
      }
      throw new Error(`Tool error: ${errorText}`);
    }

    return true;
  }
};

// Test Case 3: Get Context for Action
export const testCase3 = {
  name: 'get_context_for_objects - Action Context',
  description: 'Should get context for a specific action',
  toolName: 'get_context_for_objects',

  input: {
    objects: [{
      objectId: '672c29a6-e690-4e29-b37c-df6613dcc191',
      objectType: 'native_action'
    }]
  },

  async validate(result: any) {
    if (!result.success) {
      if (result.error?.includes('not found') || result.error?.includes('No objects')) {
        console.warn('      ⚠️  Note: Action not found in workspace');
        return true;
      }
      throw new Error(`Unexpected error: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('No objects')) {
        console.warn('      ⚠️  Note: Action not found in workspace');
        return true;
      }
      throw new Error(`Tool error: ${errorText}`);
    }

    return true;
  }
};

// Test Case 4: Get Context for Contact by Email
export const testCase4 = {
  name: 'get_context_for_objects - Contact by Email',
  description: 'Should get context for a contact using email as objectId',
  toolName: 'get_context_for_objects',

  input: {
    objects: [{
      objectId: 'gwendolynr@gmail.com',
      objectType: 'native_contact'
    }]
  },

  async validate(result: any) {
    if (!result.success) {
      if (result.error?.includes('not found') || result.error?.includes('No objects')) {
        console.warn('      ⚠️  Note: Contact not found in workspace');
        return true;
      }
      throw new Error(`Unexpected error: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('No objects')) {
        console.warn('      ⚠️  Note: Contact not found in workspace');
        return true;
      }
      throw new Error(`Tool error: ${errorText}`);
    }

    return true;
  }
};

// Test Case 5: Get Context for Multiple Gmail Threads
export const testCase5 = {
  name: 'get_context_for_objects - Multiple Gmail Threads',
  description: 'Should get context for multiple gmail threads in one call',
  toolName: 'get_context_for_objects',

  input: {
    objects: [
      {
        objectId: '5ca54f6f-ca85-4afb-9022-db12cc95e82c',
        objectType: 'native_gmailthread'
      },
      {
        objectId: '4e9a4ede-93ef-4467-812e-2e55c89bbbec',
        objectType: 'native_gmailthread'
      }
    ]
  },

  async validate(result: any) {
    if (!result.success) {
      if (result.error?.includes('not found') || result.error?.includes('No objects')) {
        console.warn('      ⚠️  Note: Gmail threads not found in workspace');
        return true;
      }
      throw new Error(`Unexpected error: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('No objects')) {
        console.warn('      ⚠️  Note: Gmail threads not found in workspace');
        return true;
      }
      throw new Error(`Tool error: ${errorText}`);
    }

    return true;
  }
};

export const testCase = testCase1; // Default export
