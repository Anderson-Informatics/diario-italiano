## Backward-Compatible Phased Writing Review

Implement a writing-focused AI review system that adapts by learner stage while preserving the current payload contract, saved data, and dashboard behavior. No database migration is required because existing review fields remain mandatory and new writing fields are optional.

### Execution Phases

1. Phase 1: Contract Definition
2. Define one additive review contract with optional writing metadata.
3. Keep legacy required sections unchanged so older entries and dashboards remain valid.
4. Add optional sections for strengths, ranked priorities, dimension scores, tags, model rewrite, follow-up task, and learner phase.

1. Phase 2: Validation and Persistence
2. Extend validation to allow optional writing fields while still enforcing legacy required fields.
3. Update persistence schema to accept an optional writing subdocument.
4. Ensure save and read APIs pass through enriched review data unchanged.

1. Phase 3: Prompt and Generation Logic
2. Update the AI prompt to produce phase-based writing feedback with strict limits by level.
3. Always return legacy sections.
4. Always prioritize meaning-blocking issues first.

1. Phase 4: Frontend Rendering
2. Extend shared types for optional writing fields.
3. Render new sections when present and gracefully fallback when absent.
4. Show phase and top priorities clearly.

1. Phase 5: Compatibility Guardrails
2. Keep stats and tips logic based on existing correction categories.
3. Do not change dashboard response shape.
4. Optionally collect writing tags for future analytics without exposing breaking changes.

1. Phase 6: Test and Rollout
2. Add unit, API, and UI tests for both legacy-only and enriched review shapes.
3. Add phase-output contract tests for prompt responses.
4. Run manual QA across A, B, and C sample entries.

### Acceptance Criteria by Learner Phase

1. Phase A (A1-A2)
2. Exactly 2 strengths and at most 2 priority fixes.
3. Focus on clarity, core syntax, and essential tense control.
4. Model rewrite uses simple, high-frequency structures.

1. Phase B (B1-B2)
2. Exactly 2 strengths and up to 3 ranked priorities.
3. Priorities include cohesion, tense consistency, and register choice.
4. At least one discourse-level writing target is present.

1. Phase C (C1-C2)
2. Include nuance, style alternatives, and genre/register precision.
3. Avoid over-correcting valid stylistic choices.
4. Include at least one advanced alternative phrasing strategy.

### Cross-Phase Safety Criteria

1. Meaning-blocking issues appear first.
2. Missing optional writing fields never break rendering or validation.
3. Legacy dashboards and saved tips remain unchanged.
4. Existing stored reviews render correctly.

### Promotion and Regression Rules

1. Promote after 3 consecutive entries meeting current phase pass gates.
2. If 2 consecutive entries miss baseline, reduce feedback complexity for one cycle.
3. Store phase in optional review metadata or derive it from the CEFR estimate without changing legacy requirements.

### Relevant Files

1. server/models/JournalEntry.ts
2. server/utils/review.ts
3. app/types/index.ts
4. app/components/ReviewResults.vue
5. server/api/entries/[id].put.ts
6. server/utils/stats.ts

### Verification

1. Validator accepts legacy payloads and enriched payloads.
2. Review generation rejects malformed enriched fields.
3. Enriched reviews round-trip through save and fetch APIs.
4. Enriched fields render and legacy-only entries still render without warnings.
5. Dashboard response shape and counts remain unchanged.