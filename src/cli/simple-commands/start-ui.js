// start-ui.js - Standalone UI launcher
import { printSuccess, printError, printWarning, printInfo } from '../utils.js';

export async function launchUI() {
  try {
    // Dynamic import to avoid initial load issues
    let ProcessManager, ProcessUI;
    try {
      // Try the compiled version first (for production/npm packages)
      const pmModule = await import('../../../dist/cli/commands/start/process-manager.js');
      const puiModule = await import('../../../dist/cli/commands/start/process-ui-simple.js');
      ProcessManager = pmModule.ProcessManager;
      ProcessUI = puiModule.ProcessUI;
    } catch (distError) {
      // If dist version not found, try TypeScript version (for development)
      try {
        const pmModule = await import('../commands/start/process-manager.ts');
        const puiModule = await import('../commands/start/process-ui-simple.ts');
        ProcessManager = pmModule.ProcessManager;
        ProcessUI = puiModule.ProcessUI;
      } catch (tsError) {
        // Neither version found, throw the original error
        throw distError;
      }
    }
    
    printSuccess('🚀 Claude-Flow Process Management UI');
    console.log('─'.repeat(60));
    
    // Initialize process manager
    const processManager = new ProcessManager();
    await processManager.initialize();
    
    // Start the UI
    const ui = new ProcessUI(processManager);
    await ui.start();
    
    // Cleanup on exit
    await processManager.stopAll();
    console.log();
    printSuccess('✓ Shutdown complete');
    
  } catch (err) {
    printError(`Failed to launch UI: ${err.message}`);
    console.error('Stack trace:', err.stack);
    
    // Fallback to simple status display
    console.log();
    printWarning('Falling back to simple status display...');
    console.log();
    console.log('Process Management Commands:');
    console.log('  • Start all: claude-flow start');
    console.log('  • Check status: claude-flow status');
    console.log('  • View logs: claude-flow logs');
    console.log('  • Stop: claude-flow stop');
  }
}

// Run if called directly
if (import.meta.main) {
  await launchUI();
}