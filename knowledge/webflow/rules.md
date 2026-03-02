# Webflow Agent Rules

## CMS Content
- Always validate that the target collection exists before attempting edits
- Preserve existing field values when updating — only change fields mentioned in the ticket
- Use slug-friendly formatting for any new slugs (lowercase, hyphens, no special chars)

## CMS Collection Patterns (Default Template Behavior)
These rules apply to all sites using our standard Webflow templates. They can be overridden by site-specific rules in knowledge/webflow/site-specific/{siteId}.md.

### FAQ Collections
- FAQ items are "sets" — each item holds multiple Q&A pairs in numbered fields (question-1 through question-N, answer-1 through answer-N)
- The field named "answer" (no number) is typically "Question 1" — confusing naming convention, be aware
- The field named "answer-1" is typically "Answer 1"
- Templates are usually bound to a SPECIFIC FAQ set item (e.g. "Main FAQS") — creating new FAQ items will NOT appear on the page
- ALWAYS add new questions to available slots in the EXISTING FAQ set rather than creating a new item
- Before adding, list existing items and find which one the template uses (usually the published, non-draft item with the most content)
- If all slots are full, flag for human review rather than creating a new item that won't render

### General CMS Pattern
- Many CMS collections follow this "set" pattern where one item contains multiple sub-entries in numbered fields
- Always inspect existing items to understand the data pattern before creating vs updating
- Prefer updating existing items over creating new ones unless the ticket explicitly asks to create a new entry
- Check which items are actually rendered on the page by comparing published items with page content

## Page Content
- Never modify page structure — only update text content and attributes
- Verify the target element exists before attempting changes

## Publishing
- Always publish to staging (webflow.io) first, never directly to production
- Check for recent publishes to avoid redundant publish calls
