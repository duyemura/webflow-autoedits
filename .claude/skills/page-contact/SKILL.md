---
name: page-contact
description: Build a Contact/Location page for a gym site. Removes all friction to visiting, calling, or booking. Makes the gym feel welcoming before they arrive.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the Contact page. Most gyms treat this as an afterthought — address, phone, done. That's wrong. This page is often the last thing a prospect sees before deciding to show up. Make it feel warm and easy.

## The job of this page

Answer: "How do I get there, and what happens when I do?" Remove every logistical objection. Make showing up feel safe.

## Section order and reasoning

### 1. Page Hero
- Short, warm, directional — not sales-y
- Good: "Come Find Us — We'd Love to Show You Around"
- Good: "We're Right Here. Come Say Hi."
- Bad: "Contact Iron Forge CrossFit" (cold, corporate)
- Subheading: "Drop in during open hours or book a quick tour. No commitment, no pressure."
- NO CTA button needed — the whole page is the CTA

### 2. Contact section (auto-renders from site_config)
- heading: "Find Us"
- This section type pulls address, phone, email, hours, Google Maps URL automatically
- No items needed — just the section row

### 3. Highlights section — "What to Expect When You Arrive"
- heading: "Your First Visit"
- 3 cards that remove the anxiety of walking in cold:
  1. Title: "Just Show Up" — body: "No gear, no experience required. Come in whatever you'd normally wear to the gym — we'll take care of the rest."
  2. Title: "You'll Meet a Coach First" — body: "Every new visitor gets a quick 1:1 with one of our coaches. We'll learn your goals and make sure you feel confident before your first class."
  3. Title: "Nothing to Prove" — body: "Everyone here was a beginner once. Our members are the most welcoming part of what we do."

### 4. FAQ section — "Visiting Questions"
- heading: "Before You Come In"
- Must answer:
  1. "Is parking easy?" — be specific (street, lot, free/paid)
  2. "Do I need to book ahead or can I walk in?" — be clear
  3. "What should I bring?" — keep it simple
  4. "Is there a changing room / shower?" — answer honestly
  5. "Can I bring a friend?" — yes, make it sound fun

### 5. CTA band
- heading: "Rather talk first? We're happy to answer any questions."
- Button: "Book a Free Intro Call" → booking_url

## Common mistakes to avoid
- Just an address with no warmth — feels like a Google listing, not a welcome
- No "what to expect" content — first-timers are anxious, address it
- No parking info — this kills walk-ins
- Generic FAQs ("What are your hours?") — hours are already in the contact section, don't repeat

## Build instructions

1. Read site data:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config and list_pages to show me address, phone, email, hours, city, and booking URL\"}]}"
```

2. Build full page — create_page, sections, nav_item, rebuild:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build with all sections and copy]\"}]}"
```

3. Suggest: "Add a 'Visit Us' link in the homepage footer nav."
