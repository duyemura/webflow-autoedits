---
name: page-pricing
description: Build a Pricing/Membership page for a gym site. Anchors value before revealing price, removes the "too expensive" objection, and makes the free trial feel like the obvious next step.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the Pricing page. This is the most anxiety-inducing page for prospects. They expect to feel judged or pressured. Subvert that completely — lead with value, normalize the investment, and make the trial feel totally free and safe.

## The job of this page

Answer: "Is this worth it for someone like me?" The prospect is comparing you to Planet Fitness at $10/month. Don't compete on price — compete on value, outcomes, and what they actually get.

## The pricing page psychology

1. **Anchor high before you show price.** Lead with what they get, not what it costs.
2. **The comparison is wrong.** They're not comparing you to a cheap gym — they're comparing you to doing nothing. Reframe it.
3. **Remove the risk.** Free trial = no reason not to try. Say it clearly.
4. **No contracts = freedom.** Lead with this if true.

## Section order and reasoning

### 1. Page Hero
- Reframe the investment before they see numbers
- Good: "Invest in the Only Body You'll Ever Have"
- Good: "Less Than $5 a Day to Show Up as a Different Person"
- Good: "No Contracts. No Commitment. Just Results."
- Bad: "Membership Pricing" (announces that this page will be stressful)
- Subheading: "Start with a free class. No credit card. No obligation. Just come see if this is for you."

### 2. Highlights section — What Every Member Gets
- heading: "What's Included in Every Membership"
- 4–6 cards. Do NOT list facility features. List outcomes and support:
  - "Unlimited Classes — Come as often as you like. The more you show up, the better it works."
  - "A Coach Who Knows Your Name — Not a trainer you see once. A coach at every class."
  - "Workouts Scaled to You — Modified for injuries, beginners, and athletes on the same floor."
  - "The Accountability You've Been Missing — Members who expect to see you. Coaches who notice when you don't show up."
  - "No Contracts, Cancel Anytime — We earn your membership every month."
  - "Free Intro Session — Your first visit is always free. Always."

### 3. FAQ section — The Real Pricing Objections
- heading: "Membership Questions"
- Must answer ALL of these:
  1. "Why is it more expensive than a regular gym?" — answer directly: "Because a regular gym gives you equipment. We give you coaching, accountability, and a community. That's why it works."
  2. "Is there a contract?" — no/yes, be honest
  3. "Can I freeze my membership?" — yes/no
  4. "What if I travel a lot?" — address this
  5. "Can I try before I commit?" — YES, free trial, link to booking
  6. "Do you offer student/military/couple discounts?" — answer or say "ask us"

### 4. CTA band
- heading: "Still thinking about it? Your first class is free."
- Subheading: "No credit card. No pressure. Come see what the fuss is about."
- Button: "Claim My Free Class" → booking_url

## Common mistakes to avoid
- Showing price tiers before anchoring value (leads with anxiety)
- Complex tier structures with confusing add-ons
- Not mentioning the free trial prominently — it's the biggest objection-remover you have
- "Affordable pricing" — means nothing, says nothing
- Not answering "why is it more expensive?" — the prospect is thinking it, address it head-on

## Note on actual pricing

If the gym has shared membership prices, include them. If not, create a "Contact us for current pricing" section or leave a [PRICE] placeholder. Don't make up numbers.

## Build instructions

1. Read site data:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config and list_pages to show me gym name, booking URL, and any pricing info in site config\"}]}"
```

2. Build full page:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build]\"}]}"
```

3. After building, flag: "Add real membership prices to the highlights section — or say 'ask us' if pricing varies."
