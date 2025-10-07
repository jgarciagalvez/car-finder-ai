/**
 * Response validation utilities for AI operations
 */

import { 
  AIResponse, 
  GenerationSchema, 
  ValidationError,
  ChatMessage 
} from '../interfaces';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Response validator for AI operations
 */
export class ResponseValidator {
  
  /**
   * Validate AI response structure
   */
  public static validateAIResponse(response: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!response) {
      errors.push('Response is null or undefined');
      return { isValid: false, errors, warnings };
    }

    if (typeof response.content !== 'string') {
      errors.push('Response content must be a string');
    }

    if (response.content && response.content.trim() === '') {
      warnings.push('Response content is empty');
    }

    if (typeof response.model !== 'string') {
      errors.push('Response model must be a string');
    }

    // Validate usage information if present
    if (response.usage) {
      if (typeof response.usage !== 'object') {
        errors.push('Usage information must be an object');
      } else {
        if (response.usage.promptTokens !== undefined && 
            (typeof response.usage.promptTokens !== 'number' || response.usage.promptTokens < 0)) {
          errors.push('Prompt tokens must be a non-negative number');
        }

        if (response.usage.completionTokens !== undefined && 
            (typeof response.usage.completionTokens !== 'number' || response.usage.completionTokens < 0)) {
          errors.push('Completion tokens must be a non-negative number');
        }

        if (response.usage.totalTokens !== undefined && 
            (typeof response.usage.totalTokens !== 'number' || response.usage.totalTokens < 0)) {
          errors.push('Total tokens must be a non-negative number');
        }
      }
    }

    // Validate finish reason if present
    if (response.finishReason !== undefined) {
      const validReasons = ['stop', 'length', 'content_filter', 'function_call'];
      if (!validReasons.includes(response.finishReason)) {
        errors.push(`Invalid finish reason: ${response.finishReason}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate JSON against schema
   */
  public static validateJSON(data: any, schema: GenerationSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      this.validateAgainstSchema(data, schema, '', errors);
    } catch (error) {
      errors.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data against schema recursively
   */
  private static validateAgainstSchema(
    data: any, 
    schema: GenerationSchema, 
    path: string, 
    errors: string[]
  ): void {
    const currentPath = path || 'root';

    // Type validation
    switch (schema.type) {
      case 'object':
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          errors.push(`${currentPath}: Expected object, got ${typeof data}`);
          return;
        }

        // Validate required properties
        if (schema.required) {
          for (const requiredProp of schema.required) {
            if (!(requiredProp in data)) {
              errors.push(`${currentPath}: Missing required property '${requiredProp}'`);
            }
          }
        }

        // Validate properties
        if (schema.properties) {
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if (propName in data) {
              this.validateAgainstSchema(
                data[propName], 
                propSchema, 
                `${currentPath}.${propName}`, 
                errors
              );
            }
          }
        }
        break;

      case 'array':
        if (!Array.isArray(data)) {
          errors.push(`${currentPath}: Expected array, got ${typeof data}`);
          return;
        }

        // Validate array items
        if (schema.items) {
          data.forEach((item, index) => {
            this.validateAgainstSchema(
              item, 
              schema.items!, 
              `${currentPath}[${index}]`, 
              errors
            );
          });
        }
        break;

      case 'string':
        if (typeof data !== 'string') {
          errors.push(`${currentPath}: Expected string, got ${typeof data}`);
        }
        break;

      case 'number':
        if (typeof data !== 'number' || isNaN(data)) {
          errors.push(`${currentPath}: Expected number, got ${typeof data}`);
        }
        break;

      case 'boolean':
        if (typeof data !== 'boolean') {
          errors.push(`${currentPath}: Expected boolean, got ${typeof data}`);
        }
        break;

      default:
        errors.push(`${currentPath}: Unknown schema type '${schema.type}'`);
    }
  }

  /**
   * Validate chat messages array
   */
  public static validateChatMessages(messages: ChatMessage[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(messages)) {
      errors.push('Messages must be an array');
      return { isValid: false, errors, warnings };
    }

    if (messages.length === 0) {
      errors.push('Messages array cannot be empty');
      return { isValid: false, errors, warnings };
    }

    messages.forEach((message, index) => {
      if (!message) {
        errors.push(`Message at index ${index} is null or undefined`);
        return;
      }

      if (!['user', 'model'].includes(message.role)) {
        errors.push(`Message at index ${index} has invalid role: ${message.role}`);
      }

      if (typeof message.content !== 'string') {
        errors.push(`Message at index ${index} content must be a string`);
      }

      if (message.content && message.content.trim() === '') {
        warnings.push(`Message at index ${index} has empty content`);
      }
    });

    // Check conversation flow
    if (messages[0].role !== 'user') {
      warnings.push('Conversation should typically start with a user message');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate prompt content
   */
  public static validatePrompt(prompt: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof prompt !== 'string') {
      errors.push('Prompt must be a string');
      return { isValid: false, errors, warnings };
    }

    if (prompt.trim() === '') {
      errors.push('Prompt cannot be empty');
      return { isValid: false, errors, warnings };
    }

    if (prompt.length > 100000) {
      errors.push('Prompt exceeds maximum length of 100,000 characters');
    }

    if (prompt.length < 3) {
      warnings.push('Prompt is very short, consider providing more context');
    }

    // Check for potential issues
    if (prompt.includes('\0')) {
      warnings.push('Prompt contains null characters which may cause issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize text content
   */
  public static sanitizeText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/\0/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  }

  /**
   * Extract JSON from text response
   */
  public static extractJSON(text: string): { json: any; success: boolean; error?: string } {
    try {
      // Try to parse as-is first
      const parsed = JSON.parse(text);
      return { json: parsed, success: true };
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return { json: parsed, success: true };
        } catch (error) {
          return { 
            json: null, 
            success: false, 
            error: `Failed to parse extracted JSON: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }

      // Try to find JSON-like content
      const jsonLikeMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonLikeMatch) {
        try {
          const parsed = JSON.parse(jsonLikeMatch[1]);
          return { json: parsed, success: true };
        } catch (error) {
          return { 
            json: null, 
            success: false, 
            error: `Failed to parse JSON-like content: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }

      return { 
        json: null, 
        success: false, 
        error: 'No valid JSON found in response' 
      };
    }
  }
}
