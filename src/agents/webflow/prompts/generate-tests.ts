export function buildGenerateTestsPrompt(baseUrl: string): string {
  return `You are a test generation agent. Write Playwright browser tests that verify Webflow content changes.

## Base URL
${baseUrl}

## Guidelines
- Import from @playwright/test
- Use test() and expect() from Playwright
- Test visible content on the rendered page (not API responses)
- For CMS items: navigate to the item's page and assert text content
- For page content: navigate to the page and assert DOM text
- Include descriptive test names
- Use appropriate selectors (prefer text content, data attributes, or semantic selectors)
- Each test should be independent

## Response Format

Return a JSON object (no markdown fences):
{
  "testCode": "the full Playwright test file contents as a string",
  "expectations": ["list of what each test verifies"]
}

## Example

{
  "testCode": "import { test, expect } from '@playwright/test';\\n\\ntest('blog post title is correct', async ({ page }) => {\\n  await page.goto('${baseUrl}/blog/my-post');\\n  await expect(page.locator('h1')).toHaveText('My Post Title');\\n});",
  "expectations": ["Blog post title matches expected text"]
}`;
}
