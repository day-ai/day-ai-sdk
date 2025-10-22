import { DayAIClient } from '../src/client';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export interface TestCase {
  name: string;
  description: string;
  toolName: string;
  input: any;
  validate: (result: any) => Promise<boolean> | boolean;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  duration: number;
  error?: string;
}

export class TestRunner {
  private client: DayAIClient;
  private results: TestResult[] = [];

  constructor() {
    // Safety check: Only allow tests against localhost
    this.validateLocalEnvironment();
    this.client = new DayAIClient();
  }

  private validateLocalEnvironment() {
    const baseUrl = process.env.DAY_AI_BASE_URL;

    // Check if DAY_AI_BASE_URL is set
    if (!baseUrl) {
      throw new Error(
        '❌ DAY_AI_BASE_URL not set in .env file\n' +
        '   Tests can only run against local environment.\n' +
        '   Add to .env: DAY_AI_BASE_URL=http://localhost:8910'
      );
    }

    // Validate it's a localhost URL
    const isLocalhost =
      baseUrl.includes('localhost') ||
      baseUrl.includes('127.0.0.1') ||
      baseUrl.includes('0.0.0.0');

    if (!isLocalhost) {
      throw new Error(
        '❌ SAFETY CHECK FAILED: Tests can only run against localhost!\n' +
        `   Current DAY_AI_BASE_URL: ${baseUrl}\n` +
        '   Change .env to: DAY_AI_BASE_URL=http://localhost:8910\n' +
        '   \n' +
        '   This prevents accidentally running tests against production.'
      );
    }

    console.log(colorize('🔒 Environment validated: Local only', 'green'));
  }

  async initialize() {
    console.log(colorize('🔧 Initializing Day AI SDK...\n', 'blue'));

    const conn = await this.client.testConnection();
    if (!conn.success) {
      throw new Error('Connection failed: ' + conn.error);
    }
    console.log(colorize('✅ Connected', 'green'));
    console.log(colorize(`   Workspace: ${conn.data?.workspace?.workspaceName || 'Unknown'}`, 'gray'));

    const init = await this.client.mcpInitialize();
    if (!init.success) {
      throw new Error('MCP init failed: ' + init.error);
    }
    console.log(colorize('✅ MCP initialized\n', 'green'));
  }

  async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Call the tool
      const result = await this.client.mcpCallTool(
        testCase.toolName,
        testCase.input
      );

      // Run validation
      await testCase.validate(result);

      const duration = Date.now() - startTime;
      return {
        testCase,
        passed: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testCase,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runAllTestsInDirectory(dir: string): Promise<TestResult[]> {
    const testFiles = this.findTestFiles(dir);

    console.log(colorize(`📋 Found ${testFiles.length} test file${testFiles.length !== 1 ? 's' : ''}\n`, 'blue'));

    for (const file of testFiles) {
      try {
        const testModule = require(file);

        // Collect all test cases from the file
        const testCases: TestCase[] = [];

        // Look for numbered exports (testCase1, testCase2, etc.) or single testCase
        Object.keys(testModule).forEach(key => {
          if (key === 'testCase' || key.startsWith('testCase')) {
            const tc = testModule[key];
            if (tc && tc.name && tc.toolName && tc.validate) {
              testCases.push(tc);
            }
          }
        });

        if (testCases.length === 0) {
          console.log(colorize(`⚠️  Skipping ${path.basename(file)} - no testCase exports found`, 'yellow'));
          continue;
        }

        // Run all test cases from this file
        for (const testCase of testCases) {
          process.stdout.write(colorize(`Running: ${testCase.name}... `, 'gray'));

          const result = await this.runTest(testCase);
          this.results.push(result);

          if (result.passed) {
            console.log(colorize(`✅ (${result.duration}ms)`, 'green'));
          } else {
            console.log(colorize(`❌`, 'red'));
            console.log(colorize(`  Error: ${result.error}`, 'red'));
          }
        }
      } catch (error) {
        console.log(colorize(`⚠️  Error loading ${path.basename(file)}: ${error}`, 'yellow'));
      }
    }

    return this.results;
  }

  async runTestFile(filePath: string): Promise<TestResult> {
    const testModule = require(path.resolve(filePath));
    const testCase = testModule.testCase;

    if (!testCase) {
      throw new Error('No testCase export found in file');
    }

    console.log(colorize(`\n📋 Running: ${testCase.name}`, 'blue'));
    console.log(colorize(`   ${testCase.description}\n`, 'gray'));

    const result = await this.runTest(testCase);

    if (result.passed) {
      console.log(colorize(`\n✅ Test passed (${result.duration}ms)`, 'green'));
    } else {
      console.log(colorize(`\n❌ Test failed`, 'red'));
      console.log(colorize(`   ${result.error}`, 'red'));
    }

    return result;
  }

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue'));
    console.log(colorize('📊 Test Summary\n', 'blue'));
    console.log(colorize(`  ✅ Passed: ${passed}`, 'green'));
    if (failed > 0) {
      console.log(colorize(`  ❌ Failed: ${failed}`, 'red'));
    }
    console.log(colorize(`  📦 Total:  ${this.results.length}`, 'gray'));
    console.log(colorize(`  ⏱️  Time:   ${totalTime}ms`, 'gray'));
    console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue'));

    if (failed > 0) {
      console.log(colorize('Failed tests:', 'red'));
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(colorize(`  • ${r.testCase.name}: ${r.error}`, 'red'));
        });
      console.log();
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  private findTestFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (
          (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
          !entry.name.endsWith('.d.ts') &&
          entry.name !== 'runner.ts' &&
          entry.name !== 'runner.js'
        ) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files.sort();
  }
}
