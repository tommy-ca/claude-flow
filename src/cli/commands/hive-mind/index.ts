#!/usr/bin/env node
/**
 * Hive Mind CLI Commands Index
 * 
 * Main entry point for all Hive Mind CLI commands
 */

import { Command } from 'commander';
import { initCommand } from './init';
import { spawnCommand } from './spawn';
import { statusCommand } from './status';
import { taskCommand } from './task';
import { wizardCommand } from './wizard';

export const hiveMindCommand = new Command('hive-mind')
  .description('Hive Mind collective intelligence swarm management')
  .addCommand(initCommand)
  .addCommand(spawnCommand)
  .addCommand(statusCommand)
  .addCommand(taskCommand)
  .addCommand(wizardCommand);

// Export individual commands for testing
export {
  initCommand,
  spawnCommand,
  statusCommand,
  taskCommand,
  wizardCommand
};