#!/usr/bin/env node

import { TestRunner } from '../tests/runner';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const runner = new TestRunner();

  try {
    await runner.initialize();

    if (!command || command === 'all') {
      // Run all tests
      const testsDir = path.join(__dirname, '../tests/tools');
      await runner.runAllTestsInDirectory(testsDir);
      runner.printSummary();

      // Exit with error code if any failed
      const results = runner.getResults();
      const failed = results.filter((r: any) => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);

    } else if (command === 'tool') {
      // Run all tests for a specific tool
      const toolName = args[1];
      if (!toolName) {
        console.error(colorize('Please specify a tool name', 'red'));
        console.log(colorize('Usage: yarn test:tool <tool-name>', 'gray'));
        console.log(colorize('Example: yarn test:tool search-objects', 'gray'));
        process.exit(1);
      }

      const toolDir = path.join(__dirname, '../tests/tools', toolName);
      await runner.runAllTestsInDirectory(toolDir);
      runner.printSummary();

      const results = runner.getResults();
      const failed = results.filter((r: any) => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);

    } else if (command === 'file') {
      // Run a specific test file
      const filePath = args[1];
      if (!filePath) {
        console.error(colorize('Please specify a test file path', 'red'));
        console.log(colorize('Usage: yarn test:file <path>', 'gray'));
        console.log(colorize('Example: yarn test:file tests/tools/search-objects/search-contacts.ts', 'gray'));
        process.exit(1);
      }

      const result = await runner.runTestFile(filePath);
      process.exit(result.passed ? 0 : 1);

    } else {
      console.log(colorize('Day AI SDK Test Runner\n', 'yellow'));
      console.log('Usage:');
      console.log('  yarn test              # Run all tests');
      console.log('  yarn test:tool <name>  # Run tests for specific tool');
      console.log('  yarn test:file <path>  # Run specific test file');
      console.log('\nExamples:');
      console.log('  yarn test');
      console.log('  yarn test:tool search-objects');
      console.log('  yarn test:file tests/tools/search-objects/search-contacts.ts');
      process.exit(0);
    }

  } catch (error) {
    console.error(colorize('Error: ', 'red'), error);
    process.exit(1);
  }
}

main();
