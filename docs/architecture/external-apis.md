# External APIs

## Google Gemini API

- **Purpose:** All LLM operations (scoring, analysis, reports, communication assistant)
- **Documentation:** https://ai.google.dev/docs
- **Authentication:** API Key via `GEMINI_API_KEY` environment variable
- **Rate Limits:** Free tier: 15 RPM, 1M TPM, 1,500 RPD

**Integration Requirements:**
- All calls must route through `packages/ai` abstraction layer
- Implement retry logic for rate limit errors
- Cache results in database to minimize API usage
- Never expose API key to frontend

