import { IFeature } from './IFeature';

/**
 * Adapter pattern interface for integrating features with CLI and MCP
 * Provides a unified interface for feature interaction across different contexts
 */
export interface IFeatureAdapter<TInput = any, TOutput = any> {
  /**
   * The feature this adapter is for
   */
  feature: IFeature;

  /**
   * Adapt feature for CLI usage
   * @returns CLI command definition
   */
  adaptForCLI(): ICLICommand;

  /**
   * Adapt feature for MCP tool usage
   * @returns MCP tool definition
   */
  adaptForMCP(): IMCPTool;

  /**
   * Transform input from CLI/MCP format to feature format
   * @param input The input in CLI/MCP format
   * @param source The source of the input ('cli' or 'mcp')
   * @returns Transformed input for the feature
   */
  transformInput(input: TInput, source: AdapterSource): Promise<any>;

  /**
   * Transform output from feature format to CLI/MCP format
   * @param output The output from the feature
   * @param target The target format ('cli' or 'mcp')
   * @returns Transformed output
   */
  transformOutput(output: any, target: AdapterSource): Promise<TOutput>;

  /**
   * Validate input before transformation
   * @param input The input to validate
   * @param source The source of the input
   * @returns Validation result
   */
  validateInput(input: TInput, source: AdapterSource): ValidationResult;

  /**
   * Get usage examples for the feature
   * @param target The target context ('cli' or 'mcp')
   * @returns Usage examples
   */
  getUsageExamples(target: AdapterSource): IUsageExample[];

  /**
   * Handle errors from the feature
   * @param error The error that occurred
   * @param context The context in which the error occurred
   * @returns Formatted error response
   */
  handleError(error: Error, context: AdapterContext): IAdapterError;
}

/**
 * CLI command definition
 */
export interface ICLICommand {
  /**
   * Command name
   */
  name: string;

  /**
   * Command aliases
   */
  aliases?: string[];

  /**
   * Command description
   */
  description: string;

  /**
   * Command options
   */
  options?: ICLIOption[];

  /**
   * Command arguments
   */
  arguments?: ICLIArgument[];

  /**
   * Subcommands
   */
  subcommands?: ICLICommand[];

  /**
   * Command handler
   */
  handler: (args: any, options: any) => Promise<any>;
}

/**
 * CLI option definition
 */
export interface ICLIOption {
  /**
   * Option name
   */
  name: string;

  /**
   * Short option flag (e.g., 'v' for -v)
   */
  short?: string;

  /**
   * Option description
   */
  description: string;

  /**
   * Option type
   */
  type: 'boolean' | 'string' | 'number' | 'array';

  /**
   * Default value
   */
  default?: any;

  /**
   * Whether the option is required
   */
  required?: boolean;

  /**
   * Allowed values for enum-like options
   */
  choices?: any[];
}

/**
 * CLI argument definition
 */
export interface ICLIArgument {
  /**
   * Argument name
   */
  name: string;

  /**
   * Argument description
   */
  description: string;

  /**
   * Whether the argument is required
   */
  required?: boolean;

  /**
   * Whether the argument is variadic (accepts multiple values)
   */
  variadic?: boolean;

  /**
   * Default value
   */
  default?: any;
}

/**
 * MCP tool definition
 */
export interface IMCPTool {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Input schema
   */
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  /**
   * Tool handler
   */
  handler: (input: any) => Promise<any>;
}

/**
 * Adapter source/target
 */
export type AdapterSource = 'cli' | 'mcp';

/**
 * Adapter context
 */
export interface AdapterContext {
  /**
   * Source of the request
   */
  source: AdapterSource;

  /**
   * User or session ID
   */
  userId?: string;

  /**
   * Request ID for tracing
   */
  requestId?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether the input is valid
   */
  valid: boolean;

  /**
   * Validation errors
   */
  errors?: IValidationError[];

  /**
   * Validation warnings
   */
  warnings?: IValidationWarning[];
}

/**
 * Validation error
 */
export interface IValidationError {
  /**
   * Field that failed validation
   */
  field: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Error code
   */
  code?: string;
}

/**
 * Validation warning
 */
export interface IValidationWarning {
  /**
   * Field with warning
   */
  field: string;

  /**
   * Warning message
   */
  message: string;

  /**
   * Warning code
   */
  code?: string;
}

/**
 * Usage example
 */
export interface IUsageExample {
  /**
   * Example title
   */
  title: string;

  /**
   * Example description
   */
  description?: string;

  /**
   * Example command or input
   */
  example: string;

  /**
   * Expected output
   */
  output?: string;
}

/**
 * Adapter error
 */
export interface IAdapterError {
  /**
   * Error code
   */
  code: string;

  /**
   * Error message
   */
  message: string;

  /**
   * User-friendly error message
   */
  userMessage?: string;

  /**
   * Suggested actions
   */
  suggestions?: string[];

  /**
   * Error details
   */
  details?: any;

  /**
   * Stack trace (only in development)
   */
  stack?: string;
}