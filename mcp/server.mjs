#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGameServer } from './duenever.mjs';

try {
  await createGameServer().connect(new StdioServerTransport());
} catch (error) {
  console.error(`Could not start DueNever MCP server: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
}
