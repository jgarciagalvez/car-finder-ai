# AI Prompt Definitions

This directory contains markdown-based AI prompt definitions following BMAD-style agent patterns. Prompts are versioned artifacts that can be iterated independently of code.

## Prompt Organization

Each prompt file defines a specific AI analysis task:

- **personal-fit-score.md** - Analyzes how well a vehicle fits user criteria (0-10 score)
- **priority-rating.md** - Synthesizes all data into an overall priority rating (0-10)
- **mechanic-report.md** - Provides model-specific mechanical insights and inspection points
- **sanity-check.md** - Flags inconsistencies between structured data and descriptions

## Prompt Template Format

All prompts follow this standard structure:

```markdown
<!-- AI Prompt Definition: [Prompt Name] -->

# [Prompt Name]

## Agent Role
[Define the AI's persona and expertise]

## Task
[Clear description of what the AI needs to accomplish]

## Input Schema
```json
{
  "field": "type and description"
}
```

## Instructions
1. [Step-by-step analysis instructions]
2. [Specific considerations]
3. [Quality criteria]

## Scoring Rubric (if applicable)
- **9-10**: [Excellent criteria]
- **7-8**: [Good criteria]
- **5-6**: [Average criteria]
- **3-4**: [Below average criteria]
- **1-2**: [Poor criteria]
- **0**: [Unacceptable criteria]

## Output Format
```json
{
  "field": "expected output structure"
}
```

## Example
### Input
[Example input data]

### Output
[Expected output for example]
```

## Versioning Strategy

### Version Control
- All prompt changes are tracked in Git
- Commit messages should describe what changed and why
- Use descriptive commit messages: "Improve personal-fit-score rubric for luxury cars"

### Breaking Changes
If a prompt change requires code changes:
1. Update the prompt file
2. Update the AIService code to handle new response format
3. Update tests to reflect new behavior
4. Document the change in this README

### Prompt Iteration
Prompts can be tuned without code changes if:
- Output format schema remains the same
- Only wording, examples, or instructions change
- Response structure is compatible with existing parsing logic

## Testing Prompts

### Manual Testing
Test prompts with real Gemini API:
```bash
# Run analysis on a single vehicle
npm run analyze -- --vehicle-id <id>
```

### Validation Checklist
- [ ] Prompt follows standard template format
- [ ] All required sections present (Role, Task, Output Format)
- [ ] Output Format is valid JSON schema
- [ ] Instructions are clear and unambiguous
- [ ] Examples demonstrate expected behavior
- [ ] AI responses match expected format consistently

## Best Practices

### Writing Effective Prompts
1. **Be specific**: Clearly define the AI's role and task
2. **Provide examples**: Show desired input/output pairs
3. **Define constraints**: Set boundaries on what the AI should/shouldn't do
4. **Use structured output**: Request JSON for easy parsing
5. **Include rubrics**: For scoring tasks, define clear criteria

### Common Pitfalls
- Vague instructions leading to inconsistent responses
- Missing output format schema causing parsing errors
- Overly complex prompts that confuse the AI
- No examples to anchor expected behavior

## Maintenance

### When to Update Prompts
- AI responses don't match expectations
- New vehicle data fields need to be considered
- User feedback suggests improvements
- Quality of analysis can be improved

### Review Process
1. Identify prompt that needs improvement
2. Make changes in a feature branch
3. Test with real vehicle data
4. Validate output quality manually
5. Commit and merge if improved

## References

- [BMAD Core Documentation](https://github.com/badass-courses/bmad-core)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Story 2.3 Requirements](../../../docs/stories/2.3.story.md)
