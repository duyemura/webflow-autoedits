---
name: page-coaches
description: Build a Coaches/Team page for a gym site. The highest-trust page on the site — makes prospects feel connected to real humans before they walk in. Coach personality > coach credentials.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the Coaches page. Research shows that "will I like the coaches?" is one of the top 3 reasons people choose a gym. Most gyms waste this page on certification lists. You're going to make coaches feel like people worth training with.

## The job of this page

Answer: "Are these people I'd want in my corner?" The prospect is imagining themselves in a class with these coaches. Make that image positive, human, and specific.

## The trust equation for coaches

**Credentials** create baseline trust (they're not unqualified).
**Story** creates connection (they get where I'm coming from).
**Philosophy** creates confidence (they'll coach me the right way).

Most gym pages have credentials only. You need all three.

## Section order and reasoning

### 1. Page Hero
- Lead with a coaching philosophy, not a staff roster
- Good: "The Right Coach Changes Everything. Meet Ours."
- Good: "Our Coaches Have Been Where You Are. That's Why They're Good at This."
- Good: "Coaching Is Personal Here. These Are the People You'll Train With."
- Bad: "Meet Our Staff"
- Subheading: "Every coach at [Gym Name] was hired for one thing: the ability to make you better than you were yesterday."

### 2. Highlights — Coaching Philosophy
- heading: "How We Coach"
- 3–4 cards on philosophy (not bios — those come next):
  - "We Scale Everything" — "No workout is too advanced or too easy. Every coach modifies in real time, for every body in the room."
  - "We Remember Your Goals" — "Your coaches know why you're here. They'll remind you when you forget."
  - "We Coach, Not Just Count" — "There's a difference between a trainer who counts reps and a coach who watches your movement. Ours watch your movement."
  - "We Celebrate the Small Wins" — "Your first push-up matters as much as someone else's first muscle-up. We treat it that way."

### 3. Features — Individual Coach Cards
- heading: "Your Coaches"
- One card per coach (type: feature):
  - Title: [First Name] — [Specialty or Vibe] e.g. "Jake — Strength & Movement"
  - short_body: Bio using the formula: [Background] + [Why they coach] + [What they're known for with members]
  - Example: "Jake competed in Olympic weightlifting for 6 years before discovering he got more satisfaction from coaching a beginner's first deadlift than hitting his own PRs. Members describe his cues as 'the first time I actually understood what my body was doing.'"
- If no coach data: create 3 placeholder cards with [COACH NAME] and [COACH STORY] and flag them clearly

### 4. CTA band
- heading: "Want to meet the team before you commit?"
- Subheading: "Book a free intro call — no gym clothes, no pressure."
- Button: "Book a Free Intro" → booking_url

## Coach bio formula (for ghostwriting or placeholders)

**Template:**
> "[Name] [verb — competed/trained/worked] in [background] for [time] before [turning point — injury, life event, discovery]. [He/She/They] started coaching because [specific reason]. Members know [him/her/them] for [specific quality — a cue, an approach, a personality trait].

**Good example:**
> "Maria trained as a dancer for 12 years before a hip injury redirected her to strength training. She started coaching because she watched too many people train through pain instead of around it. Members know her for catching form breakdowns before they become injuries."

**Bad example:**
> "Maria has her CrossFit Level 2, USAW Sports Performance, and FMS certifications. She specializes in Olympic lifting and functional fitness."

## Common mistakes to avoid
- Certification lists as the primary bio content
- Headshots only, no personality
- Third-person formal bios that sound like HR wrote them
- Missing coaches who "just haven't had time to fill out their profile" — placeholder is better than absent

## Build instructions

1. Check for any existing coach/team content:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config, list_pages, and get_content for items to find any existing coach, team, or staff content and show me the gym name and booking URL\"}]}"
```

2. Build with slug `coaches` or `team`:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build]\"}]}"
```

3. After building, flag:
   - "Each coach card has placeholder text — replace with real stories for maximum conversion impact"
   - "Add real coach headshot URLs to the image_url field on each coach card once you have them"
