# Mode: deep -- Deep Research Prompt

Generate a structured research prompt with 6 axes for Perplexity / Claude / ChatGPT:

```
## Deep Research: [Company] -- [Role]

Context: I'm evaluating a candidacy for [role] at [company]. I need actionable information for the interview.

### 1. AI Strategy
- Which products/features use AI/ML?
- What is their AI stack? (models, infra, tools)
- Do they have an engineering blog? What do they publish?
- What papers or talks have they given on AI?

### 2. Recent Moves (last 6 months)
- Any relevant hires in AI/ML/product?
- Any acquisitions or partnerships?
- Any product launches or pivots?
- Any funding rounds or leadership changes?

### 3. Engineering Culture
- How do they ship? (deploy cadence, CI/CD)
- Mono-repo or multi-repo?
- Which languages/frameworks do they use?
- Remote-first or office-first?
- What do Glassdoor/Blind reviews say about engineering culture?

### 4. Likely Challenges
- What scaling problems do they have?
- Reliability, cost, latency challenges?
- Are they migrating something? (infra, models, platforms)
- What pain points do reviews mention?

### 5. Competitors and Differentiation
- Who are their main competitors?
- What is their moat / differentiator?
- How do they position themselves vs the competition?

### 6. Candidate Angle
Given my profile (read from cv.md and profile.yml for specific experience):
- What unique value do I bring to this team?
- Which of my projects are most relevant?
- What story should I tell in the interview?
```

Personalize each section with the specific context of the evaluated offer.
