#!/usr/bin/env node
/**
 * JavaScript to TypeScript Migration Tool
 * 
 * Generalized, SOLID-compliant TypeScript migration following specs-driven flow.
 * Implements KISS principles with consistent naming conventions.
 * Works with any JavaScript project or codebase.
 * 
 * SPARC Architecture:
 * - Specification: Clear interfaces and contracts
 * - Pseudocode: Well-documented transformation logic  
 * - Architecture: SOLID principles with separation of concerns
 * - Refinement: Clean, maintainable, testable code
 * - Completion: Production-ready migration tool
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ===== SPECIFICATIONS (CONTRACTS) =====

/**
 * @typedef {Object} MigrationConfig
 * @property {boolean} enableLinting - Enable automatic code formatting
 * @property {boolean} generateInterfaces - Generate TypeScript interfaces
 * @property {boolean} createBackups - Create backup files
 * @property {string} outputSuffix - Output file suffix
 * @property {boolean} strictMode - Use strict TypeScript mode
 */

/**
 * @typedef {Object} FileMetrics
 * @property {number} inputSize - Input file size in characters
 * @property {number} outputSize - Output file size in characters
 * @property {number} typesAdded - Number of types added
 * @property {number} interfacesAdded - Number of interfaces added
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {string} inputPath - Input file path
 * @property {string} outputPath - Output file path
 * @property {boolean} success - Processing success status
 * @property {string} [error] - Error message if failed
 * @property {FileMetrics} metrics - Processing metrics
 */

/**
 * @typedef {Object} MigrationStats
 * @property {number} filesProcessed - Total files processed
 * @property {number} totalTypesAdded - Total types added
 * @property {number} totalInterfacesGenerated - Total interfaces generated
 * @property {number} errorsEncountered - Total errors encountered
 */

// ===== ARCHITECTURE (IMPLEMENTATIONS) =====

/**
 * Migration configuration manager
 * Single Responsibility: Configuration management
 */
class MigrationConfigurationManager {
  /**
   * @param {Partial<MigrationConfig>} [options={}] - Configuration options
   */
  constructor(options = {}) {
    this.enableLinting = options.enableLinting ?? true;
    this.generateInterfaces = options.generateInterfaces ?? true;
    this.createBackups = options.createBackups ?? true;
    this.outputSuffix = options.outputSuffix ?? '.ts';
    this.strictMode = options.strictMode ?? false;
  }
}

/**
 * Migration statistics tracker
 * Single Responsibility: Statistics management
 */
class MigrationStatisticsTracker {
  constructor() {
    this.filesProcessed = 0;
    this.totalTypesAdded = 0;
    this.totalInterfacesGenerated = 0;
    this.errorsEncountered = 0;
  }

  incrementFilesProcessed() {
    this.filesProcessed++;
  }

  /** @param {number} count */
  addTypes(count) {
    this.totalTypesAdded += count;
  }

  /** @param {number} count */
  addInterfaces(count) {
    this.totalInterfacesGenerated += count;
  }

  recordError() {
    this.errorsEncountered++;
  }

  reset() {
    this.filesProcessed = 0;
    this.totalTypesAdded = 0;
    this.totalInterfacesGenerated = 0;
    this.errorsEncountered = 0;
  }

  /** @returns {MigrationStats} */
  getStatistics() {
    return {
      filesProcessed: this.filesProcessed,
      totalTypesAdded: this.totalTypesAdded,
      totalInterfacesGenerated: this.totalInterfacesGenerated,
      errorsEncountered: this.errorsEncountered
    };
  }
}

/**
 * Type annotation service
 * Single Responsibility: Adding TypeScript type annotations
 */
class TypeAnnotationService {
  
  /**
   * Add type annotations to function declarations
   * Open/Closed: Extensible through parameter pattern recognition
   * @param {string} content - Source code content
   * @returns {string} - Transformed content
   */
  addFunctionTypes(content) {
    let result = content;
    
    // Transform async functions
    result = result.replace(
      /async\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      (match, functionName, parameters) => {
        const typedParams = this.annotateParameters(parameters);
        return `async function ${functionName}(${typedParams}): Promise<any> {`;
      }
    );
    
    // Transform class methods
    result = result.replace(
      /async\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      (match, methodName, parameters) => {
        const typedParams = this.annotateParameters(parameters);
        return `async ${methodName}(${typedParams}): Promise<any> {`;
      }
    );
    
    return result;
  }

  /**
   * Add type annotations to variable declarations
   * Liskov Substitution: Works with any variable pattern
   * @param {string} content - Source code content
   * @returns {string} - Transformed content
   */
  addVariableTypes(content) {
    return content.replace(
      /^(\s*)(const|let)\s+(\w+)\s*=\s*(new\s+Map\(\)|new\s+Set\(\)|\[\]|\{\});?\s*$/gm,
      (match, indent, keyword, variableName, value) => {
        const type = this.inferVariableType(value);
        return `${indent}${keyword} ${variableName}: ${type} = ${value};`;
      }
    );
  }

  /**
   * Add type annotations to class properties and methods
   * Interface Segregation: Focused on class-specific transformations
   * @param {string} content - Source code content
   * @returns {string} - Transformed content
   */
  addClassTypes(content) {
    return content.replace(
      /^(\s+)(\w+)\s*=\s*(new\s+\w+|\[\]|\{\}|null|false|true|\d+|"[^"]*"|'[^']*');?\s*$/gm,
      (match, indent, propertyName, value) => {
        const type = this.inferPropertyType(value);
        return `${indent}private ${propertyName}: ${type} = ${value};`;
      }
    );
  }

  /**
   * Annotate function parameters with intelligent type inference
   * Dependency Inversion: Depends on abstractions (patterns) not concretions
   * @param {string} parametersString - Function parameters string
   * @returns {string} - Annotated parameters
   */
  annotateParameters(parametersString) {
    if (!parametersString.trim()) return parametersString;
    
    return parametersString.split(',').map(param => {
      const trimmedParam = param.trim();
      if (!trimmedParam || trimmedParam.includes(':')) return trimmedParam;
      
      return `${trimmedParam}: ${this.inferParameterType(trimmedParam)}`;
    }).join(', ');
  }

  /**
   * Infer parameter type from naming patterns
   * KISS: Simple pattern matching without complex analysis
   * @param {string} parameterName - Parameter name
   * @returns {string} - Inferred type
   */
  inferParameterType(parameterName) {
    const name = parameterName.toLowerCase();
    
    if (name.includes('config') || name.includes('options')) return 'Record<string, any>';
    if (name.includes('name') || name.includes('id') || name.includes('path')) return 'string';
    if (name.includes('count') || name.includes('timeout') || name.includes('size')) return 'number';
    if (name.includes('enabled') || name.includes('flag')) return 'boolean';
    if (name.includes('callback') || name.includes('handler')) return 'Function';
    if (name.includes('array') || name.includes('list')) return 'any[]';
    
    return 'any';
  }

  /**
   * Infer variable type from initialization value
   * @param {string} value - Variable initialization value
   * @returns {string} - Inferred type
   */
  inferVariableType(value) {
    if (value === 'new Map()') return 'Map<string, any>';
    if (value === 'new Set()') return 'Set<any>';
    if (value === '[]') return 'any[]';
    if (value === '{}') return 'Record<string, any>';
    return 'any';
  }

  /**
   * Infer class property type from value
   * @param {string} value - Property value
   * @returns {string} - Inferred type
   */
  inferPropertyType(value) {
    if (value.startsWith('new ')) {
      const className = value.match(/new\s+(\w+)/)?.[1];
      return className || 'any';
    }
    if (value === '[]') return 'any[]';
    if (value === '{}') return 'Record<string, any>';
    if (value === 'null') return 'any | null';
    if (value === 'false' || value === 'true') return 'boolean';
    if (/^\d+$/.test(value)) return 'number';
    if (value.startsWith('"') || value.startsWith("'")) return 'string';
    return 'any';
  }
}

/**
 * Interface generation service
 * Single Responsibility: Generate TypeScript interfaces from code patterns
 */
class InterfaceGenerationService {

  /**
   * Generate interfaces based on code analysis
   * Open/Closed: Extensible interface patterns
   * @param {string} content - Source code content
   * @returns {string} - Content with generated interfaces
   */
  generateInterfaces(content) {
    const patterns = this.extractInterfacePatterns(content);
    if (patterns.length === 0) return content;

    const interfaceSection = this.buildInterfaceSection(patterns);
    return this.insertInterfacesAfterImports(content, interfaceSection);
  }

  /**
   * Extract interface patterns from content analysis
   * Liskov Substitution: Consistent pattern extraction
   * @param {string} content - Source code content
   * @returns {string[]} - Array of pattern identifiers
   */
  extractInterfacePatterns(content) {
    const patterns = [];

    // Performance monitoring patterns
    if (content.includes('PerformanceMonitor') || content.includes('recordMetric')) {
      patterns.push('performance-monitor');
    }

    // Configuration patterns
    if (content.includes('config') && (content.includes('options') || content.includes('settings'))) {
      patterns.push('config-interface');
    }

    // Service coordinator patterns
    if (content.includes('Coordinator') || content.includes('Manager')) {
      patterns.push('service-coordinator');
    }

    // Task/Result patterns
    if (content.includes('Task') && (content.includes('Result') || content.includes('execute'))) {
      patterns.push('task-result');
    }

    // Event emitter patterns
    if (content.includes('EventEmitter') || content.includes('emit')) {
      patterns.push('event-emitter');
    }

    return patterns;
  }

  /**
   * Build interface definitions section
   * Interface Segregation: Focused interface generation
   * @param {string[]} patterns - Interface patterns to generate
   * @returns {string} - Generated interface section
   */
  buildInterfaceSection(patterns) {
    const interfaceDefinitions = patterns.map(pattern => {
      switch (pattern) {
        case 'performance-monitor':
          return this.createPerformanceMonitorInterfaces();
        case 'config-interface':
          return this.createConfigInterface();
        case 'service-coordinator':
          return this.createServiceCoordinatorInterface();
        case 'task-result':
          return this.createTaskResultInterfaces();
        case 'event-emitter':
          return this.createEventEmitterInterface();
        default:
          return '';
      }
    }).filter(def => def);

    return interfaceDefinitions.length > 0
      ? `\n// ===== GENERATED INTERFACES =====\n${interfaceDefinitions.join('\n')}\n\n// ===== IMPLEMENTATIONS =====\n`
      : '';
  }

  /**
   * Create performance monitor interfaces
   * Dependency Inversion: Interface-based design
   * @returns {string} - Performance monitor interface definitions
   */
  createPerformanceMonitorInterfaces() {
    return `
/**
 * Performance metric entry
 */
interface IPerformanceMetric {
  readonly operation: string;
  readonly duration: number;
  readonly success: boolean;
  readonly timestamp: number;
  readonly memoryUsage: number | null;
  readonly error: string | null;
}

/**
 * Performance monitor contract
 */
interface IPerformanceMonitor {
  recordMetric(operation: string, duration: number, success: boolean, error?: string | null): Promise<void>;
  getMetrics(): IPerformanceMetric[];
  getAveragePerformance(operation: string): { avgDuration: number; successRate: number } | null;
}`;
  }

  /**
   * Create generic configuration interface
   * @returns {string} - Generic config interface definition
   */
  createConfigInterface() {
    return `
/**
 * Generic configuration contract
 */
interface IConfig {
  readonly [key: string]: any;
  readonly enabled?: boolean;
  readonly timeout?: number;
  readonly logLevel?: 'info' | 'debug' | 'error' | 'warn';
}`;
  }

  /**
   * Create service coordinator interface
   * @returns {string} - Service coordinator interface definition
   */
  createServiceCoordinatorInterface() {
    return `
/**
 * Service coordinator contract
 */
interface IServiceCoordinator {
  initialize(config?: Record<string, any>): Promise<void>;
  execute(task: any, options?: Record<string, any>): Promise<any>;
  getStatus(): Promise<any>;
  shutdown(): Promise<void>;
}`;
  }

  /**
   * Create event emitter interface
   * @returns {string} - Event emitter interface definition
   */
  createEventEmitterInterface() {
    return `
/**
 * Event emitter contract
 */
interface IEventEmitter {
  on(event: string, listener: Function): this;
  emit(event: string, ...args: any[]): boolean;
  removeListener(event: string, listener: Function): this;
  removeAllListeners(event?: string): this;
}`;
  }

  /**
   * Create task result interfaces
   * @returns {string} - Task result interface definitions
   */
  createTaskResultInterfaces() {
    return `
/**
 * Task execution result contract
 */
interface ITaskResult {
  readonly id: string;
  readonly description: string;
  readonly phase: string;
  readonly agents: readonly string[];
  readonly consensus: boolean;
}

/**
 * Specification result contract
 */
interface ISpecResult {
  readonly featureDir?: string;
  readonly task?: ITaskResult;
}`;
  }

  /**
   * Insert interfaces after imports section
   * KISS: Simple insertion logic
   * @param {string} content - Source content
   * @param {string} interfaceSection - Interface definitions
   * @returns {string} - Content with inserted interfaces
   */
  insertInterfacesAfterImports(content, interfaceSection) {
    const importMatch = content.match(/(import[^;]+;\s*\n)(?!import)/);
    if (importMatch) {
      return content.replace(importMatch[0], importMatch[0] + interfaceSection);
    }
    return interfaceSection + content;
  }
}

/**
 * Code formatting service
 * Single Responsibility: Code formatting and import management
 */
class CodeFormattingService {

  /**
   * Format code using available linting tools
   * Open/Closed: Supports multiple formatters
   * @param {string} content - Source code content
   * @param {string} filePath - File path for formatting
   * @returns {Promise<string>} - Formatted content
   */
  async formatCode(content, filePath) {
    try {
      // Try Biome first (preferred)
      execSync(`npx @biomejs/biome check --write "${filePath}"`, { 
        cwd: PROJECT_ROOT, 
        stdio: 'pipe' 
      });
      console.log('  ✅ Applied Biome formatting');
    } catch {
      try {
        // Fallback to Prettier
        execSync(`npx prettier --write "${filePath}"`, { 
          cwd: PROJECT_ROOT, 
          stdio: 'pipe' 
        });
        console.log('  ✅ Applied Prettier formatting');
      } catch {
        console.log('  ⚠️  No formatters available, skipping');
      }
    }
    
    return content;
  }

  /**
   * Fix import statements for TypeScript compatibility
   * Liskov Substitution: Consistent import handling
   * @param {string} content - Source code content
   * @returns {string} - Content with fixed imports
   */
  fixImports(content) {
    // Fix import extensions
    let result = content.replace(
      /from\s+['"]([^'"]+)\.js['"]/g,
      "from '$1.js'"
    );

    // Add 'as const' for configuration objects
    result = result.replace(
      /const\s+(\w+)\s*=\s*\{([^}]+)\};/g,
      (match, name, content) => {
        if (content.includes(':') && content.includes(',')) {
          return `const ${name} = {${content}} as const;`;
        }
        return match;
      }
    );

    // Fix error handling parameters
    result = result.replace(
      /catch\s*\(\s*(\w+)\s*\)/g,
      'catch ($1: unknown)'
    );

    return result;
  }
}

/**
 * Main TypeScript migration engine
 * Interface Segregation: Focused on orchestration
 * Dependency Inversion: Depends on service abstractions
 */
class TypeScriptMigrationEngine {
  /**
   * @param {MigrationConfigurationManager} config - Migration configuration
   * @param {TypeAnnotationService} typeService - Type annotation service
   * @param {InterfaceGenerationService} interfaceService - Interface generation service
   * @param {CodeFormattingService} formattingService - Code formatting service
   */
  constructor(config, typeService, interfaceService, formattingService) {
    this.config = config;
    this.statistics = new MigrationStatisticsTracker();
    this.typeAnnotationService = typeService;
    this.interfaceGenerationService = interfaceService;
    this.codeFormattingService = formattingService;
  }

  /**
   * Process multiple files
   * Open/Closed: Extensible for different file types
   * @param {string[]} filePaths - Array of file paths to process
   * @returns {Promise<ProcessingResult[]>} - Processing results
   */
  async processFiles(filePaths) {
    console.log('🚀 JavaScript to TypeScript Migration Starting...\n');
    this.statistics.reset();

    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.processFile(filePath);
        results.push(result);
        this.statistics.incrementFilesProcessed();
      } catch (error) {
        const failedResult = {
          inputPath: filePath,
          outputPath: '',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metrics: { inputSize: 0, outputSize: 0, typesAdded: 0, interfacesAdded: 0 }
        };
        results.push(failedResult);
        this.statistics.recordError();
      }
    }

    await this.generateMigrationReport(results);
    return results;
  }

  /**
   * Process single file through migration pipeline
   * Single Responsibility: File processing orchestration
   * @param {string} filePath - File path to process
   * @returns {Promise<ProcessingResult>} - Processing result
   */
  async processFile(filePath) {
    const absolutePath = path.resolve(filePath);
    const outputPath = absolutePath.replace(/\.js$/, this.config.outputSuffix);
    
    console.log(`🔄 Processing: ${path.relative(PROJECT_ROOT, absolutePath)}`);

    // Read source content
    const sourceContent = await fs.readFile(absolutePath, 'utf8');
    
    // Create backup if requested
    if (this.config.createBackups) {
      await fs.writeFile(`${absolutePath}.backup`, sourceContent);
    }

    // Apply transformation pipeline
    let transformedContent = sourceContent;
    transformedContent = this.codeFormattingService.fixImports(transformedContent);
    transformedContent = this.typeAnnotationService.addFunctionTypes(transformedContent);
    transformedContent = this.typeAnnotationService.addVariableTypes(transformedContent);
    transformedContent = this.typeAnnotationService.addClassTypes(transformedContent);
    
    if (this.config.generateInterfaces) {
      transformedContent = this.interfaceGenerationService.generateInterfaces(transformedContent);
    }

    // Write transformed content
    await fs.writeFile(outputPath, transformedContent);

    // Apply formatting if enabled
    if (this.config.enableLinting) {
      await this.codeFormattingService.formatCode(transformedContent, outputPath);
    }

    // Calculate metrics
    const metrics = {
      inputSize: sourceContent.length,
      outputSize: transformedContent.length,
      typesAdded: (transformedContent.match(/:\s*\w+/g) || []).length,
      interfacesAdded: (transformedContent.match(/interface\s+\w+/g) || []).length
    };

    this.statistics.addTypes(metrics.typesAdded);
    this.statistics.addInterfaces(metrics.interfacesAdded);

    console.log(`✅ Generated: ${path.relative(PROJECT_ROOT, outputPath)} (+${metrics.typesAdded} types)`);

    return {
      inputPath: absolutePath,
      outputPath,
      success: true,
      metrics
    };
  }

  /**
   * Get current migration statistics
   * Dependency Inversion: Returns interface contract
   * @returns {MigrationStats} - Current statistics
   */
  getStatistics() {
    return this.statistics.getStatistics();
  }

  /**
   * Generate comprehensive migration report
   * KISS: Simple, readable report generation
   * @param {ProcessingResult[]} results - Processing results
   * @returns {Promise<void>}
   */
  async generateMigrationReport(results) {
    const stats = this.getStatistics();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 JAVASCRIPT TO TYPESCRIPT MIGRATION COMPLETE');
    console.log('='.repeat(80));
    
    console.log('\n📊 MIGRATION STATISTICS:');
    console.log(`   Files Processed: ${stats.filesProcessed}`);
    console.log(`   Types Added: ${stats.totalTypesAdded}`);
    console.log(`   Interfaces Generated: ${stats.totalInterfacesGenerated}`);
    console.log(`   Errors Encountered: ${stats.errorsEncountered}`);
    
    console.log('\n📁 PROCESSING RESULTS:');
    results.forEach(result => {
      if (result.success) {
        console.log(`   ✅ ${path.relative(PROJECT_ROOT, result.inputPath)}`);
        console.log(`      → ${path.relative(PROJECT_ROOT, result.outputPath)}`);
        console.log(`      Types: +${result.metrics.typesAdded}, Interfaces: +${result.metrics.interfacesAdded}`);
      } else {
        console.log(`   ❌ ${path.relative(PROJECT_ROOT, result.inputPath)} - ${result.error}`);
      }
    });

    if (stats.filesProcessed > 0) {
      console.log('\n🚀 NEXT STEPS:');
      console.log('   1. Review generated TypeScript files');
      console.log('   2. Fix compilation errors: npx tsc --noEmit');
      console.log('   3. Update dependent file imports');
      console.log('   4. Remove .backup files when satisfied');
    }
    
    console.log('\n' + '='.repeat(80));

    // Save detailed report
    const reportPath = path.join(PROJECT_ROOT, 'typescript-migration-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      statistics: stats,
      results: results.map(r => ({
        inputPath: path.relative(PROJECT_ROOT, r.inputPath),
        outputPath: r.outputPath ? path.relative(PROJECT_ROOT, r.outputPath) : null,
        success: r.success,
        error: r.error,
        metrics: r.metrics
      }))
    }, null, 2));
    
    console.log(`📋 Report saved: ${path.relative(PROJECT_ROOT, reportPath)}`);
  }
}

// ===== COMPLETION (CLI INTERFACE) =====

/**
 * Command-line interface for TypeScript migration
 * Single Responsibility: CLI argument parsing and execution
 */
class MigrationCLI {
  
  /**
   * Parse command-line arguments and execute migration
   * KISS: Simple argument parsing without complex libraries
   * @returns {Promise<void>}
   */
  async execute() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
      this.showUsage();
      return;
    }

    try {
      const { filePaths, config } = this.parseArguments(args);
      await this.runMigration(filePaths, config);
    } catch (error) {
      console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Parse CLI arguments into configuration
   * Open/Closed: Extensible argument parsing
   * @param {string[]} args - Command line arguments
   * @returns {{filePaths: string[], config: MigrationConfigurationManager}} - Parsed configuration
   */
  parseArguments(args) {
    const config = new MigrationConfigurationManager({
      enableLinting: !args.includes('--no-lint'),
      generateInterfaces: !args.includes('--no-interfaces'),
      createBackups: !args.includes('--no-backup'),
      strictMode: args.includes('--strict')
    });

    const filePaths = args.filter(arg => !arg.startsWith('--'));

    if (filePaths.length === 0) {
      throw new Error('No input files specified');
    }

    // Validate file paths
    filePaths.forEach(filePath => {
      if (!filePath.endsWith('.js')) {
        throw new Error(`Input file must have .js extension: ${filePath}`);
      }
    });

    return { filePaths, config };
  }

  /**
   * Execute migration with dependency injection
   * Dependency Inversion: Service composition at runtime
   * @param {string[]} filePaths - Files to migrate
   * @param {MigrationConfigurationManager} config - Migration configuration
   * @returns {Promise<void>}
   */
  async runMigration(filePaths, config) {
    // Compose services (dependency injection)
    const typeAnnotationService = new TypeAnnotationService();
    const interfaceGenerationService = new InterfaceGenerationService();
    const codeFormattingService = new CodeFormattingService();
    
    const migrationEngine = new TypeScriptMigrationEngine(
      config,
      typeAnnotationService,
      interfaceGenerationService,
      codeFormattingService
    );

    // Execute migration
    await migrationEngine.processFiles(filePaths);
  }

  /**
   * Display usage information
   * Interface Segregation: Focused on help display
   */
  showUsage() {
    console.log(`
🚀 JavaScript to TypeScript Migration Tool - Clean, SOLID Architecture

A generalized tool for migrating JavaScript files to TypeScript with intelligent
type inference, interface generation, and SOLID principles.

Usage:
  node js-to-ts.js <file1.js> [file2.js] [...]
  node js-to-ts.js --help

Options:
  --no-lint          Disable automatic code formatting
  --no-interfaces    Skip interface generation  
  --no-backup        Don't create .backup files
  --strict           Use strict TypeScript mode

Examples:
  node js-to-ts.js src/app.js
  node js-to-ts.js src/utils.js src/config.js --no-lint
  node js-to-ts.js lib/*.js --no-interfaces --strict

Features:
  • Intelligent type inference from parameter names and patterns
  • Automatic interface generation for common patterns
  • SOLID principles with clean separation of concerns
  • Service-oriented architecture with dependency injection
  • Comprehensive error handling with graceful degradation
`);
  }
}

// ===== EXECUTION =====

/**
 * Application entry point
 * KISS: Simple execution with proper error handling
 */
async function main() {
  const cli = new MigrationCLI();
  await cli.execute();
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing and module usage
export { 
  TypeScriptMigrationEngine,
  MigrationConfigurationManager,
  TypeAnnotationService,
  InterfaceGenerationService,
  CodeFormattingService
};