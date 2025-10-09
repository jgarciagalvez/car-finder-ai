/**
 * PromptLoader - Loads and parses markdown-based AI prompt definitions
 *
 * Implements BMAD-style prompt organization where prompts are versioned markdown artifacts
 * rather than hardcoded strings. This enables:
 * - Iteration without recompilation
 * - Version control of prompt evolution
 * - Independent testing and validation
 * - Non-engineer collaboration
 */

import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceUtils } from '@car-finder/services';

import { GenerationSchema } from '../interfaces/types';

export interface ParsedPrompt {
  name: string;
  role: string;
  task: string;
  instructions: string[];
  inputSchema: object;
  outputFormat: GenerationSchema;
  scoringRubric?: string;
  examples?: Array<{ input: any; output: any }>;
  raw: string;
}

interface PromptCache {
  [key: string]: ParsedPrompt;
}

/**
 * PromptLoader - Loads and parses markdown-based prompt definitions
 */
export class PromptLoader {
  private static cache: PromptCache = {};
  private static promptsDir: string = path.join(WorkspaceUtils.findWorkspaceRoot(), 'packages/ai/src/prompts');

  /**
   * Load and parse a prompt from markdown file
   * @param promptName Name of the prompt file (without .md extension)
   * @returns Parsed prompt structure
   */
  static async loadPrompt(promptName: string): Promise<ParsedPrompt> {
    // Check cache first
    if (this.cache[promptName]) {
      return this.cache[promptName];
    }

    const filePath = path.join(this.promptsDir, `${promptName}.md`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Prompt file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = this.parsePromptMarkdown(content, promptName);

    // Validate required sections
    this.validatePrompt(parsed);

    // Cache the parsed prompt
    this.cache[promptName] = parsed;

    return parsed;
  }

  /**
   * Build a complete prompt by interpolating variables into the template
   * @param parsed Parsed prompt structure
   * @param variables Variables to interpolate into the prompt
   * @returns Complete prompt string ready for AI provider
   */
  static buildPrompt(parsed: ParsedPrompt, variables: Record<string, any>): string {
    let prompt = '';

    // Build prompt sections
    prompt += `# ${parsed.name}\n\n`;
    prompt += `## Role\n${parsed.role}\n\n`;
    prompt += `## Task\n${parsed.task}\n\n`;

    if (parsed.instructions.length > 0) {
      prompt += `## Instructions\n`;
      parsed.instructions.forEach((instruction, idx) => {
        prompt += `${idx + 1}. ${instruction}\n`;
      });
      prompt += '\n';
    }

    if (parsed.scoringRubric) {
      prompt += `## Scoring Rubric\n${parsed.scoringRubric}\n\n`;
    }

    // Add input data
    prompt += `## Input Data\n`;
    prompt += '```json\n';
    prompt += JSON.stringify(variables, null, 2);
    prompt += '\n```\n\n';

    // Add output format requirement
    prompt += `## Required Output Format\n`;
    prompt += '```json\n';
    prompt += JSON.stringify(parsed.outputFormat, null, 2);
    prompt += '\n```\n\n';
    prompt += 'Please respond with valid JSON matching the output format above.';

    return prompt;
  }

  /**
   * Parse markdown content into structured prompt
   * @param content Raw markdown content
   * @param promptName Name of the prompt
   * @returns Parsed prompt structure
   */
  private static parsePromptMarkdown(content: string, promptName: string): ParsedPrompt {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect code block start/end
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockType = line.trim().substring(3);
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          // Store code block with type marker
          currentContent.push(`\`\`\`${codeBlockType}\n${codeBlockContent.join('\n')}\n\`\`\``);
          codeBlockContent = [];
          codeBlockType = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Detect section headers (## Header)
      if (line.startsWith('## ') && !inCodeBlock) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }

        currentSection = line.substring(3).trim();
        currentContent = [];
      } else if (currentSection) {
        // Skip comment lines and empty initial lines
        if (!line.trim().startsWith('<!--') && !line.trim().endsWith('-->')) {
          currentContent.push(line);
        }
      }
    }

    // Save last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    // Extract structured data
    const parsed: ParsedPrompt = {
      name: promptName,
      role: sections['Agent Role'] || sections['Role'] || '',
      task: sections['Task'] || '',
      instructions: this.parseInstructions(sections['Instructions'] || ''),
      inputSchema: this.parseJsonFromSection(sections['Input Schema'] || '{}'),
      outputFormat: this.parseJsonFromSection(sections['Output Format'] || '{"type": "object"}') as GenerationSchema,
      scoringRubric: sections['Scoring Rubric'],
      examples: this.parseExamples(sections['Example'] || sections['Examples']),
      raw: content,
    };

    return parsed;
  }

  /**
   * Parse instructions section into array of instruction strings
   */
  private static parseInstructions(instructionsText: string): string[] {
    if (!instructionsText) return [];

    const instructions: string[] = [];
    const lines = instructionsText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Match numbered or bulleted list items
      const match = trimmed.match(/^(?:\d+\.|[-*])\s+(.+)$/);
      if (match) {
        instructions.push(match[1]);
      } else if (trimmed && instructions.length > 0) {
        // Continuation of previous instruction
        instructions[instructions.length - 1] += ' ' + trimmed;
      }
    }

    return instructions;
  }

  /**
   * Parse JSON from a section that contains a code block
   */
  private static parseJsonFromSection(sectionContent: string): object {
    try {
      // Extract content between ```json and ```
      const jsonMatch = sectionContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // Try parsing the whole section as JSON
      return JSON.parse(sectionContent.trim());
    } catch (e) {
      // Return empty object if parsing fails
      return {};
    }
  }

  /**
   * Parse examples section
   */
  private static parseExamples(examplesText?: string): Array<{ input: any; output: any }> | undefined {
    if (!examplesText) return undefined;

    const examples: Array<{ input: any; output: any }> = [];

    // Look for ### Input and ### Output subsections
    const inputMatches = examplesText.matchAll(/### Input\s*([\s\S]*?)(?=### Output|$)/g);
    const outputMatches = examplesText.matchAll(/### Output\s*([\s\S]*?)(?=### Input|$)/g);

    const inputs = Array.from(inputMatches);
    const outputs = Array.from(outputMatches);

    for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
      try {
        const inputJson = this.parseJsonFromSection(inputs[i][1]);
        const outputJson = this.parseJsonFromSection(outputs[i][1]);
        examples.push({ input: inputJson, output: outputJson });
      } catch (e) {
        // Skip malformed examples
        continue;
      }
    }

    return examples.length > 0 ? examples : undefined;
  }

  /**
   * Validate that prompt has required sections
   */
  private static validatePrompt(parsed: ParsedPrompt): void {
    const errors: string[] = [];

    if (!parsed.role || parsed.role.trim() === '') {
      errors.push('Missing required section: Agent Role or Role');
    }

    if (!parsed.task || parsed.task.trim() === '') {
      errors.push('Missing required section: Task');
    }

    if (!parsed.outputFormat || Object.keys(parsed.outputFormat).length === 0) {
      errors.push('Missing or invalid Output Format section');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid prompt definition for "${parsed.name}":\n${errors.join('\n')}`);
    }
  }

  /**
   * Clear the prompt cache (useful for testing)
   */
  static clearCache(): void {
    this.cache = {};
  }

  /**
   * Set custom prompts directory (useful for testing)
   * @param dir Relative path from workspace root or absolute path
   */
  static setPromptsDirectory(dir: string): void {
    if (path.isAbsolute(dir)) {
      this.promptsDir = dir;
    } else {
      this.promptsDir = path.join(WorkspaceUtils.findWorkspaceRoot(), dir);
    }
  }
}
