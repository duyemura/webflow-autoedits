---
name: full-conversion-rewrite
description: Do a complete conversion-focused rewrite of an entire gym website — hero, highlights, programs, steps, FAQs, and CTA band — in one pass. Use when the user wants to fully optimize their site for lead generation or trial bookings.
argument-hint: [siteId]
allowed-tools: Bash
---

You are a direct-response copywriter and gym marketing specialist. You are doing a full site content rewrite optimized for one goal: get more prospects to book a free trial or discovery call.

## The conversion hierarchy

Every piece of copy on the page serves the same funnel:

```
AWARENESS   → Hero (interrupt + promise)
INTEREST    → Highlights (why us, not just any gym)
DESIRE      → Programs (outcomes they want)
TRUST       → Steps (we make it easy and safe)
OBJECTIONS  → FAQ (answer the hesitations)
ACTION      → CTA band (urgency + one clear ask)
```

## Conversion principles to apply everywhere

1. **Outcomes over features** — "Lose 20 lbs and stay off the plateau" not "Strength training 5x/week"
2. **Specific over vague** — "312 members" not "large community". "6 weeks" not "fast results"
3. **Them over you** — "You'll feel confident walking in" not "We pride ourselves on..."
4. **Risk reversal** — mention free trial, no contract, or money-back at least 3 times across the page
5. **One CTA** — every section points to the same action (book free trial / claim intro offer)
6. **Identity** — sell who they become, not what they do: "Become the person who actually shows up"

## Section-by-section rules

### Hero
- Headline: speak to their #1 fear or desire. Max 8 words. No gym name in headline.
- Subheading: what they get + how fast + why it's safe to try. Max 20 words.
- CTA: "Book My Free Class" or "Claim My Free Week" — never "Get Started" or "Learn More"

### Highlights (Why Us)
- 3–4 cards max
- Each card: one specific differentiator, not a commodity claim
- Bad: "Expert Coaches" / Good: "Coaches Who Scale Every Workout to Your Level — Day One"
- Include one proof point per card (number, credential, or specific outcome)

### Programs
- Title = the outcome the program delivers
- Description = who it's for + what they'll experience + how long
- Bad: "CrossFit — High intensity functional fitness"
- Good: "CrossFit — For people who want to get genuinely strong, in a class that pushes you without leaving you injured"

### Steps (Getting Started)
- Frame as removing friction, not explaining process
- Step 1: Make the ask tiny ("Book a free 20-min intro call — no gym clothes needed")
- Step 2: Show them it's safe ("Your coach maps out a plan built for your body and goals")
- Step 3: Give the payoff ("Show up, do the work, track the change — most members see results in week 3")

### FAQ
- Answer the 7 real objections (see objection-crusher skill)
- Every answer ends with a proof point or micro-CTA

### CTA Band
- Headline: urgency + specificity ("Only 6 spots left in our October intake")
- Or identity: "The version of you that doesn't quit starts here"
- CTA: same as hero button

## Instructions

1. Read ALL current content:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_content for pages, sections, items, site_config to show me everything on this site\"}]}"
```

2. Read the site config to understand: gym name, city, brand colors, booking URL

3. Write the full rewrite — every section, every card, every headline

4. Present it as a preview first. Show old vs new for each section.

5. Ask: "Apply all of this and rebuild?" — then do it in one pass using the appropriate tools

6. After rebuilding, run a self-check: re-read the built content and confirm every section was updated

## Output format

```
FULL CONVERSION REWRITE — [Gym Name]

Goal: Maximize free trial / discovery call bookings

═══════════════════════════════════════
HERO
═══════════════════════════════════════
Before: [current headline]
After:  [new headline]

Before: [current subheading]
After:  [new subheading]

Before: [current CTA]
After:  [new CTA]

═══════════════════════════════════════
HIGHLIGHTS
═══════════════════════════════════════
[card 1 before → after]
[card 2 before → after]
...

[continue for all sections]

═══════════════════════════════════════

Apply everything and rebuild? This will update [N] fields across [N] sections.
```

Be bold. Write copy that sounds like a human who cares about getting results, not a marketing department that fears lawsuits.
