---
name: cds-event-handlers-java
description: SAP CAP Java event handlers - @Before/@On/@After, EventHandler, EventContext, CqnService CRUD events, custom actions
compatibility:
  runtime: [java]
metadata:
  topics:
    - "@Before / @On / @After handler method annotations"
    - EventHandler interface and @ServiceName binding
    - EventContext and generated typed event contexts
    - CqnService CRUD event constants
    - custom actions and functions with return values
    - context.setResult() / context.setCompleted() / context.proceed()
    - injecting and running CQN queries inside handlers
    - ServiceException for business errors
---

# CAP Java Event Handlers

## What This Skill Covers

Guide you in implementing CAP Java service event handlers, covering:

- `@Before`, `@On`, `@After` handler method annotations
- `EventHandler` interface and `@ServiceName` binding
- `EventContext` and generated typed event contexts
- CRUD event constants (`CqnService.EVENT_CREATE`, etc.)
- Custom actions and functions with return values
- `context.setResult()` / `context.setCompleted()` / `context.proceed()`
- Injecting and running CQN queries inside handlers
- Error and exception handling
- Spring dependency injection in handlers

## Rules

- ALWAYS check `cds-mcp_search_model` for entity/service definitions before writing handlers.
- ALWAYS verify Java API usage with `cds-mcp_search_docs` before using CAP Java SDK classes.
- **Prefer declarative CDS over custom handler code.** Before writing a `@Before` handler for validation, check whether the requirement can be covered by model annotations: `@mandatory`, `@assert.range`, `@assert.format`, `@assert.unique`, `@assert.target`, or `@assert` expressions. Only write a handler when the logic genuinely cannot be expressed in CDS.
- Handler classes MUST be annotated with `@Component` and implement `EventHandler`.
- Use `@ServiceName("MyService")` to bind a handler class to a specific service; override at method level when needed.
- Use `@Before` for validation, `@On` for core business logic, `@After` for result post-processing.
- For `@On` handlers of synchronous events, always call `context.setResult(...)` or `context.setCompleted()` to signal completion.
- Call `context.proceed()` inside an `@On` handler to delegate to the next handler in the chain (wrap pattern).
- Use generated model interfaces (from `cds-maven-plugin`) for type-safe access; fall back to `Map<String, Object>` only when needed.
- Throw `ServiceException` for business errors; CAP maps it to the appropriate HTTP status.

## Common Patterns

### Handler class skeleton
```java
import org.springframework.stereotype.Component;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.handler.annotations.Before;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.After;
import com.sap.cds.services.cds.CqnService;

@Component
@ServiceName("AdminService")
public class AdminServiceHandler implements EventHandler {
  // handler methods go here
}
```

### @Before – input validation
```java
import com.sap.cds.services.cds.CdsCreateEventContext;
import cds.gen.adminservice.Books;

@Before(event = CqnService.EVENT_CREATE, entity = Books_.CDS_NAME)
public void beforeCreateBook(CdsCreateEventContext context) {
  context.getCqn().entries().forEach(entry -> {
    if (entry.get("title") == null) {
      throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Title is required");
    }
  });
}
```

### @On – core logic with result
```java
import com.sap.cds.services.cds.CdsReadEventContext;

@On(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
public void onReadBooks(CdsReadEventContext context) {
  // delegate to next handler (DB), then post-process
  context.proceed();
}
```

### @After – post-processing results
```java
import com.sap.cds.services.cds.CdsReadEventContext;
import java.util.List;
import java.util.Map;

@After(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
public void afterReadBooks(List<Map<String, Object>> books) {
  books.forEach(book -> book.put("titleUpper",
      ((String) book.get("title")).toUpperCase()));
}
```

### Custom action handler
```java
// CDS: action submitOrder(book: UUID, quantity: Integer) returns Orders;

import cds.gen.catalogservice.SubmitOrderContext;

@On(event = "submitOrder")
public void onSubmitOrder(SubmitOrderContext context) {
  String bookId   = context.getBook();
  Integer qty     = context.getQuantity();

  // business logic...
  Orders result = Orders.create();
  result.setId(UUID.randomUUID().toString());

  context.setResult(result);
  context.setCompleted();
}
```

### Custom function (returns value)
```java
// CDS: function getStockLevel(book: UUID) returns Integer;

@On(event = "getStockLevel")
public Integer onGetStockLevel(EventContext context) {
  String bookId = (String) context.get("book");
  // query DB...
  return 42;
}
```

### Wrap pattern with proceed()
```java
@On(event = CqnService.EVENT_UPDATE, entity = Books_.CDS_NAME)
public void wrapUpdateBooks(EventContext context) {
  // pre-processing
  context.put("modifiedBy", "system");

  context.proceed(); // delegate to default DB handler

  // post-processing
  Object result = context.get("result");
}
```

### Injecting persistence service
```java
import com.sap.cds.services.persistence.PersistenceService;
import com.sap.cds.ql.Select;
import org.springframework.beans.factory.annotation.Autowired;

@Component
@ServiceName("AdminService")
public class AdminServiceHandler implements EventHandler {

  @Autowired
  PersistenceService db;

  @Before(event = CqnService.EVENT_CREATE, entity = Orders_.CDS_NAME)
  public void validateOrder(CdsCreateEventContext context) {
    var bookId = context.getCqn().entries().get(0).get("book_ID");
    var result = db.run(Select.from(Books_.class).byId(bookId));
    if (result.rowCount() == 0) {
      throw new ServiceException(ErrorStatuses.NOT_FOUND, "Book not found");
    }
  }
}
```

## CRUD Event Constants
| Event | Constant | Context Interface |
|---|---|---|
| CREATE | `CqnService.EVENT_CREATE` | `CdsCreateEventContext` |
| READ | `CqnService.EVENT_READ` | `CdsReadEventContext` |
| UPDATE | `CqnService.EVENT_UPDATE` | `CdsUpdateEventContext` |
| UPSERT | `CqnService.EVENT_UPSERT` | `CdsUpsertEventContext` |
| DELETE | `CqnService.EVENT_DELETE` | `CdsDeleteEventContext` |

## Handler Execution Order
```
@Before → @On → @After
```
- `@Before`: validation and input mutation
- `@On`: core business logic; call `context.proceed()` to chain
- `@After`: result post-processing; receives result rows directly

## Maven Setup

```xml
<!-- pom.xml: CAP Java — Spring Boot integration + OData V4 adapter -->
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-framework-spring-boot</artifactId>
  <scope>runtime</scope>
</dependency>
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-adapter-odata-v4</artifactId>
  <scope>runtime</scope>
</dependency>

<!-- Or use the all-in-one starter (includes both above) -->
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-starter-spring-boot-odata</artifactId>
</dependency>
```

See the `cap-project-setup` skill for the full recommended `pom.xml` dependency set.

Run the app locally:
```sh
mvn spring-boot:run
```
