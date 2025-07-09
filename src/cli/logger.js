/**
 * Simple logger for CLI commands
 */

const chalk = require('chalk');

class CLILogger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  debug(message, ...args) {
    if (this.levels[this.level] <= this.levels.debug) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message, ...args) {
    if (this.levels[this.level] <= this.levels.info) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  warn(message, ...args) {
    if (this.levels[this.level] <= this.levels.warn) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message, ...args) {
    if (this.levels[this.level] <= this.levels.error) {
      console.log(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  success(message, ...args) {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
  }

  setLevel(level) {
    this.level = level;
  }
}

module.exports = new CLILogger();
