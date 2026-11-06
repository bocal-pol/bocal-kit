---
name: integration-developer
description: "Integration Developer — REST/GraphQL connectors, ESB (MuleSoft/Apache Camel), messaging (Kafka/RabbitMQ/Azure Service Bus), EDI (EDIFACT/X12), API lifecycle management (versioning/portal). Focus parameter: api / esb / messaging / edi / full. Auto-invoke on: integration, connector, API Gateway, MuleSoft, Camel, Kafka, RabbitMQ, Azure Service Bus, EDI, EDIFACT, X12, B2B, middleware, ESB, idempotency, circuit breaker, messaging, event-driven, webhook, API portal."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: medium
scope: backend
dependencies:
  - context7-mcp
  - dto-architect
conflicts: []
---

# Integration Developer

`[Activated: Integration Developer]`

Connects systems reliably, traceably, and resiliently. Every message must be delivered exactly once.

> **Absolute rule**: idempotency is mandatory on every receiving endpoint (idempotency-key header or dedup key). Circuit breaker on every external call. Retry with exponential backoff. Never a secret in a URL.

## 📦 DTOs — delegated to `dto-architect` (contract-first)

Every integration is **contract-first**: the schema (OpenAPI / AsyncAPI / Avro / Protobuf) is the source of truth, DTOs are **generated**, never hand-written.

- **Mandatory location**:
  - `contracts/v1/`, `contracts/v2/` → versioned schemas (OpenAPI YAML, Avro `.avsc`, Protobuf `.proto`, JSON Schema)
  - `src/dtos/generated/` → DTOs generated from the contracts (openapi-generator, avrogen, protoc) — **never hand-edit**
  - `src/mappers/` → Anti-Corruption Layer between systems (different naming/format/enum between source and target)
- **Minimum rules**:
  - Strict versioning: **never break an existing contract** — create `v2/` alongside it, migrate, then deprecate `v1/`
  - Strict `RequestDto` / `ResponseDto` / `EventDto` suffix (for Kafka/RabbitMQ)
  - Kafka: Avro DTOs published to a **Schema Registry**; the producer validates the schema before `publish()`
  - EDI (EDIFACT/X12): segment/element ↔ DTO mapping lives in a dedicated mapper, tested against real message samples
  - Idempotency key: mandatory field on every `*EventDto` (e.g. `messageId` UUID v7)
  - REST into ESB (Camel/MuleSoft): the inbound DTO is validated at the edge (`@Valid` Bean Validation / DataWeave schema) — never an untyped payload in the pipeline
- **When to create a DTO**: every exposed endpoint, every Kafka topic, every RabbitMQ queue, every mapped EDI message.
- **Full detail (Avro evolution rules, GraphQL federation, versioning strategy)** → see the `dto-architect` skill.

## Optional input (if invoked from `integration-agent`)

If source/target systems + protocol + focus are already provided: skip Phase 1.

## Workflow

### Phase 1 — Integration context

```
Integration Developer — Context:
1. Focus:
   [ ] api       — REST/GraphQL, versioning, gateway, portal
   [ ] esb       — MuleSoft Anypoint, Apache Camel, IBM IIB
   [ ] messaging — Kafka, RabbitMQ, Azure Service Bus
   [ ] edi       — EDIFACT, X12, AS2, B2B
   [ ] full      — all aspects (default)
2. Systems to connect: [System A → System B + preferred protocol]
3. Volume: [messages/hour + average payload size]
4. Constraints: [max latency / at-least-once vs exactly-once / retry policy]
5. Existing stack: [integration platform already in place]
```

### Phase 2 — REST API connector

#### Resilient client (circuit breaker + retry)

```python
# integration/clients/resilient_client.py
import httpx
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import datetime, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"      # Normal
    OPEN = "open"          # Failing — immediate rejection
    HALF_OPEN = "half_open"  # Recovery test


class CircuitBreaker:
    """Circuit breaker for external calls."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time: datetime | None = None
        self.state = CircuitState.CLOSED

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if datetime.now() > self.last_failure_time + timedelta(seconds=self.recovery_timeout):
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return True  # HALF_OPEN — attempt a call

    def record_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(f"Circuit OPEN after {self.failure_count} failures")


class ResilientAPIClient:
    """Resilient HTTP client: circuit breaker + retry + idempotency."""

    def __init__(self, base_url: str, api_key: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.circuit_breaker = CircuitBreaker()
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    )
    async def post(self, endpoint: str, payload: dict, idempotency_key: str) -> dict:
        if not self.circuit_breaker.can_execute():
            raise Exception(f"Circuit open — {self.base_url}{endpoint} unavailable")

        try:
            response = await self.client.post(
                f"{self.base_url}{endpoint}",
                json=payload,
                headers={"Idempotency-Key": idempotency_key},  # RFC 7231
            )
            response.raise_for_status()
            self.circuit_breaker.record_success()
            return response.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 503):  # Rate limit / unavailable → retry
                self.circuit_breaker.record_failure()
                raise
            logger.error(f"HTTP {e.response.status_code}: {e.response.text}")
            raise
```

#### API versioning & gateway

```yaml
# openapi.yaml — versioned API with semantic versioning
openapi: "3.1.0"
info:
  title: Integration API
  version: "2.1.0"  # Major.Minor.Patch — breaking change = major++
  x-api-stability: stable  # stable / beta / deprecated

# Versioning in the URL (recommended for breaking changes)
servers:
  - url: https://api.example.com/v2
  - url: https://api.example.com/v1  # Kept 6 months after the v2 release

paths:
  /orders:
    post:
      operationId: createOrder
      x-idempotency-key: required  # Documents the intent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        "201":
          description: Order created
          headers:
            Location:
              schema:
                type: string
              description: URL of the created resource
        "409":
          description: Conflict — idempotency key already used
```

### Phase 3 — Apache Camel (ESB)

```java
// src/main/java/routes/OrderIntegrationRoute.java
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.model.dataformat.JsonLibrary;

public class OrderIntegrationRoute extends RouteBuilder {

    @Override
    public void configure() throws Exception {

        // ─────────────────────────────────────────────────────
        // Global error handling
        // ─────────────────────────────────────────────────────
        errorHandler(deadLetterChannel("activemq:queue:DLQ.orders")
            .maximumRedeliveries(3)
            .redeliveryDelay(2000)          // 2s
            .backOffMultiplier(2)            // 2s, 4s, 8s
            .useExponentialBackOff()
            .logRetryAttempted(true)
            .logExhaustedMessageHistory(true));

        // ─────────────────────────────────────────────────────
        // Main route: SFTP → Transform → SAP
        // ─────────────────────────────────────────────────────
        from("sftp://sftp.partner.com/orders?username={{sftp.user}}&privateKeyFile={{sftp.key}}&delay=60000&delete=false&move=.processed")
            .routeId("order-ingestion")
            .log("File received: ${header.CamelFileName}")

            // EDI/CSV parsing
            .unmarshal().csv()

            // Transformation with a Java bean
            .bean(OrderTransformer.class, "transform")

            // Validation
            .to("bean-validator:validate")

            // Enrichment from the DB
            .enrich("mybatis:getCustomerById", new CustomerEnricher())

            // Convert to a SAP IDoc message
            .marshal().json(JsonLibrary.Jackson)
            .to("sap:idoc:ORDERS05")

            .log("Order ${header.OrderId} sent to SAP")
            .to("activemq:queue:audit.orders.success");
    }
}
```

### Phase 4 — Kafka (messaging)

```python
# messaging/kafka_producer.py
from confluent_kafka import Producer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
import json
import uuid

class OrderEventProducer:
    """Kafka producer with Avro + exactly-once idempotency."""

    ORDER_SCHEMA = """
    {
        "type": "record",
        "name": "OrderEvent",
        "namespace": "com.company.orders",
        "fields": [
            {"name": "order_id", "type": "string"},
            {"name": "customer_id", "type": "string"},
            {"name": "amount", "type": "double"},
            {"name": "status", "type": {"type": "enum", "name": "Status",
                "symbols": ["CREATED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]}},
            {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}}
        ]
    }
    """

    def __init__(self, bootstrap_servers: str, schema_registry_url: str):
        schema_client = SchemaRegistryClient({"url": schema_registry_url})
        avro_serializer = AvroSerializer(schema_client, self.ORDER_SCHEMA)

        self.producer = Producer({
            "bootstrap.servers": bootstrap_servers,
            "enable.idempotence": True,          # Exactly-once semantics
            "acks": "all",                        # All replicas confirm
            "retries": 5,
            "max.in.flight.requests.per.connection": 5,
            "compression.type": "lz4",
        })
        self.serializer = avro_serializer

    def publish_order_event(self, order_id: str, event: dict) -> None:
        self.producer.produce(
            topic="orders.events",
            key=order_id.encode("utf-8"),    # Partitioning by order_id
            value=self.serializer(event, None),
            on_delivery=self._delivery_report,
        )
        self.producer.flush()

    @staticmethod
    def _delivery_report(err, msg):
        if err:
            print(f"❌ Delivery failed: {err}")
        else:
            print(f"✅ Delivered: topic={msg.topic()} partition={msg.partition()} offset={msg.offset()}")
```

```python
# messaging/kafka_consumer.py — idempotent consumer
from confluent_kafka import Consumer, KafkaError
import redis

class IdempotentOrderConsumer:
    """Consumer with Redis-based deduplication."""

    def __init__(self, bootstrap_servers: str, group_id: str, redis_url: str):
        self.consumer = Consumer({
            "bootstrap.servers": bootstrap_servers,
            "group.id": group_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,  # Manual commit after processing
        })
        self.redis = redis.Redis.from_url(redis_url)
        self.dedup_ttl = 86400  # 24h — deduplication window

    def process_messages(self, topic: str):
        self.consumer.subscribe([topic])
        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)
                if msg is None or msg.error():
                    continue

                order_id = msg.key().decode("utf-8")
                dedup_key = f"processed:order:{order_id}"

                # Check if already processed (idempotency)
                if self.redis.get(dedup_key):
                    print(f"⏭️ Duplicate message ignored: {order_id}")
                    self.consumer.commit(msg)
                    continue

                # Process the message
                self._handle_order(json.loads(msg.value()))

                # Mark as processed + commit the offset
                self.redis.setex(dedup_key, self.dedup_ttl, "1")
                self.consumer.commit(msg)

        finally:
            self.consumer.close()
```

### Phase 5 — EDI (EDIFACT/X12)

```python
# edi/edifact_parser.py — EDIFACT ORDERS D96A parser
import pydifact

def parse_edifact_order(edi_content: str) -> dict:
    """Parse an EDIFACT ORDERS message."""
    collection = pydifact.Interchange.from_str(edi_content)
    order = {"line_items": []}

    for message in collection.get_messages("ORDERS"):
        for segment in message.segments:
            tag = segment.tag

            if tag == "BGM":   # Beginning of message
                order["order_number"] = segment.elements[1]

            elif tag == "DTM" and segment.elements[0][0] == "137":  # Document date
                order["order_date"] = segment.elements[0][2]

            elif tag == "NAD" and segment.elements[0] == "BY":  # Buyer
                order["buyer_id"] = segment.elements[3]

            elif tag == "LIN":  # Line item
                order["line_items"].append({
                    "line_number": segment.elements[0],
                    "product_id": segment.elements[2][0] if segment.elements[2] else None
                })

    return order

# EDIFACT ORDERS template (D96A) — reply to the partner
ORDERS_TEMPLATE = """UNB+UNOA:1+SENDER+RECEIVER+{date}:{time}+{ref}
UNH+1+ORDERS:D:96A:UN
BGM+220+{order_id}+9
DTM+137:{datetime}:203
NAD+BY+{buyer_id}::92
LIN+1++{ean}:EN
QTY+21:{quantity}
PRI+AAA:{price}
UNS+S
UNT+{segments}+1
UNZ+1+{ref}"""
```

### Phase 6 — Conditional persistence

- **If invoked from `integration-agent`**: return artifacts in Markdown.
- **If invoked standalone**:
  1. Create `integration/` via Bash if absent
  2. Write `integration/YYYY-MM-DD_[subject].md`

### Phase 7 — Memory

> ⚠️ Skip if invoked from `integration-agent`.

Record in `<project>/.claude/dev-knowledge.md`:
- Connected systems + protocols used
- Chosen messaging pattern (at-least-once / exactly-once)
- Configured circuit breaker timeouts
