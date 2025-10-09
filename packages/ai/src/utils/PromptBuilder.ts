/**
 * Prompt engineering utilities for structured prompt construction
 */

import {
  PromptTemplate,
  ChatMessage,
  ValidationError
} from '../interfaces';
import { WorkspaceUtils } from '@car-finder/services';
import * as fs from 'fs';
import * as path from 'path';

/**
 * System message types for different AI tasks
 */
export enum SystemMessageType {
  VEHICLE_ANALYSIS = 'vehicle_analysis',
  COMMUNICATION_ASSISTANT = 'communication_assistant',
  DATA_VALIDATION = 'data_validation',
  GENERAL_ASSISTANT = 'general_assistant'
}

/**
 * Prompt builder for structured prompt construction
 */
export class PromptBuilder {
  private static configCache: Record<string, string> = {};
  private static configLoaded: boolean = false;

  private systemMessage: string = '';
  private context: Record<string, any> = {};
  private instructions: string[] = [];
  private examples: Array<{ input: string; output: string }> = [];
  private constraints: string[] = [];

  /**
   * Load system prompts from search-config.json
   */
  private static loadSystemPrompts(): Record<string, string> {
    if (this.configLoaded) {
      return this.configCache;
    }

    const configPath = WorkspaceUtils.resolveProjectFile('search-config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    this.configCache = config.analysisSettings?.systemPrompts || {};
    this.configLoaded = true;
    return this.configCache;
  }

  /**
   * Set system message
   */
  public setSystemMessage(message: string): PromptBuilder {
    this.systemMessage = message;
    return this;
  }

  /**
   * Set system message by type (loads from search-config.json)
   */
  public setSystemMessageByType(type: SystemMessageType): PromptBuilder {
    const systemPrompts = PromptBuilder.loadSystemPrompts();

    this.systemMessage = systemPrompts[type] || '';

    if (!this.systemMessage) {
      throw new ValidationError(
        `System prompt not found for type: ${type}. Check search-config.json.`,
        'systemMessageType'
      );
    }

    return this;
  }

  /**
   * Add context information
   */
  public addContext(key: string, value: any): PromptBuilder {
    this.context[key] = value;
    return this;
  }

  /**
   * Set multiple context values
   */
  public setContext(context: Record<string, any>): PromptBuilder {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Add instruction
   */
  public addInstruction(instruction: string): PromptBuilder {
    this.instructions.push(instruction);
    return this;
  }

  /**
   * Add multiple instructions
   */
  public addInstructions(instructions: string[]): PromptBuilder {
    this.instructions.push(...instructions);
    return this;
  }

  /**
   * Add example
   */
  public addExample(input: string, output: string): PromptBuilder {
    this.examples.push({ input, output });
    return this;
  }

  /**
   * Add constraint
   */
  public addConstraint(constraint: string): PromptBuilder {
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add multiple constraints
   */
  public addConstraints(constraints: string[]): PromptBuilder {
    this.constraints.push(...constraints);
    return this;
  }

  /**
   * Build the final prompt
   */
  public build(userPrompt: string): string {
    const sections: string[] = [];

    // System message
    if (this.systemMessage) {
      sections.push(`SYSTEM: ${this.systemMessage}`);
    }

    // Context
    if (Object.keys(this.context).length > 0) {
      sections.push('CONTEXT:');
      for (const [key, value] of Object.entries(this.context)) {
        sections.push(`${key}: ${this.formatContextValue(value)}`);
      }
    }

    // Instructions
    if (this.instructions.length > 0) {
      sections.push('INSTRUCTIONS:');
      this.instructions.forEach((instruction, index) => {
        sections.push(`${index + 1}. ${instruction}`);
      });
    }

    // Examples
    if (this.examples.length > 0) {
      sections.push('EXAMPLES:');
      this.examples.forEach((example, index) => {
        sections.push(`Example ${index + 1}:`);
        sections.push(`Input: ${example.input}`);
        sections.push(`Output: ${example.output}`);
      });
    }

    // Constraints
    if (this.constraints.length > 0) {
      sections.push('CONSTRAINTS:');
      this.constraints.forEach((constraint, index) => {
        sections.push(`- ${constraint}`);
      });
    }

    // User prompt
    sections.push('USER REQUEST:');
    sections.push(userPrompt);

    return sections.join('\n\n');
  }

  /**
   * Build conversation messages
   */
  public buildConversation(userPrompt: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // System message as first message
    if (this.systemMessage) {
      messages.push({
        role: 'model',
        content: this.systemMessage
      });
    }

    // Build context and instructions as user message
    const contextSections: string[] = [];

    if (Object.keys(this.context).length > 0) {
      contextSections.push('CONTEXT:');
      for (const [key, value] of Object.entries(this.context)) {
        contextSections.push(`${key}: ${this.formatContextValue(value)}`);
      }
    }

    if (this.instructions.length > 0) {
      contextSections.push('INSTRUCTIONS:');
      this.instructions.forEach((instruction, index) => {
        contextSections.push(`${index + 1}. ${instruction}`);
      });
    }

    if (this.constraints.length > 0) {
      contextSections.push('CONSTRAINTS:');
      this.constraints.forEach((constraint) => {
        contextSections.push(`- ${constraint}`);
      });
    }

    if (contextSections.length > 0) {
      messages.push({
        role: 'user',
        content: contextSections.join('\n\n')
      });
    }

    // Examples as conversation
    this.examples.forEach((example) => {
      messages.push({
        role: 'user',
        content: example.input
      });
      messages.push({
        role: 'model',
        content: example.output
      });
    });

    // User prompt
    messages.push({
      role: 'user',
      content: userPrompt
    });

    return messages;
  }

  /**
   * Format context value for display
   */
  private formatContextValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  /**
   * Reset builder
   */
  public reset(): PromptBuilder {
    this.systemMessage = '';
    this.context = {};
    this.instructions = [];
    this.examples = [];
    this.constraints = [];
    return this;
  }

  /**
   * Clone builder
   */
  public clone(): PromptBuilder {
    const clone = new PromptBuilder();
    clone.systemMessage = this.systemMessage;
    clone.context = { ...this.context };
    clone.instructions = [...this.instructions];
    clone.examples = [...this.examples];
    clone.constraints = [...this.constraints];
    return clone;
  }

  /**
   * Create a builder for vehicle analysis
   */
  public static forVehicleAnalysis(): PromptBuilder {
    return new PromptBuilder()
      .setSystemMessageByType(SystemMessageType.VEHICLE_ANALYSIS)
      .addConstraints([
        'Provide objective, fact-based analysis',
        'Include specific reasoning for recommendations',
        'Consider market conditions and vehicle history',
        'Highlight both positive and negative aspects'
      ]);
  }

  /**
   * Create a builder for communication assistance
   */
  public static forCommunication(): PromptBuilder {
    return new PromptBuilder()
      .setSystemMessageByType(SystemMessageType.COMMUNICATION_ASSISTANT)
      .addConstraints([
        'Maintain professional and respectful tone',
        'Be clear and concise',
        'Consider cultural context if specified',
        'Provide actionable communication strategies'
      ]);
  }

  /**
   * Create a builder for data validation
   */
  public static forDataValidation(): PromptBuilder {
    return new PromptBuilder()
      .setSystemMessageByType(SystemMessageType.DATA_VALIDATION)
      .addConstraints([
        'Identify specific data inconsistencies',
        'Explain the significance of any issues found',
        'Suggest concrete improvements',
        'Prioritize issues by severity'
      ]);
  }
}

/**
 * Template manager for reusable prompts
 */
export class TemplateManager {
  private templates: Map<string, PromptTemplate> = new Map();

  /**
   * Register a template
   */
  public registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  public getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Apply template with variables
   */
  public applyTemplate(id: string, variables: Record<string, string>): string {
    const template = this.templates.get(id);
    if (!template) {
      throw new ValidationError(`Template not found: ${id}`, 'templateId');
    }

    let result = template.template;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    // Check for unreplaced variables
    const unreplacedVars = result.match(/\{\{(\w+)\}\}/g);
    if (unreplacedVars) {
      throw new ValidationError(
        `Unreplaced template variables: ${unreplacedVars.join(', ')}`,
        'templateVariables'
      );
    }

    return result;
  }

  /**
   * List all templates
   */
  public listTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  public getTemplatesByCategory(category: string): PromptTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category === category);
  }

  /**
   * Create default templates for car finder
   */
  public static createDefault(): TemplateManager {
    const manager = new TemplateManager();

    // Vehicle analysis template
    manager.registerTemplate({
      id: 'vehicle-analysis',
      name: 'Vehicle Analysis',
      category: 'analysis',
      template: `Analyze this vehicle listing and provide a comprehensive evaluation:

Vehicle Details:
{{vehicleDetails}}

Please provide:
1. Market value assessment
2. Condition evaluation based on available information
3. Potential concerns or red flags
4. Purchase recommendation with reasoning

Format your response as structured analysis with clear sections.`,
      variables: ['vehicleDetails'],
      description: 'Comprehensive vehicle analysis template'
    });

    // Message drafting template
    manager.registerTemplate({
      id: 'seller-message',
      name: 'Seller Message',
      category: 'communication',
      template: `Draft a professional message to a car seller with the following details:

Vehicle: {{vehicleTitle}}
Purpose: {{messagePurpose}}
Additional Context: {{additionalContext}}

The message should be:
- Polite and professional
- Clear about intent
- Include relevant questions
- Appropriate for the context`,
      variables: ['vehicleTitle', 'messagePurpose', 'additionalContext'],
      description: 'Template for drafting messages to car sellers'
    });

    return manager;
  }
}
