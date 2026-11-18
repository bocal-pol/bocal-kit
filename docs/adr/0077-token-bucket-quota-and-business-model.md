# ADR 0077 — Token bucket quota and business model per application

- **Status**: accepted
- **Date**: 2026-11-18

## Context

The "Rate limiting" rule in the resilience checklist (ADR 0006) says that every public endpoint
must be protected. It does not say how. The Laravel `throttle` middleware and `Limit::perMinute()`
use a **fixed window**. A user who calls just before and just after the window boundary gets almost
2X calls in a short time, although the published limit is X.

Also, `sales-offers-agent` only handles zones that are already paid. Nothing says how to decide
that an application is free, partly paid, or fully paid, or where that choice is declared. A choice
left in the code of each application differs from one application to the next.

## Decision

### 1. Quota with a token bucket (or GCRA)

A per-user usage limit (X uses per period Y) is built as follows:

- The bucket holds a maximum of **X tokens**. Each call uses one token.
- **One token returns every Y/X** time units (not X tokens every Y).
- A full bucket allows a burst of X calls. After that, the rate is smoothed to X per Y.
- The bucket state is **shared and atomic** (Redis, Lua script, or equivalent). Never keep one
  counter per instance. GCRA is equivalent and stores one timestamp per key.

Do not use a fixed window for a business quota. The native `throttle` stays acceptable as a raw
protection against abuse (for example, login attempts).

### 2. Three business model levels, declared per application

| Level | Role | Access |
| --- | --- | --- |
| **Fully free** | Attract and retain users | All functions are free. Advertising to paid applications is allowed. |
| **Freemium** | Let users discover, then convert | Free functions, quota functions, and functions reserved for paid access. |
| **Fully paid** | Generate revenue | All access is paid. |

The level is chosen **per application, during alignment** (seventh axis of `upfront-alignment`).
Never choose it during development.

### 3. An administration backend declares everything

The application level, the access level of each function (free, quota with X and Y, reserved), and
the advertising setup (internal or third-party network, provider, placements) are **declared in an
administration backend**. They are not hard-coded. A plan change needs no deployment.

**The location of this backend is not imposed.** The agent asks the user through `AskUserQuestion`
where to put it: in the application, in an existing rights or authentication service, or in a
dedicated service. Several teams use this repository. No rule names a specific service.

### 4. Mandatory constraints

- **Server-side enforcement only.** Hiding a button protects nothing. The API checks the right and
  the quota on each call.
- **Rights service unreachable.** Use a short cache of the rights (defined duration). Then use an
  explicit default: minimal free access, never full access.
- **A paywall is a response, not an error.** The API returns a readable code (`quota_exhausted`,
  `upgrade_required`), the date of the next token, and the proposed action. The 3-part error message
  rule (ADR 0005) applies. The "what to do" part is the paid offer.
- **No loss on expiry.** An expired subscription keeps read access to the user data, and export.
  This matches the GDPR portability right.
- **Third-party advertising.** Load it only with "marketing" consent (see the "Cookie policy"
  rule). Internal advertising without trackers is always possible.

### 5. Sales policies

`sales-offers-agent` applies eleven policies to each proposal: value before price, three tiers at
most with one recommended, tax-inclusive prices for consumers, no dark patterns (cancelling is as
easy as subscribing), one proposal per screen, honesty about limits, a reminder before renewal,
honest retention once only, price changes with notice, a remembered refusal, and a costed proposal
with a stated assumption. The detail is in the agent. The right of withdrawal, the terms of sale,
and refunds stay in `legal-pages`. The agent proposes. It never acts without approval.

### Completion criteria

A restricted function is "done" only when an automated test proves two things. First, a user
without the right receives a server-side refusal. Second, an empty bucket gives the readable
response with the date of the next token.

## Deferred topics (decide later)

These topics are left out of the rule on purpose, to keep it short. Remind the user when the
subject comes back:

5. **Conversion measurement** from advertising to the paid application (consent is needed if the
   collection identifies the person).
6. **Advertising cap per user** (a token bucket applied to advertisements).
7. **Free trial** of the paid functions (a larger starting quota, then decreasing).
8. **Protection against circumvention** with several accounts (privacy trade-off).

## Positive consequences

- No double burst at the window boundary. The load is smoothed.
- A plan change needs no deployment.
- The free, freemium, or paid choice is explicit and made early.

## Negative consequences / risks

- The native `throttle` is not enough. A custom Redis limiter must be written and tested.
- Dependency on the rights service. Its failure reduces the experience (covered by the cache and
  the default behavior).
- The shared state adds a Redis dependency to each limited call.

## Alternatives ruled out

- **Fixed or simple sliding window.** Double burst at the boundary (fixed) or high memory cost
  (logged sliding window). Ruled out for a business quota.
- **Rights coded in each application.** Divergence between applications is certain. Ruled out.
- **One imposed location for the backend.** Several teams share the repository. Ruled out. The
  question is asked to the user.

## Scope

Every API or application with limited or paid functions. Complements
[ADR 0006](0006-resilience-under-load.md) (rate limiting) and
[ADR 0005](0005-error-messages-3-parts.md) (error messages). It does not apply to internal tools
without access tiers.
