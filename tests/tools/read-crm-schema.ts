// Helper to parse MCP response
function parseSchemaResults(result: any) {
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

  // Schema response is JSON with objectType and schema fields
  return JSON.parse(text);
}

// Test Case 1: Contact Schema
export const testCase1 = {
  name: 'read_crm_schema - Contact Schema',
  description: 'Should return schema definition for native_contact',
  toolName: 'read_crm_schema',

  input: {
    objectType: 'native_contact',
    includeOptions: false
  },

  async validate(result: any) {
    const response = parseSchemaResults(result);

    // Should have objectType and schema fields
    if (!response.objectType) {
      throw new Error('Expected objectType in response');
    }

    if (!response.schema || typeof response.schema !== 'string') {
      throw new Error('Expected schema string in response');
    }

    // Schema should be a non-empty string (markdown table format)
    if (response.schema.length === 0) {
      throw new Error('Schema should not be empty');
    }

    // Should mention key contact fields in the schema text
    const schemaText = response.schema.toLowerCase();
    const requiredFields = ['email', 'name']; // Check for generic fields that should be there

    requiredFields.forEach(field => {
      if (!schemaText.includes(field)) {
        throw new Error(`Schema should mention field: ${field}`);
      }
    });

    return true;
  }
};

// Test Case 2: Organization Schema
export const testCase2 = {
  name: 'read_crm_schema - Organization Schema',
  description: 'Should return schema definition for native_organization',
  toolName: 'read_crm_schema',

  input: {
    objectType: 'native_organization',
    includeOptions: false
  },

  async validate(result: any) {
    const response = parseSchemaResults(result);

    if (!response.objectType || !response.schema) {
      throw new Error('Expected objectType and schema in response');
    }

    // Should mention domain field for organizations
    const schemaText = response.schema.toLowerCase();
    if (!schemaText.includes('domain')) {
      throw new Error('Schema should mention domain field for organizations');
    }

    return true;
  }
};

// Test Case 3: Schema with Options
export const testCase3 = {
  name: 'read_crm_schema - With Options',
  description: 'Should include property options when requested',
  toolName: 'read_crm_schema',

  input: {
    objectType: 'native_contact',
    includeOptions: true
  },

  async validate(result: any) {
    const response = parseSchemaResults(result);

    if (!response.objectType || !response.schema) {
      throw new Error('Expected objectType and schema in response');
    }

    // Schema should still be valid with options included
    // Just verify it's a non-empty string
    if (typeof response.schema !== 'string' || response.schema.length === 0) {
      throw new Error('Schema should be a non-empty string');
    }

    return true;
  }
};

export const testCase = testCase1; // Default export
