---
name: page-about
description: Build an About/Our Story page for a gym site. Builds trust through founder story, coach personality, and values. Makes prospects feel connected before they arrive.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the About page. Most gyms write this like a LinkedIn profile — mission statement, list of certifications, founding year. Nobody cares. People join gyms because of other people. Make it personal.

## The job of this page

Answer: "Who are these people and can I trust them with my body and goals?" The prospect is looking for a reason to believe. Give them humans, not a company.

## Section order and reasoning

### 1. Page Hero
- Lead with a founder story hook or a belief statement, not a history lesson
- Good: "We Built the Gym We Couldn't Find"
- Good: "We Got Tired of Gyms That Treated Members Like Numbers"
- Good: "Started in a Garage. Still the Same Coaches."
- Bad: "About Iron Forge CrossFit — Founded in 2018"
- Subheading: One sentence on the founding belief: "We believe the right coach changes everything — and we built this place to prove it."

### 2. Highlights section — The Origin / What We Stand For
- heading: "Why We Built This"
- 3–4 cards on VALUES, not amenities or features:
  - Good: Title: "Coaches Who Stay" — body: "Our average coach tenure is 4 years. They know your name, your injury history, and your PR."
  - Good: Title: "No One Gets Lost" — body: "We cap class sizes at 12. If you're struggling, we'll notice before you do."
  - Good: Title: "Progress Over Performance" — body: "We don't care if you're the fittest person in the room. We care if you're fitter than you were last month."
  - Bad: "State of the art equipment" / "Convenient parking" — these are not values

### 3. Features section — The Coaches
- heading: "The People You'll Train With"
- One card per coach (use items type: feature):
  - Title: Coach name
  - short_body: NOT their cert list. A 1–2 sentence story: "Jake spent 6 years competing in Olympic weightlifting before he realized he got more satisfaction from coaching his first-timer's first pull-up. He's been here since day one."
  - If no coach data exists, create placeholder cards with instruction to fill in

### 4. CTA band
- heading: "Come meet us. No gym clothes required."
- Button: "Book a Free Intro Call" → booking_url

## Common mistakes to avoid
- Founding year as the lede — nobody cares it was 2016
- Certification lists as personality — "NSCA-CPT, CrossFit L2, FMS" tells me nothing about whether I'll like you
- Mission statements written by committee — "We are committed to empowering our members to achieve their fitness goals in a supportive environment" says nothing
- Stock photos of random athletes — if you use images, make them real people from your gym

## Copy rule for coach bios

Formula: [What they did before] + [Why they started coaching] + [What they care about with members]

Example:
> "Sarah competed in powerlifting for 8 years before a knee injury shifted her focus to coaching. She's obsessed with helping members lift heavy without getting hurt — and she'll correct your squat form before you even notice she's watching."

## Build instructions

1. Read site data and any existing coach/team content:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config, list_pages, and get_content for items to show me gym name, any coach or team data, and booking URL\"}]}"
```

2. Build full page — if no coach data exists, create placeholder feature cards with [Coach Name], [Coach Story] as content and note they need to be filled in:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build]\"}]}"
```

3. Suggest: "Update each coach card with real names and stories — this is the highest-trust content on your site."
