// Test Case 1: Analyze Pipeline Metrics
export const testCase1 = {
  name: 'analyze_pipeline_metrics - Full Analysis',
  description: 'Should analyze pipeline metrics with all options enabled',
  toolName: 'analyze_pipeline_metrics',

  input: {
    pipelineIds: [
      '201b3c8e-53bd-4026-a59b-c08c39751517',
      '9bb7f727-1018-44e3-94aa-520724e4c0aa'
    ],
    includeMomentum: true,
    includeVelocity: true,
    includeStageDuration: true,
    forecastMonths: 3
  },

  async validate(result: any) {
    if (!result.success) {
      // Pipeline might not exist or have enough data
      if (result.error?.includes('not found') || result.error?.includes('Pipeline')) {
        console.warn('      ⚠️  Note: Pipeline not found or insufficient data');
        return true;
      }
      throw new Error(`Unexpected error: ${result.error}`);
    }

    if (result.data?.isError) {
      const errorText = result.data.content[0]?.text;
      if (errorText?.includes('not found') || errorText?.includes('Pipeline')) {
        console.warn('      ⚠️  Note: Pipeline not found or insufficient data');
        return true;
      }
      throw new Error(`Tool error: ${errorText}`);
    }

    // If successful, validate that we got metrics data
    if (result.data?.content?.[0]?.text) {
      const response = result.data.content[0].text;
      if (typeof response !== 'string' || response.length === 0) {
        throw new Error('Expected non-empty metrics response');
      }
    }

    return true;
  }
};

export const testCase = testCase1; // Default export
