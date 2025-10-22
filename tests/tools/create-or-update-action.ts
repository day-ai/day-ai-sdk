// Test Case 1: Create or Update Action
export const testCase1 = {
  name: 'create_or_update_action - Create Action',
  description: 'Should create or update an action with full details',
  toolName: 'create_or_update_action',

  input: {
    title: 'Caroline needs proposal follow-up',
    assignedToAssistant: false,
    ownerEmail: 'gwendolynr@gmail.com',
    people: ['carolineross@carolineconsulting.com'],
    domains: ['carolineconsulting.com'],
    type: 'FOLLOWUP',
    status: 'UNREAD',
    executeAt: '2025-10-31T09:00:00-06:00',
    descriptionPoints: [
      'Caroline Ross needs: Follow-up on proposal for our team',
      'How: Send email',
      'From: Previous discussion on 10/21',
      'Why: Check if proposal is ready for review'
    ],
    actionUserInputDetails: 'User needs to email Caroline Ross next Friday (October 31, 2025) to follow up and see if she has a proposal ready for their team. Caroline is a former colleague from University of Utah where they both worked in non-profit consulting from 2016-2020, and she was Director of Impact Consulting.'
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
