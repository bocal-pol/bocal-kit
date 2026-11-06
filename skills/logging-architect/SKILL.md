---
name: logging-architect
description: "Design and implementation of a structured application logging system — levels (debug/info/warn/error), JSON format, request_id/trace_id correlation between frontend and backend, mandatory PII masking, business audit trail distinct from technical logs, security event detection and alerting (OWASP A09 — brute-force, privilege escalation, non-repudiation, retention), shipping to an aggregator (ELK/Loki/Sentry/Datadog). Auto-invoke on: logging system, logging, log correlation, trace_id, request_id, audit trail, Monolog, log channel, structured log, PII masking in logs, Sentry, log aggregator, application observability, security alerting, intrusion detection, A09. Push this option as soon as a backend or frontend project is scaffolded without an explicit logging strategy, even if the user only asks to 'add some logs' or says 'I want to debug more easily'."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: high
scope: cross
dependencies:
  - context7-mcp
conflicts: []
---

# Logging Architect

`[Activated: Logging Architect]`

A log exists so that a person — not necessarily the one who wrote it, often a colleague at
3am during an incident — can understand what happened without rereading the source code. That's
the criterion that should decide every choice below: level, content, format. A log that can't be
searched, can't be tied to the request that produced it, or mixes harmless debug noise with a
real alert, doesn't fulfill that role — even if it exists.

This skill is invoked by `backend-agent` (Laravel/.NET) and `frontend-agent` (Angular/React) when a
project needs a logging strategy or the existing one needs an audit. It sets the shared doctrine
then routes to the relevant stack section.

## Optional input (if invoked from `backend-agent` or `frontend-agent`)

If framework + version + presence of a central aggregator (ELK/Loki/Sentry/Datadog/none) are
already known to the calling agent, skip Phase 1 and start at Phase 2 with the identified stack.

## Why a shared doctrine before code

Logging designed separately on the front and back ends systematically produces the same flaw: two
histories of the same user request that can't be tied together. The classic symptom is a bug
reported by a user, a frontend log showing a 500 error at 2:32pm, and ten thousand lines of
backend logs in the same minute with no way to know which one matches that specific user.
Correlation (Phase 3) isn't an optional refinement — it's what makes a log useful in production
rather than only in local development.

## Phase 1 — Context

```
Logging Architect — Context:
1. Stack:          [Laravel? .NET? Angular? React?]
2. Existing setup:  [nothing? ad hoc Console.log/dd() logs? Monolog already configured?]
3. Aggregator:     [ELK? Loki? Sentry? Datadog? none yet — local files]
4. Dominant need:   [development debugging, regulatory business audit, both]
5. Expected volume: [internal low-traffic app / public high-load app]
```

The answer to "dominant need" changes everything: a business audit trail (who changed what) and a
technical debug log (why a request failed) don't share the same lifecycle, retention, or
audience — see Phase 5.

## Phase 2 — Levels and what they mean

The value of a log level comes from its consistency: an `error` must always mean "someone needs
to act now or soon," never "by the way, here's some info." If a level can mean anything depending
on who wrote it, nobody can configure an alert on it without being drowned in false positives — and
that's precisely what pushes teams to ignore their own alerts.

| Level | Meaning | Triggers an alert? | Example |
|---|---|---|---|
| `debug` | Useful detail in dev, noise in prod | No — disabled by default in prod | Value of an intermediate variable |
| `info` | Normal business event | No | Order created, user logged in |
| `warning` | Abnormal but handled, to monitor | No, aggregated for trend | Retry succeeded after 1 failure, cache miss |
| `error` | An operation failed, user impact | Yes | Uncaught exception, DB write failure |
| `critical` | The service or a major dependency is down | Yes, immediate | Database unreachable, queue saturated |

Practical rule: if the team can't describe a concrete action to take when this log appears in
prod, it's not an `error` — at best it's a `warning`.

## Phase 3 — Structured format and correlation

### Why structured JSON rather than free text

A text message (`"Error creating order 42 for user 7"`) forces you to parse the message to
extract anything usable. A structured object makes every field queryable in the aggregator
without a fragile regex:

```json
{
  "timestamp": "2026-10-02T14:32:01.123Z",
  "level": "error",
  "message": "Order creation failed",
  "service": "orders-api",
  "request_id": "req_8f3a2c1e",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "user_id": 7,
  "context": { "order_id": 42, "amount": 150.00 },
  "error": { "type": "QueryException", "message": "Deadlock found" }
}
```

The `message` stays human-readable; anything queryable goes into dedicated fields, not
concatenated into the text.

### Correlation: linking front, back, and third-party logs

A `request_id` (per HTTP request) and, if several services are involved, a `trace_id` (per
user journey, stable across multiple requests) must appear in **every** log line produced while
handling a request — frontend included.

**Propagation principle**:
1. The frontend generates a `request_id` (UUID v4) when issuing each API call, or reuses the
   session's `trace_id` if one already exists.
2. It sends it as an HTTP header (`X-Request-Id`), never as a URL parameter or in the body.
3. The backend reads it from the header (or generates one if absent — a direct API call that
   bypasses the frontend always exists) and injects it into the context of **all** logs produced
   during that request, including those from asynchronous jobs it triggers.
4. The backend returns the same `request_id` in the response (header or error body), so the
   frontend can display it to the user ("reference: req_8f3a2c1e") on error — which considerably
   shortens user support compared to "it doesn't work."

Without this shared identity, searching for "all logs for the user request that was reported
as buggy" comes down to hunting by approximate timestamp — reliable only at low traffic,
unusable beyond that.

## Phase 4 — PII masking — mandatory, not optional

A log containing a password, a token, an email, or a national ID number is no longer a
debugging tool: it's a personal-data leak that potentially lives for months in an aggregator,
backups, or an export shared with a vendor. This rule is even stricter for an application that
handles government or law-enforcement data: logs may contain personal data under GDPR and local
data-protection law.

**Fields to mask systematically before writing any log**, backend and frontend alike:

- Secrets: passwords (even hashed), tokens, API keys, session cookies, `Authorization` headers
- Direct PII: email, phone, address, national ID number, full name in a context not needed for
  diagnosis (a `user_id` is almost always enough)
- Combinable indirect PII: precise geolocation, full IP (truncate the last octet if the use case
  doesn't justify full precision)

**How, not just "you must"**:
- Backend: a log middleware or processor (Monolog `processor`, .NET `ILogEventEnricher`
  middleware) that redacts known keys (`password`, `token`, `secret`, `*_key`) before
  serialization — not a manual discipline at every `Log::info()` call, which always ends up
  forgotten eventually.
- Frontend: never a raw `console.log(error)` on an API response object that may contain user
  fields — log a filtered version or the `request_id` alone, and leave the full detail to the
  backend, which is protected by the masking above and restricted access.

If a regex isn't enough (nested structure, variable field name), prefer an explicit list of
sensitive keys checked recursively over a regex that will miss a case and create a false sense
of security.

## Phase 5 — Business audit trail: a journal distinct from the technical log

The audit trail ("who did what, when") answers a different question than the debug log ("why
did this request fail"), and the two must not live in the same stream:

| | Technical log | Business audit trail |
|---|---|---|
| Audience | Developers, SRE | Business, compliance, sometimes the affected user (data access rights) |
| Retention | Short (days to weeks) | Long, often regulatory (years) |
| Content | Stack traces, SQL queries, technical detail | Action, actor, timestamp, before/after if relevant |
| Storage | Files, log aggregator | Dedicated table (`audit_logs`) or event store, never mixed with application logs |
| Immutability | Not required | Required — no update/delete, append-only |

A poorly isolated audit trail eventually gets purged along with debug logs during a retention
rotation — losing evidence that should have survived for years. If there's any doubt about
whether an action should be audited (creation/modification/deletion of a sensitive resource,
permission change, access to protected data), it should be: the cost of an unused audit trail is
much lower than that of a missing trace during an inspection or incident.

## Phase 5bis — Detection and alerting (OWASP A09 — Security Logging & Monitoring Failures)

Well-structured logging (Phases 2-5) answers "what happened" after the fact. A09 is about a
different requirement: an intrusion attempt in progress must be **detected while it's happening**,
not reconstructed three weeks later in an aggregator nobody checks cold. A log that exists but
never triggers an alert, in the face of behavior that should have triggered one, is exactly the
symptom A09 penalizes.

**Security events to log systematically**, at a consistent level (see Phase 2):

| Event | Level | Mandatory fields |
|---|---|---|
| Authentication failure | `warning` | `user_identifier` (email/login, never the password), `ip`, `user_agent`, `request_id` |
| Account lockout / quota reached | `error` | same + number of attempts, time window |
| Password/email/MFA change | `info` (success) / `warning` (failure) | `user_id`, actor if different (admin acting on behalf of a user) |
| Privilege escalation (admin role grant) | `warning` | target `user_id`, `actor_id`, role before/after |
| Access denied (403) on a sensitive resource | `warning` | `user_id`, resource, attempted action |
| Suspicious input rejected (XSS/SQLi payload detected by validation) | `warning` | `request_id`, targeted field, neutralized excerpt (not the raw payload if there's a re-execution risk in the viewing tool) |
| Call to an admin/debug endpoint exposed by mistake | `error` | `ip`, endpoint, `request_id` |

**Alert thresholds to configure in the aggregator** (Phase 8), not just logged:

- **Brute-force / credential stuffing**: N authentication failures for the same `user_identifier`
  or the same IP within a short sliding window (e.g. 5 failures / 5 minutes) → immediate alert, not
  a next-day report. A simple DB count (table or Redis with TTL) is enough if the aggregator has
  no native rule.
- **Enumeration**: abnormal volume of 404/403 from the same IP or account against sequential or
  random identifiers → alert.
- **5xx error spike**: potential service disruption (application DoS, an injection crashing a
  request) → `critical` alert, not just visible on a dashboard.
- Every threshold has a **named recipient** (security team, on-call) and a channel (email, Slack,
  PagerDuty) — a threshold configured with nobody receiving it isn't a control, it's an inert
  configuration line.

**Non-repudiation**: security events and the business audit trail (Phase 5) must allow attributing
an action to an actor in a way they can't credibly deny — the real actor's `user_id` (not just the
"acting on behalf of" account if application-level impersonation exists), a server-side timestamp
(never the client's), and immutability (see the Phase 5 table: append-only, no `update`/`delete`).

**Retention**: security log retention follows the longer of (a) the time needed to detect an
intrusion that stayed dormant (common recommendation: at least 90 days for security logs, beyond
the technical debug log) and (b) an explicit regulatory obligation for the sector (e.g. NIS2,
sector-specific obligations). Never align security log retention with the shorter retention of
the technical debug log — these are two different lifecycles, just like the business audit trail.

**Guardrail to check before shipping**: grep authentication handlers (`login`, `authenticate`,
`attempt`) to confirm a failure actually produces a log line with the fields above — an
authentication failure that produces no trace at all is the most common A09 finding in audits.

## Phase 6 — Backend stack

### Laravel (Monolog)

```php
// config/logging.php — structured channel + global context
'channels' => [
    'structured' => [
        'driver' => 'monolog',
        'handler' => Monolog\Handler\StreamHandler::class,
        'formatter' => Monolog\Formatter\JsonFormatter::class,
        'with' => ['stream' => storage_path('logs/app.json')],
        'tap' => [App\Logging\RedactPiiProcessor::class],
    ],
],
```

```php
// app/Http/Middleware/RequestIdMiddleware.php
public function handle(Request $request, Closure $next)
{
    $requestId = $request->header('X-Request-Id') ?? (string) Str::uuid();
    Log::withContext(['request_id' => $requestId]);
    $response = $next($request);
    return $response->header('X-Request-Id', $requestId);
}
```

```php
// app/Logging/RedactPiiProcessor.php — Monolog processor, applied via 'tap'
class RedactPiiProcessor
{
    private const SENSITIVE_KEYS = ['password', 'token', 'secret', 'api_key', 'authorization'];

    public function __invoke(\Monolog\LogRecord $record): \Monolog\LogRecord
    {
        return $record->with(context: $this->redact($record->context));
    }

    private function redact(array $context): array
    {
        foreach ($context as $key => $value) {
            if (is_array($value)) {
                $context[$key] = $this->redact($value);
            } elseif (in_array(strtolower((string) $key), self::SENSITIVE_KEYS, true)) {
                $context[$key] = '[REDACTED]';
            }
        }
        return $context;
    }
}
```

Application call: `Log::channel('structured')->info('Order created', ['order_id' => $id]);` — the
`request_id` is already in the global context, no need to repeat it on every call.

**Audit trail**: a dedicated table, never the `structured` channel above.

```php
// app/Models/AuditLog.php — append-only, no update()/delete() exposed
class AuditLog extends Model
{
    public $timestamps = false; // created_at handled explicitly, never updated_at
    protected $fillable = ['user_id', 'action', 'resource_type', 'resource_id', 'changes', 'created_at'];

    public static function record(string $action, string $resourceType, int $resourceId, array $changes = []): void
    {
        self::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'changes' => json_encode($changes),
            'created_at' => now(),
        ]);
    }
}
```

### .NET (Serilog)

```csharp
// Program.cs
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.With<PiiRedactionEnricher>()
    .WriteTo.Console(new CompactJsonFormatter())
    .CreateLogger();

// Middleware — request_id from the header or generated
app.Use(async (context, next) =>
{
    var requestId = context.Request.Headers["X-Request-Id"].FirstOrDefault() ?? Guid.NewGuid().ToString();
    using (LogContext.PushProperty("RequestId", requestId))
    {
        context.Response.Headers["X-Request-Id"] = requestId;
        await next();
    }
});
```

**.NET audit trail**: a dedicated `AuditLog` entity, written via an application service distinct
from the technical logger — same principles as Laravel above (append-only, separate table, long
retention).

## Phase 7 — Frontend stack

### Application logging service (Angular or React)

Never call `console.log`/`console.error` directly in business components — centralize in an
injectable service, so the destination can change (console in dev, aggregator in prod) without
touching business code.

```typescript
// logger.service.ts (Angular) or logger.ts (React, outside an injectable class)
interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization'];

function redact(context: LogContext): LogContext {
  const result: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = redact(value as LogContext);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function logError(message: string, context: LogContext = {}): void {
  const entry = { level: 'error', message, timestamp: new Date().toISOString(), ...redact(context) };
  if (import.meta.env.DEV) {
    console.error(entry);
  } else {
    // ship to the aggregator — see Phase 8
  }
}
```

### Generating and propagating the `request_id`

```typescript
// http-interceptor (Angular HttpInterceptorFn, or a fetch wrapper in React)
function withRequestId(config: RequestInit): RequestInit {
  const requestId = crypto.randomUUID();
  return {
    ...config,
    headers: { ...config.headers, 'X-Request-Id': requestId },
  };
}
```

On a network error or a 4xx/5xx response, log the `request_id` received back (or the one sent,
if the response couldn't be read) to allow cross-searching on the backend.

## Phase 8 — Shipping to a central aggregator

Logs kept only in local files don't survive a container restart and are only viewable from the
server itself — unmanageable once there's more than one instance. Choose based on what already
exists in the organization rather than introducing a new tool:

| Tool | When | Integration |
|---|---|---|
| **Sentry** | Application errors (front + back), alerting, less suited to `info`-level volume | Native SDK for Laravel (`sentry/sentry-laravel`), .NET (`Sentry.AspNetCore`), Angular/React (`@sentry/angular`, `@sentry/react`) |
| **ELK (Elasticsearch/Logstash/Kibana)** | High volume, free-text search, team with ops expertise | Monolog `ElasticsearchHandler`, Serilog sink `Serilog.Sinks.Elasticsearch` |
| **Loki** | Stack already on Grafana, reduced storage cost (indexes only on labels) | Loki handler/sink, or Promtail tailing JSON files |
| **Datadog** | Stack already on Datadog APM, native log/trace/metric correlation | Datadog agent + framework integration |

In every case, shipping happens **asynchronously** (queue, buffer, a tailing agent)
— never a synchronous HTTP call to the aggregator in the user request's path, which
introduces an external dependency into every request's latency and violates resilience under
load (see `CLAUDE.md`, Resilience section).

## Guardrails to check on every deliverable

- [ ] **Correlation**: `request_id` propagated frontend → backend → logs, visible in both streams.
- [ ] **PII**: no password, token, email, or PII in plaintext in a technical log — automatic
      redaction, not a manual per-call discipline.
- [ ] **Consistent levels**: an `error` triggers a possible action; otherwise it's a `warning`.
- [ ] **Separate audit trail**: if a sensitive business action exists (creation/modification/deletion,
      permission change), it has an audit trail entry in a dedicated, append-only table.
- [ ] **Asynchronous**: shipping to an external aggregator never blocks the user request.
- [ ] **No forgotten `console.log`/`dd()`/`var_dump()`**: grep before shipping (exclude
      `node_modules/`, `vendor/`, `*.test.*`).
- [ ] **A09 — Detection**: every authentication failure, lockout, privilege escalation, and
      sensitive access denial produces a usable log line (see Phase 5bis).
- [ ] **A09 — Alerting**: at least the brute-force threshold is configured in the aggregator with
      a named recipient, not just visible on a dashboard nobody checks cold.

## Optional input (conditional persistence)

- **If invoked from `backend-agent` or `frontend-agent`**: return the artifacts in Markdown,
  let the calling agent integrate them into its own structure phase.
- **If invoked standalone**: write the files directly (logging config, middleware,
  PII processor/enricher, frontend logging service).

## Memory

> ⚠️ Skip if invoked from `backend-agent` or `frontend-agent` — each agent consolidates into its
> own project knowledge file (`backend-knowledge.md` / `frontend-knowledge.md`).

If invoked standalone, record in `<project>/.claude/logging-knowledge.md`: chosen aggregator,
`request_id`/`trace_id` naming convention, PII processor/enricher location, and whether a
business audit trail was set up.
