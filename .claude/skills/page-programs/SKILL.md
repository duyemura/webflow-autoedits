---
name: page-programs
description: Build a Programs/Classes page for a gym site. Sells outcomes not features, drives trial bookings from people who are comparison shopping.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the Programs page — the page prospects visit when they're actively comparing gyms. Your job is to make every program feel like the answer to their specific problem, then make it trivial to book a trial.

## The job of this page

A prospect lands here because they want to know: "Is there something here for someone like me?" They're not asking about your equipment or certifications. They're asking: "Will I get results? Will I fit in? Is it worth it?"

Every program description must answer those three questions.

## Section order and reasoning

### 1. Page Hero
- Headline: Speak to the person who doesn't know where to start
- Good: "Every Program Is Built Around Your Goals — Not Ours"
- Good: "From Total Beginner to Competitive Athlete — We Have a Track for You"
- Bad: "Our Programs" (boring, no promise)
- Subheading: "Not sure which is right for you? Book a free intro call — we'll map it out together."
- CTA: "Find My Program" → booking_url

### 2. Programs section
- heading: "What We Offer"
- Each program card MUST follow this formula:
  - Title = the outcome or identity: "Get Strong" not "Strength Training"
  - short_body = who it's for + the result: "For members who want to add real muscle and move without pain. You'll hit new PRs within 8 weeks."
  - cta_text = "Learn More" or "Try a Class Free"
- Pull existing programs from the site, rewrite to outcome-first

### 3. Steps section
- heading: "How to Get Into Any Program"
- Reuse from homepage or create:
  1. "Book a Free Intro" — "15 minutes with a coach. No gym clothes needed, no commitment."
  2. "Get Your Game Plan" — "We match you to the right program and build your first month."
  3. "Show Up and Track It" — "Most members feel the difference in week one."

### 4. FAQ section
- heading: "Program Questions"
- Must answer:
  1. "I'm not fit enough for [program X]" — reassure, every program scales
  2. "Can I switch programs?" — yes, coaches will guide you
  3. "How long until I see results?" — be specific, give a real number
  4. "Do I need equipment/experience?" — no
  5. "What if I've tried this before and quit?" — address shame directly

### 5. CTA band
- heading: "Still not sure? Let's figure it out together."
- Button: "Book a Free Intro Call" → booking_url

## Common mistakes to avoid
- Listing programs by method ("HIIT", "CrossFit") instead of outcome
- Generic descriptions that could apply to any gym
- No social proof ("300 members trust these programs")
- Missing the "not fit enough" objection — it's the #1 reason people don't join

## Build instructions

1. Read existing site data:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config, list_pages, and get_content for items (type program) to show me the gym name, booking URL, and existing programs\"}]}"
```

2. Build the full page in one chat call — create_page, then create_content for each section with full copy, then add nav_item, then rebuild_site:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build instructions with all section content]\"}]}"
```

3. Report what was built and suggest internal links to add.
