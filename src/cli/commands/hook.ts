import { spawn } from 'child_process';
import { logger } from '../../utils/logger.js';

interface HookCommandOptions {
  args: string[];
}

export const hookCommand = {
  name: 'hook',
  description: 'Execute ruv-swarm hooks for agent coordination',
  action: async ({ args }: HookCommandOptions): Promise<void> => {
    try {
      // Log the hook command being executed
      logger.debug(`Executing hook command: ruv-swarm hook ${args.join(' ')}`);
      
      // Spawn ruv-swarm hook command
      const child = spawn('npx', ['ruv-swarm', 'hook', ...args], {
        stdio: 'inherit',
        shell: true
      });
      
      // Wait for the command to complete
      await new Promise<void>((resolve, reject) => {
        child.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Hook command failed with exit code ${code}`));
          }
        });
        
        child.on('error', (error) => {
          logger.error('Failed to execute hook command:', error);
          reject(error);
        });
      });
      
    } catch (error) {
      logger.error('Hook command error:', error);
      throw error;
    }
  }
};

// Export hook subcommands for better CLI integration
export const hookSubcommands = [
  'pre-task',
  'post-task',
  'post-edit',
  'pre-search',
  'notification',
  'session-start',
  'session-end',
  'session-restore',
  'performance',
  'memory-sync',
  'telemetry'
];