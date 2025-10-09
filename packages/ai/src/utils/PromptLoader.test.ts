/**
 * PromptLoader Unit Tests
 */

import { PromptLoader } from './PromptLoader';
import * as fs from 'fs';
import * as path from 'path';

describe('PromptLoader', () => {
  const testPromptsDir = path.join(__dirname, '__test-prompts__');

  beforeAll(() => {
    // Create test prompts directory
    if (!fs.existsSync(testPromptsDir)) {
      fs.mkdirSync(testPromptsDir, { recursive: true });
    }

    // Create a valid test prompt
    const validPrompt = `<!-- AI Prompt Definition: Test Prompt -->

# Test Analyzer

## Agent Role
You are a test analyzer with expertise in testing.

## Task
Analyze test data and provide structured output.

## Input Schema
\`\`\`json
{
  "testValue": "number - A test value",
  "testName": "string - Name of the test"
}
\`\`\`

## Instructions
1. Validate the input data
2. Perform analysis
3. Generate structured output

## Scoring Rubric
- **9-10**: Excellent
- **7-8**: Good
- **5-6**: Average
- **3-4**: Below average
- **1-2**: Poor

## Output Format
\`\`\`json
{
  "score": 8,
  "result": "test result"
}
\`\`\`

## Example
### Input
\`\`\`json
{
  "testValue": 42,
  "testName": "Sample Test"
}
\`\`\`

### Output
\`\`\`json
{
  "score": 9,
  "result": "Test passed successfully"
}
\`\`\`
`;

    fs.writeFileSync(path.join(testPromptsDir, 'test-prompt.md'), validPrompt);

    // Create an invalid prompt (missing required sections)
    const invalidPrompt = `<!-- AI Prompt Definition: Invalid Prompt -->

# Invalid Prompt

## Some Section
This prompt is missing required sections.
`;

    fs.writeFileSync(path.join(testPromptsDir, 'invalid-prompt.md'), invalidPrompt);

    // Set custom prompts directory for testing
    PromptLoader.setPromptsDirectory(testPromptsDir);
  });

  afterAll(() => {
    // Clean up test prompts directory
    if (fs.existsSync(testPromptsDir)) {
      fs.rmSync(testPromptsDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clear cache before each test
    PromptLoader.clearCache();
  });

  describe('loadPrompt', () => {
    it('should load and parse a valid prompt file', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');

      expect(parsed).toBeDefined();
      expect(parsed.name).toBe('test-prompt');
      expect(parsed.role).toContain('test analyzer');
      expect(parsed.task).toContain('Analyze test data');
      expect(parsed.instructions).toHaveLength(3);
      expect(parsed.inputSchema).toBeDefined();
      expect(parsed.outputFormat).toBeDefined();
      expect(parsed.scoringRubric).toBeDefined();
      expect(parsed.examples).toBeDefined();
      expect(parsed.examples).toHaveLength(1);
    });

    it('should cache loaded prompts', async () => {
      const firstLoad = await PromptLoader.loadPrompt('test-prompt');
      const secondLoad = await PromptLoader.loadPrompt('test-prompt');

      // Should return the same cached object
      expect(firstLoad).toBe(secondLoad);
    });

    it('should throw error for non-existent prompt file', async () => {
      await expect(PromptLoader.loadPrompt('non-existent')).rejects.toThrow(
        'Prompt file not found'
      );
    });

    it('should throw error for invalid prompt (missing required sections)', async () => {
      await expect(PromptLoader.loadPrompt('invalid-prompt')).rejects.toThrow(
        'Invalid prompt definition'
      );
    });

    it('should parse JSON schemas from code blocks', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');

      expect(parsed.inputSchema).toEqual({
        testValue: 'number - A test value',
        testName: 'string - Name of the test',
      });

      expect(parsed.outputFormat).toEqual({
        score: 8,
        result: 'test result',
      });
    });

    it('should parse instructions into array', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');

      expect(parsed.instructions).toEqual([
        'Validate the input data',
        'Perform analysis',
        'Generate structured output',
      ]);
    });

    it('should parse examples correctly', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');

      expect(parsed.examples).toHaveLength(1);
      expect(parsed.examples![0].input).toEqual({
        testValue: 42,
        testName: 'Sample Test',
      });
      expect(parsed.examples![0].output).toEqual({
        score: 9,
        result: 'Test passed successfully',
      });
    });
  });

  describe('buildPrompt', () => {
    it('should build a complete prompt with variables', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');

      const variables = {
        testValue: 100,
        testName: 'Integration Test',
      };

      const prompt = PromptLoader.buildPrompt(parsed, variables);

      expect(prompt).toContain('# Test Analyzer');
      expect(prompt).toContain('## Role');
      expect(prompt).toContain('test analyzer');
      expect(prompt).toContain('## Task');
      expect(prompt).toContain('## Instructions');
      expect(prompt).toContain('1. Validate the input data');
      expect(prompt).toContain('## Scoring Rubric');
      expect(prompt).toContain('## Input Data');
      expect(prompt).toContain('"testValue": 100');
      expect(prompt).toContain('"testName": "Integration Test"');
      expect(prompt).toContain('## Required Output Format');
      expect(prompt).toContain('Please respond with valid JSON');
    });

    it('should include scoring rubric if present', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');
      const prompt = PromptLoader.buildPrompt(parsed, {});

      expect(prompt).toContain('## Scoring Rubric');
      expect(prompt).toContain('9-10');
      expect(prompt).toContain('Excellent');
    });

    it('should handle empty variables', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');
      const prompt = PromptLoader.buildPrompt(parsed, {});

      expect(prompt).toContain('## Input Data');
      expect(prompt).toContain('{}');
    });

    it('should handle complex nested variables', async () => {
      const parsed = await PromptLoader.loadPrompt('test-prompt');

      const variables = {
        vehicle: {
          id: 'test-123',
          make: 'Toyota',
          model: 'Corolla',
          specs: {
            year: 2020,
            mileage: 50000,
          },
        },
      };

      const prompt = PromptLoader.buildPrompt(parsed, variables);

      expect(prompt).toContain('"id": "test-123"');
      expect(prompt).toContain('"make": "Toyota"');
      expect(prompt).toContain('"year": 2020');
    });
  });

  describe('clearCache', () => {
    it('should clear the prompt cache', async () => {
      // Load a prompt to populate cache
      await PromptLoader.loadPrompt('test-prompt');

      // Clear cache
      PromptLoader.clearCache();

      // Spy on fs.readFileSync to verify it's called again
      const readFileSpy = jest.spyOn(fs, 'readFileSync');

      // Load the same prompt again
      await PromptLoader.loadPrompt('test-prompt');

      // Should have read the file again (not from cache)
      expect(readFileSpy).toHaveBeenCalled();

      readFileSpy.mockRestore();
    });
  });

  describe('setPromptsDirectory', () => {
    it('should allow setting custom prompts directory', () => {
      const customDir = '/custom/path/to/prompts';
      PromptLoader.setPromptsDirectory(customDir);

      // Verify by trying to load from the custom directory
      // (will fail since directory doesn't exist, but that proves it's trying)
      expect(PromptLoader.loadPrompt('test')).rejects.toThrow();
    });
  });

  describe('parseInstructions', () => {
    it('should handle numbered list instructions', async () => {
      const testPrompt = `
## Agent Role
Test role

## Task
Test task

## Instructions
1. First instruction
2. Second instruction
3. Third instruction

## Output Format
\`\`\`json
{}
\`\`\`
`;

      fs.writeFileSync(path.join(testPromptsDir, 'numbered-list.md'), testPrompt);

      const parsed = await PromptLoader.loadPrompt('numbered-list');

      expect(parsed.instructions).toEqual([
        'First instruction',
        'Second instruction',
        'Third instruction',
      ]);
    });

    it('should handle bulleted list instructions', async () => {
      const testPrompt = `
## Agent Role
Test role

## Task
Test task

## Instructions
- First instruction
- Second instruction
- Third instruction

## Output Format
\`\`\`json
{}
\`\`\`
`;

      fs.writeFileSync(path.join(testPromptsDir, 'bulleted-list.md'), testPrompt);

      const parsed = await PromptLoader.loadPrompt('bulleted-list');

      expect(parsed.instructions).toEqual([
        'First instruction',
        'Second instruction',
        'Third instruction',
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle prompts with missing optional sections', async () => {
      const minimalPrompt = `
## Agent Role
Minimal role

## Task
Minimal task

## Output Format
\`\`\`json
{
  "result": "test"
}
\`\`\`
`;

      fs.writeFileSync(path.join(testPromptsDir, 'minimal-prompt.md'), minimalPrompt);

      const parsed = await PromptLoader.loadPrompt('minimal-prompt');

      expect(parsed.role).toBe('Minimal role');
      expect(parsed.task).toBe('Minimal task');
      expect(parsed.instructions).toEqual([]);
      expect(parsed.scoringRubric).toBeUndefined();
      expect(parsed.examples).toBeUndefined();
    });

    it('should handle malformed JSON in schemas', async () => {
      const malformedPrompt = `
## Agent Role
Test role

## Task
Test task

## Input Schema
\`\`\`json
{ invalid json }
\`\`\`

## Output Format
\`\`\`json
{}
\`\`\`
`;

      fs.writeFileSync(path.join(testPromptsDir, 'malformed-json.md'), malformedPrompt);

      const parsed = await PromptLoader.loadPrompt('malformed-json');

      // Should return empty object for malformed JSON
      expect(parsed.inputSchema).toEqual({});
    });
  });
});
