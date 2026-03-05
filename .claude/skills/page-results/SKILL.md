---
name: page-results
description: Build a Results/Transformations page for a gym site. Shows proof that works for real, relatable people — not just extreme transformations. Converts skeptics who need to see it to believe it.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the Results page. This is for the skeptic — the person who's been burned before, who's tried and quit, who doesn't believe they can change. Your job is to show them people who looked exactly like them, and what happened.

## The job of this page

Answer: "Can this work for someone like me?" Not "can this work?" — they've seen enough ads to know gyms claim results. The question is *for someone like me.*

## The biggest mistake on results pages

Showing only extreme transformations. A 100lb weight loss story is impressive but it signals to most prospects: "That's not me. That's not possible for me." You lose the middle — the person who wants to lose 20lbs, feel better, have more energy, keep up with their kids.

**Show the full spectrum:**
- The dramatic transformation (it exists, it's real)
- The steady progress story (most relatable)
- The non-scale victory (energy, confidence, strength, mental health)
- The "I just finally stuck to something" story

## Section order and reasoning

### 1. Page Hero
- Speak to the skeptic directly
- Good: "Real Members. Real Results. No Photoshop."
- Good: "We Don't Promise Miracles. We Promise to Show Up With You."
- Good: "If You've Tried Before and Quit, Read This."
- Bad: "Member Transformations" (sounds like a before/after Instagram)
- Subheading: "Every person on this page started where you are. Different goals, different timelines — same decision to start."

### 2. Highlights — The Types of Results Members Get
- heading: "What 'Results' Looks Like for Our Members"
- 4 cards covering different result types (not all weight loss):
  - "Lost the Weight They've Been Carrying for Years" — "Average member who trains 3x/week loses 14–22 lbs in their first 3 months. More importantly — they keep it off."
  - "Got Strong for the First Time in Their Life" — "Members who come in never having lifted a weight are deadlifting their bodyweight within 6 months. Consistently."
  - "Fixed the Pain They'd Learned to Live With" — "Back pain, knee pain, shoulder stiffness — coached movement fixes what sitting at a desk breaks."
  - "Finally Have a Routine That Sticks" — "Average member tenure at [Gym Name]: [X months/years]. Most gyms lose 80% of members in 3 months. We keep ours."

### 3. Features — Member Stories
- heading: "In Their Words"
- 4–6 individual story cards (type: feature):
  - Title: "[Name], [context — age, occupation, or goal]" e.g. "Jamie, 38, software engineer"
  - short_body: 2–3 sentence story using: [where they started] + [what changed] + [one specific result]
  - Example: "I joined at 38, overweight and convinced I'd left it too late. I told myself I'd try for 60 days. That was 2 years ago. I've lost 26 lbs, but what I didn't expect was how much better I'd sleep, how much more energy I'd have, how different I'd feel in my own skin."
  - If no real stories: use detailed, specific placeholders and flag them

### 4. FAQ — The Skeptic's Final Objections
- heading: "Still Not Sure?"
- Must answer:
  1. "What if I've tried this before and quit?" — address shame, explain why this is different (coaching, community, accountability)
  2. "What if my goals are different from what you show here?" — every result story is different, so is every plan
  3. "How long does it actually take to see results?" — be specific: "Most members notice energy changes in week 1–2. Visible physical changes typically 6–10 weeks."
  4. "What if I'm too far gone?" — counter this directly

### 5. CTA band
- heading: "Your result starts with one class."
- Button: "Book My Free Class" → booking_url
- Below button: "Free. No credit card. No pressure."

## Story formula for member cards

**Template:**
> "[Name] came to us [context — age, situation, previous attempts]. [He/She/They] wanted [goal]. [X time] later, [specific result — weight, strength, non-scale]. But what surprised [him/her/them] most was [unexpected benefit]."

**Specific > Vague:**
- Bad: "I feel so much better and have more energy"
- Good: "I used to take the elevator. Now I run up the stairs without thinking about it."

## Common mistakes to avoid
- Only showing dramatic before/after photos — alienates the average prospect
- Vague testimonials ("Great gym! Amazing coaches!") — no proof, no specificity
- All the same type of result — all weight loss, or all athletic performance
- No names or contexts — "Member" is unbelievable; "Sarah, 44, nurse" is real

## Build instructions

1. Read site data and any existing testimonial or social proof content:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config and list_pages to show me gym name, booking URL, and any existing testimonial or results content\"}]}"
```

2. Build with slug `results`:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build]\"}]}"
```

3. After building, flag:
   - "Member story cards have placeholder text — these are the most important content on this page to make real"
   - "Even 3 real, specific, named member stories will outperform 20 generic ones"
   - "Ask your best members for a 2–3 sentence story — most will say yes if you just ask"
