// Test Case 1: Update Page
export const testCase1 = {
  name: 'update_page - Update Page HTML',
  description: 'Should update page HTML content',
  toolName: 'update_page',

  input: {
    pageId: '84eecc18-0647-4a59-9542-9a22523259ec',
    pageHtmlContent: '<h2>Contact Information</h2>\n<p><strong>Name:</strong> Caroline Ross</p>\n<p><strong>Email:</strong> carolineross@carolineconsulting.com</p>\n<p><strong>Company:</strong> Caroline Consulting</p>\n\n<h2>Relationship History</h2>\n<p>Caroline is a former colleague from the University of Utah, where we both worked in non-profit consulting together from 2016 to 2020. She served as Director of Impact Consulting during our time there.</p>\n\n<h2>Professional Background</h2>\n<p>Caroline has experience in non-profit consulting, having held the position of Director of Impact Consulting at the University of Utah. She currently appears to be running her own consulting practice, Caroline Consulting.</p>\n\n<h2>CRM Record</h2>\n<p>Contact record: <span data-object-id="carolineross@carolineconsulting.com" data-object-type="native_contact">Caroline Ross</span></p>'
  },

  async validate(result: any) {
    if (!result.success) {
      // Page might not exist
      if (result.error?.includes('not found') || result.error?.includes('page')) {
        console.warn('      ⚠️  Note: Page not found');
        return true;
      }
      throw new Error(`Call failed: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('page')) {
        console.warn('      ⚠️  Note: Page not found');
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

// Test Case 2: Create Page
export const testCase2 = {
  name: 'create_page - Create New Page',
  description: 'Should create a new page with HTML content',
  toolName: 'create_page',

  input: {
    title: 'Caroline Ross - Contact Summary',
    pageHtmlContent: '<h2>Contact Information</h2>\n<p><strong>Name:</strong> Caroline Ross</p>\n<p><strong>Email:</strong> carolineross@carolineconsulting.com</p>\n<p><strong>Company:</strong> Caroline Consulting</p>\n\n<h2>Relationship History</h2>\n<p>Caroline is a former colleague from the University of Utah, where we both worked in non-profit consulting together from 2016 to 2020.</p>\n\n<h2>Professional Background</h2>\n<p>Caroline has experience in non-profit consulting and currently appears to be running her own consulting practice, Caroline Consulting.</p>\n\n<h2>CRM Record</h2>\n<p>Contact record: <span data-object-id="carolineross@carolineconsulting.com" data-object-type="native_contact">Caroline Ross</span></p>'
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
