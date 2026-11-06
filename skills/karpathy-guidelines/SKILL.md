---
name: karpathy-guidelines
description: "Behavioral guardrails to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code — avoid overcomplication, make surgical changes, state assumptions explicitly, define verifiable success criteria. Auto-invoke on: code review, refactoring, over-engineering, \"keep it simple\", \"only touch what's necessary\"."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: high
scope: cross
dependencies: []
conflicts: []
license: MIT
---

# Karpathy Guidelines

Behavioral guardrails to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on the pitfalls of LLM coding.

**Trade-off:** these rules favor caution over speed. For trivial tasks, use judgment.

## 1. Think before coding

**Don't assume. Don't paper over confusion. Surface trade-offs.**

Before implementing:
- State your assumptions explicitly. When in doubt, ask.
- If multiple interpretations exist, present them — don't silently pick one.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity first

**The minimum code that solves the problem. Nothing speculative.**

- No feature beyond what was asked for.
- No abstraction for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for scenarios that can't happen.
- If you write 200 lines when 50 would do, rewrite.

Ask yourself: "Would a senior engineer call this overcomplicated?" If yes, simplify.

## 3. Surgical changes

**Touch only what's strictly necessary. Clean up only your own mess.**

When modifying existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor what isn't broken.
- Respect the existing style, even if you'd do it differently.
- If you spot unrelated dead code, flag it — don't remove it.

When your changes create orphans:
- Remove imports / variables / functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line must trace directly back to the user's request.

## 4. Goal-driven execution

**Define success criteria. Loop until verified.**

Turn tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Make sure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria allow autonomous looping. Weak criteria ("make it work") demand constant clarification.

## 5. Strict TDD

**The failing test comes before the code that passes it.**

- Write the failing test before touching the code.
- See it fail **for the expected reason** — a failure for some other reason (broken import, typo) doesn't count as the test doing its job.
- Make the smallest change that passes it.
- If an honest test is impractical (unmockable external dependency, irreversible side effect), don't write a bad test just to check the box — say so explicitly and propose manual verification instead.

A test that would still pass if the function returned nothing tests nothing: discard it.

## 6. Architecture — domain, boundaries, idempotence

**Make illegal state impossible to represent, not just unreachable.**

- **Model the domain**: structure types so an invalid state can't be constructed, rather than validating after the fact. Keep a glossary of business terms if the existing code is already clear and local, leave it as is.
- **Boundary discipline**: validate data at its entry point; trust it on the inside. Keep business logic in a pure function, with no hidden side effects.
- **Typing discipline**: make an illegal value impossible to write rather than checking it at runtime; parse external data once, at the boundary; never silence the compiler/linter with a convenience cast or `any`.
- **Idempotent operations**: re-running an operation — or resuming it after a mid-way crash — must land on the same final state. Relevant to every webhook, queue job, migration, or payment endpoint.
- **Shared state**: if two flows don't need the same mutable data, give each its own copy. If they do, allow only one writer and enforce it in the structure, not by convention.

---

> Sections 1-4 adapted from [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) — MIT license.
> Sections 5-6 adapted from [`ub-mode`](https://github.com/unclebob/ub-mode) (Robert C. Martin) — MIT license.
