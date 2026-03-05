---
name: create-page
description: Create a new subpage for a gym site. Knows what sections, content, and internal links belong on contact, programs, about, pricing, and schedule pages. Use when the user asks to add a new page.
argument-hint: [siteId] [page-type]
allowed-tools: Bash
---

You are building a new page for a gym website. You know exactly what sections convert best on each page type, and you'll build the full page in one pass using the chat API.

## Page blueprints

Use these as your default structure. Adapt based on the site's existing content.

### contact
**Goal:** Get them to call, visit, or book — remove all friction
- Page: slug=`contact`, title="Contact Us", hero_headline="Come Find Us", hero_subheading="We'd love to show you around."
- Sections:
  1. `contact` section — heading: "Find Us" (auto-pulls from site_config: address, phone, email, hours, maps URL)
  2. `faq` section — heading: "Common Questions" — 3 FAQs about visiting: parking, what to wear, walk-ins welcome

### programs
**Goal:** Show every program as an outcome, drive trial bookings
- Page: slug=`programs`, title="Our Programs", hero_headline="Find Your Fit", hero_subheading="Every program is designed around your goals, not ours."
- Sections:
  1. `programs` section — heading: "What We Offer" — pull existing programs from homepage or create fresh cards
  2. `steps` section — heading: "How to Get Started" — pull from homepage steps
  3. `cta` section — heading: "Not sure which program is right for you?" (links to booking URL)

### about
**Goal:** Build trust and connection — make it personal
- Page: slug=`about`, title="Our Story", hero_headline="Built by Athletes. Coached by Coaches.", hero_subheading="We started this gym because we couldn't find the thing we were looking for."
- Sections:
  1. `highlights` section — heading: "What We Stand For" — 3–4 cards: values, not features
  2. `features` section — heading: "Our Coaches" — coach cards (title=name, body=credentials/story)
  3. `cta` section — heading: "Come see it for yourself."

### pricing
**Goal:** Remove the price objection — anchor high, make the trial feel free
- Page: slug=`pricing`, title="Membership Options", hero_headline="Invest in the Only Body You've Got", hero_subheading="No long-term contracts. Cancel anytime."
- Sections:
  1. `highlights` section — heading: "What's Included" — 3 cards: what every member gets
  2. `faq` section — heading: "Pricing Questions" — FAQs: Is there a contract? Can I try before I buy? What if I travel?
  3. `cta` section — heading: "Start with a free class. No credit card."

### schedule
**Goal:** Show them it fits their life
- Page: slug=`schedule`, title="Class Schedule", hero_headline="Find a Time That Works for You", hero_subheading="Classes 6 days a week, morning through evening."
- Sections:
  1. `contact` section — heading: "Weekly Hours" (shows hours from site_config)
  2. `cta` section — heading: "Ready to reserve your spot?"

## Instructions

Arguments: `$ARGUMENTS` (format: `siteId page-type`)

Parse: first arg = siteId, second arg = page type (contact, programs, about, pricing, schedule)

1. First, read the existing site to understand its content and tone:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$(echo $ARGUMENTS | cut -d' ' -f1)\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config and list_pages to show me the site name, tagline, and existing pages\"}]}"
```

2. Build the page using the blueprint above, adapted to the site's name and tone

3. Use the chat API to:
   - Call `create_page` with page details
   - Call `create_content` for each section (with `page_slug` set to the new page's slug)
   - Call `create_content` for a nav_item linking to the new page
   - Call `rebuild_site`

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$(echo $ARGUMENTS | cut -d' ' -f1)\", \"messages\": [{\"role\": \"user\", \"content\": \"Build a $(echo $ARGUMENTS | cut -d' ' -f2) page: [describe full page blueprint here with all sections and content]\"}]}"
```

4. Report what was created: page slug, sections added, nav item added, preview URL

## Output format

```
CREATED: [page type] page for [gym name]

URL:      /[slug]
Preview:  /api/sites/[siteId]/preview/[slug]

Sections built:
  ✓ [section type] — [heading]
  ✓ [section type] — [heading]
  ...

Nav item added: [label] → /[slug]

Internal links to add (suggested):
  - Homepage hero CTA → /[slug]
  - Homepage programs section → /programs
```

## Site map note

After creating any page, remind the user:
> "Tip: Say 'update the homepage hero CTA to link to /[slug]' to connect this page to your site navigation."
