---
name: cap-messaging
description: >
  SAP CAP pub/sub messaging — declaring events in CDS, emitting and receiving events
  with srv.emit/srv.on in Node.js and MessagingService in Java, broker configuration
  (enterprise-messaging, event-broker, file-based), CloudEvents format, transactional
  outbox, and low-level messaging.
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - CDS event declaration
    - srv.emit / srv.on (Node.js)
    - MessagingService (Java)
    - broker kinds: enterprise-messaging-shared / event-broker / file-based-messaging
    - CloudEvents format
    - transactional outbox (OutboxService)
    - low-level messaging (fully-qualified topic names)
    - cds.connect.to('messaging')
    - @cap-js/event-broker
    - cds-feature-event-hub (Java)
---

# CAP Messaging (Pub/Sub)

## What This Skill Covers

Publishing and consuming asynchronous events in CAP — from high-level CDS event
declarations down to low-level broker integration for both Node.js and Java.

## Rules

1. **Always** call `cds-mcp_search_docs` before configuring messaging or writing message handlers.
2. **Always** call `cds-mcp_search_model` to confirm event and service names.
3. Prefer high-level service API (`srv.emit` / `srv.on`) over low-level messaging API — use low-level only for cross-process or external broker integration.
4. Use the transactional outbox pattern (Node.js default, Java `OutboxService`) to ensure events are only emitted after the database transaction commits.
5. Never include secrets or broker credentials in `package.json` — use service bindings or `.cdsrc-private.json`.

---

## Declaring Events in CDS

```cds
// In your service definition
service ReviewsService {
  entity Reviews { ... }

  // Declare domain events
  event reviewed {
    subject : String;
    rating  : Integer;
  }
}
```

---

## Node.js

### Emitting events (application service)

```javascript
module.exports = class ReviewsService extends cds.ApplicationService {
  async init() {
    const { Reviews } = this.entities

    this.after('CREATE', Reviews, async (review, req) => {
      // Emit a domain event — only delivered after transaction commits
      await this.emit('reviewed', {
        subject: review.subject,
        rating:  review.rating
      })
    })

    return super.init()
  }
}
```

### Receiving events (same process)

```javascript
module.exports = class BooksService extends cds.ApplicationService {
  async init() {
    const reviews = await cds.connect.to('ReviewsService')

    reviews.on('reviewed', async msg => {
      const { subject, rating } = msg.data
      console.log(`Book "${subject}" was reviewed with ${rating} stars`)
    })

    return super.init()
  }
}
```

### Low-level messaging (cross-process / broker)

```javascript
const cds = require('@sap/cds')

module.exports = async function (srv) {
  const messaging = await cds.connect.to('messaging')

  // Listen to a fully-qualified topic name
  messaging.on('my.namespace.ReviewsService.reviewed', async msg => {
    const { subject, rating } = msg.data
    console.log('Received:', subject, rating)
    // Forward to another topic
    await messaging.emit('my.namespace.BooksService.bookReviewed', msg.data)
  })
}
```

### Broker configuration (`package.json`)

```json
{
  "cds": {
    "requires": {
      "messaging": {
        "kind": "file-based-messaging",
        "[production]": {
          "kind": "event-broker"
        }
      }
    }
  }
}
```

Available kinds:

| Kind | Description |
|---|---|
| `file-based-messaging` | Local dev/test — writes events to files |
| `enterprise-messaging-shared` | SAP Event Mesh (shared plan) |
| `event-broker` | SAP Cloud Application Event Hub |

Install Event Hub plugin (Node.js):

```shell
npm add @cap-js/event-broker
```

### CloudEvents format

```json
{
  "cds": {
    "requires": {
      "messaging": {
        "kind": "enterprise-messaging-shared",
        "format": "cloudevents"
      }
    }
  }
}
```

CloudEvents envelope shape:

```json
{
  "type": "sap.s4.beh.salesorder.v1.SalesOrder.Created.v1",
  "specversion": "1.0",
  "source": "/default/sap.s4.beh/CLNT001",
  "id": "0894ef45-7741-1eea-b7be-ce30f48e9a1d",
  "time": "2024-01-01T06:21:52Z",
  "datacontenttype": "application/json",
  "data": { "SalesOrder": "3016329" }
}
```

### Consuming S/4HANA events (low-level)

```javascript
const messaging = await cds.connect.to('messaging')

messaging.on('sap.s4.beh.businesspartner.v1.BusinessPartner.Changed.v1', msg => {
  const { BusinessPartner } = msg.data
  console.log('Business partner changed:', BusinessPartner)
})
```

---

## Java

### Maven dependency (Event Hub)

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-event-hub</artifactId>
    <version>${latest-version}</version>
</dependency>
```

### Configure messaging broker (`application.yaml`)

```yaml
cds:
  messaging:
    services:
      - name: messaging
        kind: event-hub    # or: enterprise-messaging-shared
```

### Emitting events (Java)

```java
import com.sap.cds.services.messaging.MessagingService;
import com.sap.cds.services.messaging.TopicMessageEventContext;
import java.util.Map;

@Autowired
@Qualifier("messaging")
MessagingService messagingService;

// Option 1: direct API
messagingService.emit("My/Topic", Map.of("subject", "Book 1", "rating", 5));

// Option 2: via EventContext
TopicMessageEventContext ctx = TopicMessageEventContext.create("My/Topic");
ctx.setDataMap(Map.of("subject", "Book 1", "rating", 5));
messagingService.emit(ctx);
```

### Receiving events (Java)

```java
import com.sap.cds.services.messaging.TopicMessageEventContext;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;

@Component
@ServiceName("messaging")
public class ReviewHandler implements EventHandler {

    @On(event = "My/Topic")
    public void onReviewed(TopicMessageEventContext context) {
        String msgId   = context.getMessageId();
        Map<String, Object> payload = context.getDataMap();
        String subject = (String) payload.get("subject");
        Integer rating = (Integer) payload.get("rating");
        // process...
    }
}
```

### Transactional outbox (Java)

The outbox ensures messages are sent **only after** the database transaction commits.

```java
@Autowired
@Qualifier("MyService")
MyService myService;

@Autowired
@Qualifier("MyCustomOutbox")
OutboxService myCustomOutbox;

// Wrap service with outbox — emits only on transaction commit
Service outboxedService = myCustomOutbox.outboxed(myService);
outboxedService.send(/* event, data */);
```

---

## Key Patterns

| Concern | Node.js | Java |
|---|---|---|
| Emit event | `srv.emit('event', data)` | `messagingService.emit(topic, dataMap)` |
| Receive event | `srv.on('event', handler)` | `@On(event = "topic")` handler |
| Low-level | `cds.connect.to('messaging').emit(topic, data)` | `MessagingService.emit(topic, map)` |
| Transactional outbox | Built-in (default for `emit`) | `OutboxService.outboxed(service)` |
| CloudEvents | `"format": "cloudevents"` in `package.json` | Configure via `application.yaml` |
