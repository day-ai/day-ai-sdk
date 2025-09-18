#!/usr/bin/env node

import { execSync } from "child_process";
import { extname } from "path";
import process from "process";

// Read input from stdin
let input = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", async () => {
  // Parse the input JSON
  const data = JSON.parse(input);

  // Check if this is a file operation. This should already be handled
  // by our hook matcher configuration in .claude/settings.json
  // but we'll check again just in case
  const fileOperations = ["Write", "Edit", "MultiEdit"];
  if (!fileOperations.includes(data.tool_name)) {
    // Not a file operation, exit normally
    process.exit(0);
  }

  // Get the file path from tool_input
  const filePath = data.tool_input?.file_path;

  if (!filePath) {
    // No file path found, exit normally
    process.exit(0);
  }

  // Check if the file has an allowed extension
  const allowedExtensions = [".ts", ".tsx", ".js", ".jsx", ".css", ".html"];
  const fileExtension = extname(filePath).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    // Not a file type we want to lint, exit normally
    process.exit(0);
  }

  try {
    execSync(`yarn lint --fix ${filePath}`, { encoding: "utf8" });
    // Lint succeeded, exit normally
    process.exit(0);
  } catch (error) {
    process.stderr.write(error.stdout);

    process.exit(2);
  }
});
