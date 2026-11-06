---
name: protocol-security
description: "Security audit of RPC protocols and asynchronous messaging: gRPC, GraphQL, Kafka, RabbitMQ, webhooks, pub/sub, event bus — peer identity, topic/queue isolation, replay/order/idempotence, misplaced trust in routing or the envelope. Auto-invoke on mention of: Kafka security, RabbitMQ security, gRPC security, topic isolation, message replay, unauthenticated webhook, ESB security, message broker security."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: medium
scope: security
dependencies: []
conflicts: []
---

# Protocol Security — RPC, messaging, brokers

Audits systems using gRPC, GraphQL transports, Protobuf/Thrift, streaming RPC,
webhooks, brokers, queues, pub/sub, or event buses. Covers peer identity, the logical
interpretation of messages, routing, replay, order, and delivery semantics.

**Origin**: methodology adapted from
[`bocal-pol/security-audit-skill`](https://github.com/bocal-pol/security-audit-skill) (a fork of
Cloudflare's). Use `appsec`/`security-audit` for parser memory safety, classic HTTP
framing, and availability impact — this skill covers the identity/logic/delivery layer
specific to asynchronous and RPC protocols.

## Relevance in this ecosystem

`integration-agent` (Principal Integration Director) covers ESB/MuleSoft/Apache Camel,
Kafka/RabbitMQ, EDI, and API lifecycle with no dedicated security angle — this skill fills that
gap. Invoked in Phase 3c of `integration-agent` when an RPC/messaging protocol is detected, or
directly on explicit mention.

## Optional input (if invoked from `integration-agent`/`security-audit`)

- Systems/protocols already identified (`integration-agent` Phase 2: Kafka, RabbitMQ, gRPC, webhooks…)
- Available schemas/contracts (OpenAPI, AsyncAPI, `.proto`, `.avsc`)

## Guiding principle

"Internal" isn't authentication. Name the peer's identity at every hop and show how it becomes
the application principal used for authorization. Schema validation proves the message's shape,
not its provenance, its authority over a resource, its order, or its safe values — follow every
decoded field through to the policy and the side effect. Broker guarantees and application
guarantees differ: explicitly note retry, order, acknowledgment, deduplication, and transactional
behavior before evaluating a state change.

## Workflow

### Phase 1 — Mapping

Grep/Glob to identify the systems involved:
- gRPC/Protobuf: `*.proto`, `grpc.Server`, `UnaryInterceptor`, `StreamInterceptor`
- Kafka: `KafkaProducer`, `KafkaConsumer`, `@KafkaListener`, `bootstrap.servers` config
- RabbitMQ: `amqp://`, `channel.consume`, `exchange.bind`, `amqplib`/`pika`/`MassTransit` libraries
- Inbound webhooks: `/webhook`, `/callback` routes, signature verification (`X-Hub-Signature`,
  `Stripe-Signature`, HMAC)
- GraphQL: schema, resolvers, subscriptions

For each identified flow, diagram producer → broker/transport → gateway → consumer →
storage, and note at each hop: authenticated peer, authoritative tenant/resource fields,
validation, side effect.

### Phase 2 — Attack classes

**Framing, schema, and interpretation**

- *Message boundary and canonicalization disagreement*: components disagreeing on length,
  compression, duplicate/unknown fields, encoding, numeric width, normalization, or
  envelope/body precedence. Compare generated and hand-rolled parsers, gateways, language
  bindings, version converters.
- *Union/enum/default confusion*: unknown variants, missing discriminants, zero values,
  default privileges, or compatibility mappings reaching code that assumes an already-validated case.
- *Envelope/payload identity disagreement*: authorization uses routing or envelope metadata that
  looks trustworthy, while the handler acts on a conflicting tenant/account/subject/object in the
  body. Identify which source is authoritative and ensure the client can't override it.

**RPC identity and authorization**

- *Interceptor/method-path inconsistency*: an authn/authz interceptor applies to unary methods
  but not to streams, reflection, health checks, gateway-transcoded paths, compatibility
  services, or individual messages within a stream.
- *Peer identity → application principal confusion*: mTLS, workload identity, bearer
  metadata, forwarded identity, or broker credentials authenticate a channel, but a caller-controlled
  field selects the user or tenant.
- *Per-item or streaming authorization gaps*: a stream, subscription, batch, or bulk
  message is authorized once, then later items name different resources or continue
  after a role/membership/token revocation.
- *Callback/response correlation confusion*: predictable, reused, or cross-tenant-shared
  correlation IDs let a response, webhook, cancellation, or acknowledgment satisfy another
  caller's pending operation.

**Broker and queue isolation**

- *Topic/routing-key/subscription scope gaps*: a producer or subscriber can
  select another tenant's topic, wildcard, consumer group, partition, reply queue, or
  dead-letter route. Check broker-enforced ACLs (if visible) and application-side namespace
  construction — tenant text in the payload isn't isolation.
- *Disclosure via dead-letter/retry/diagnostics*: messages routed to dead-letter queues,
  error topics, tracing, or operator views contain secrets or cross-tenant payloads
  accessible to a less-privileged consumer.
- *Untrusted producer treated as control plane*: a message body can declare itself an
  admin event, vendor callback, replication record, or migration instruction without an
  independently authenticated producer and verified event type. Check signatures and the
  source/account/audience binding before any privileged processing.

**Replay, order, and transaction**

- *Duplicate-delivery and idempotence gaps*: retries or redelivery repeat a side
  effect because deduplication is absent, happens after the mutation, or uses a key that
  collides across tenants or operations.
- *Out-of-order or stale message acceptance*: older state, a revoked membership, a
  cancelled job, or a pre-revocation step-up authorization arrives after more recent state
  and overwrites it.
- *Acknowledgment/commit order defects*: the acknowledgment happens before the durable
  commit and loses security-relevant work, or the commit happens before an unreliable
  acknowledgment and duplicates a mutation.
- *Partial multi-consumer transitions*: several consumers jointly implement an
  authorization or business transition, but retries and partial failure leave only a
  subset validated.

### Phase 3 — Validation

Name the realistic producer/peer, the accepted message, the authenticated channel
identity, the affected principal/resource, and the unauthorized mutation/disclosure.

- For a disagreement claim: cite both parsers/consumers and the diverging decoded value. A safe
  rejection by either side prevents confirmation.
- For replay/order: establish the real delivery guarantees and reproduce the invariant
  failure with a bounded local/in-memory transport.
- For authorization and isolation, check every interceptor, broker ACL, gateway, and
  consumer level visible in the source. External attachments make the candidate `to be validated`.
- Classify as `confirmed` only with the full message lifecycle and a significant observed result.

### Phase 4 — Report

Integrate into the calling skill's format (`integration-agent`, `security-audit`) or produce
`protocol-security-findings-YYYY-MM-DD.md` with the producer→broker→consumer diagram per flow,
findings per class with a trace, and the smallest fix (explicit ACL, signature
verification, idempotency key, correlation binding) per finding.

## ⚠️ Fallback

If no RPC/messaging protocol is detected in Phase 1 (no gRPC, no broker, no
webhook): display `⚠️ no RPC/messaging protocol detected — protocol-security not applicable`
and stop.
