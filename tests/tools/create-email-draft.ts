// Test Case 1: Create Email Draft
export const testCase1 = {
  name: 'create_email_draft - Create Draft with HTML',
  description: 'Should create an email draft with formatted HTML body',
  toolName: 'create_email_draft',

  input: {
    from: 'gwen@day.ai',
    to: ['todd@day.ai'],
    subject: 'Customer Feedback: Backend Issues & Feature Architecture',
    body: '<div>Hi Todd,</div><div></div><div>Just wrapped up a customer feedback call with Keshav (6-week power user) and wanted to flag some technical issues and architecture requests:</div><div></div><div><strong>Backend Issues:</strong></div><ul><li>Meeting recordings page has intermittent loading failures - users experience timeouts/failures that resolve after ~5 minutes</li><li>Seems like it could be a performance or caching issue worth investigating</li></ul><div><strong>Architecture Requests:</strong></div><ul><li>More flexible scheduling system beyond current cron jobs</li><li>Event-driven triggers (after meeting recordings, property updates, etc.)</li><li>Custom timing and frequency controls for automated tasks</li><li>User-configurable \"skills\" that combine prompts with specific tools</li></ul><div><strong>Context:</strong></div><div>Michael mentioned we\'re already working on the scheduling redesign, moving from cron jobs to a more flexible \"skills\" architecture. This customer feedback validates that direction - he specifically wants:</div><ul><li>Custom days (Friday instead of Monday)</li><li>Custom times for notifications</li><li>Event-based automation triggers</li></ul><div>On the positive side, he\'s extremely happy with the core platform and called our meeting intelligence features \"beautiful.\" He\'s using it creatively for sales training and sharing insights with his founding team.</div><div></div><div>Let me know if you want the full transcript or have questions about the technical details!</div><div></div><div>Best,</div><div>Gwen</div>'
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
