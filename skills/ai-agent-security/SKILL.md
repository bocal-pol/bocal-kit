---
name: ai-agent-security
description: "Security audit of LLM/agent-based systems: indirect prompt injection, tool abuse (tool-argument injection), excessive trust granted to a sub-agent or MCP server, role/provenance confusion in context, persistent memory poisoning, user-approval binding. Auto-invoke on mention of: prompt injection, AI agent security, MCP security, LLM tool abuse, confused deputy agent, RAG security, sub-agent security, Claude skill security audit."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: security
dependencies: []
conflicts: []
---

# AI Agent Security — Auditing LLMs, tools, MCP, sub-agents

Audits any system where an LLM participates in a trust-sensitive decision:
chatbot, RAG pipeline, agent persistent memory, agent/tool-calling loop, MCP server or client,
code that builds a prompt from untrusted input, code that consumes a model output and acts on it.
The at-risk data flow: **untrusted content → model or memory → capability, authority, or sink**.

**Origin**: methodology adapted from
[`bocal-pol/security-audit-skill`](https://github.com/bocal-pol/security-audit-skill) (a fork of
Cloudflare's), whose technical content per attack domain was reused and reworded; the original's
sandboxed multi-agent orchestration framework (ledger, anti-TOCTOU file promotion) was not carried
over — `claude-config` audits in a supervised, locally-trusted setting, not an isolated hostile
environment.

## Status: usable standalone or alongside `security-audit`/`appsec`

This skill fills a blind spot in the existing security skills (`security-audit`, `appsec`,
`pentest`, `iam-engineer`): none of them cover the model-specific delegation layer. Classic
controls (transport, authz, request construction, filesystem usage, output rendering) remain the
job of those skills — this one adds the model layer on top, it doesn't replace them.

**Direct relevance to this repo**: `claude-config` is itself a multi-agent system (skills that
invoke each other, `team-dev` that delegates to sub-agents, context7/sequential-thinking/
playwright/hf-image/hf-t2v MCP servers). This skill also applies to auditing `claude-config`
itself, not just the projects it helps build.

## Optional input (if invoked from `security-audit`/`appsec`/`security-agent`)

- Auth/Session findings already identified (to avoid double coverage with `iam-engineer`)
- Scope: list the detected LLM integrations (Claude/OpenAI SDK, LangChain, MCP servers,
  agent/sub-agent configuration) before starting

## Guiding principle

A prompt injection **alone** is not a finding. Require a boundary failure at the code level: the
content reaches another principal's context, invokes an authority the requester doesn't have,
discloses data it can't read, or drives a sink it can't reach directly. A prompt guardrail ("never
do X") is not a security boundary — only count deterministic controls: resource-scoped
authorization, isolation, binding, constrained credentials.

## Workflow

### Phase 1 — Mapping

Via Glob/Grep, identify:
- **Untrusted content entry points**: RAG documents, indexed pages, uploaded files, email bodies,
  issue/ticket bodies, tool responses, MCP tool metadata
- **Persistent memory**: any storage reread by a later session (embeddings, conversation history,
  prompt cache, memory files like `MEMORY.md`)
- **Tool dispatch**: tool-calling schemas, handlers that execute an action from a model-produced
  argument
- **MCP servers/clients**: MCP config files, connection code, tool/server name resolution
- **Sub-agents/delegation**: any mechanism that launches a delegated task with a subset (or all)
  of the calling session's context/credentials

### Phase 2 — Attack classes

For each mapped entry point, check the following classes. Each line requires proof of a crossed
boundary, not mere theoretical possibility.

**Context, retrieval, and memory**

- *Indirect injection via ingested content*: an attacker can write a RAG document, indexed page,
  file, email, ticket body, or tool metadata that enters **another** principal's model context.
  Trace who can write each source, how the retrieval scope filters it, which session consumes the
  result, and what capability that activates. Check isolation, per-resource authorization, and
  binding to the consuming principal's intent separately — the defect is a missing deterministic
  control, not the persuasive text itself.
- *Cross-session or cross-tenant context leak*: conversation history, embeddings, retrieval results,
  or prompt cache scoped too broadly. Check tenant/ACL filters in the query itself and in every
  cache key — a tenant field stored on an object isn't an enforced control if an alternative query,
  a shared cache, or a batch path omits it.
- *Persistent memory poisoning*: attacker-controlled content or a model summary is written into a
  memory that later influences another task, another user, or a privileged session. Review who can
  create/modify/merge/delete the memory, its provenance and tenant scope, whether a low-confidence
  observation becomes a durable instruction or fact, and whether retrieval distinguishes user
  preference from tool policy.
- *Role/provenance confusion in the prompt*: prompt assembly lets untrusted text impersonate a
  system message, a prior turn, a tool result, a policy, or a memory record — string concatenation,
  untyped history, a caller-controlled role field, a serialization round-trip that loses the source
  label. Confirm that the forged provenance changes a deterministic trust decision or reaches a
  real capability.

**Tools and actions**

- *Tool-argument injection to a downstream sink*: model-produced arguments reach SQL, shell, file,
  URL fetch, or a privileged API without handler-side validation. The tool schema is input parsing,
  not authorization — trace every field of the decoded call to the sink.
- *Excessive agency / confused deputy*: the agent uses a broad service identity or credential, and
  the tool handler doesn't re-check the requesting principal's permission on the named resource.
  Check the effective execution identity and whether the caller could perform the same operation
  through the normal product interface.
- *Approval/confirmation binding*: a user approves a described action, but execution can use
  modified arguments, a different resource, a different principal, or a later model turn. Check
  whether the intent/confirmation binds the normalized tool name, the full arguments object, the
  requester, the target, the amount, the expiration, and batch membership — including across
  retries and resumed sessions.
- *Schema/dispatcher disagreement*: the schema accepts aliases, extra fields, duplicate keys,
  coercions, free-form nested objects, or out-of-range values that the dispatcher or handler
  interpret differently.
- *Unbounded delegated-action loops*: a bounded request can trigger repeated spend, send, mutation,
  or external API calls with no per-request budget, per-action authorization, cancellation, or
  idempotency control.

**MCP and sub-agents**

- *Sub-agent/MCP trust inheritance*: a delegated task receives the full session, credentials,
  memory, or capabilities rather than the least authority needed. Check the principal and tenant
  passed to each call, capability narrowing, credential audience, and whether delegated results are
  treated as untrusted on return.
- *MCP server/tool identity confusion*: calls or results are routed by a server name, tool name,
  request ID, resource URI, or alias chosen by the model and influenceable by an attacker, rather
  than by the authenticated connection and the pending request.
- *MCP metadata/schema treated as policy*: tool descriptions, resource metadata, prompts, or
  schemas supplied by an MCP peer are treated as policy or authorization. These fields may guide
  the model but cannot grant a capability — find the deterministic allowlist, server identity
  check, and handler-side authorization that remain authoritative in case of conflict with the
  metadata.

**Output and disclosure**

- *Unsafe output rendering*: model output reaches a sink that executes HTML, Markdown, a template,
  a URL, or a command without the encoding and policy the sink requires.
- *Sensitive context extraction*: the assembled context contains credentials, another user's data,
  private source, or policy values that themselves grant access, and a user-influenced output
  exposes them.

### Phase 3 — Validation

Every candidate finding must name: the attacker, the affected principal or shared resource, the
execution identity, the target, and the unauthorized/unrequested action or disclosure.

- For a confused-deputy claim: prove the tool lacks requester+resource authorization and that the
  attacker can't perform the same action normally.
- For an action-binding claim: prove that attacker-controlled content caused an action under the
  affected principal's authority that this principal neither requested nor intentionally approved
  — a valid generic authorization does not establish this intent.
- For memory/retrieval: cite both the attacker-controlled write and the subsequent privileged
  cross-principal read or decision. A shared record with no reachable consumer isn't sufficient.
- For MCP identity: check the authenticated connection, request correlation, tool namespace, and
  effective credential.
- Classify `confirmed` only with a full source trace and a bounded local result establishing the
  boundary. Use `needs validation` when provider, deployment, model, rendering engine, or identity
  behavior required isn't locally observable.

### Phase 4 — Report

Integrate findings into the calling skill's expected format (`security-audit`, `appsec`) or, in
standalone use, produce `ai-agent-security-findings-YYYY-MM-DD.md` with: mapped context (Phase 1),
findings by attack class with source trace + proof, and for each finding the smallest source fix
that enforces the missing invariant at the trust-decision point closest to execution.

## ⚠️ Fallback

If invoked with no LLM/agent context detected in Phase 1 (no SDK, no MCP server, no agent
configuration): display `⚠️ no LLM/agent surface detected — ai-agent-security not applicable` and
stop without producing an empty report.
