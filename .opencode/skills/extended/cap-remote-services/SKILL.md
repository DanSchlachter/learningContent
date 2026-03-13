---
name: cap-remote-services
description: >
  SAP CAP remote services — connecting to external APIs via cds.connect.to,
  projecting external entities in CDS, Node.js credentials/destination configuration,
  Java application.yaml with BTP Destination Service, http.suffix for URL path,
  Cloud SDK HttpClient, and programmatic destination registration.
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - cds.connect.to (Node.js)
    - remote service declaration in CDS
    - cds.requires.<name>.credentials (Node.js)
    - OData V2 / V4 remote adapter
    - requestTimeout
    - Java application.yaml cds.remote.services
    - BTP Destination Service (destination.name)
    - http.suffix for URL composition
    - Cloud SDK HttpClient / DefaultHttpDestination
    - service binding (binding.name)
    - programmatic destination registration
---

# CAP Remote Services

## What This Skill Covers

Consuming external services (OData, REST, other CAP services) from within a CAP
application — modeling projections in CDS, configuring credentials, and running
CQL queries that are forwarded to the remote API.

## Rules

1. **Always** call `cds-mcp_search_docs` before configuring remote services or writing delegation handlers.
2. **Always** call `cds-mcp_search_model` to get current service names and entity definitions.
3. Always model external entities as CDS projections so the runtime can translate CQL queries to remote API calls.
4. Never put production credentials in `package.json` — use service bindings or `.cdsrc-private.json`.
5. `cds.connect.to(url)` is a convenience for REPL/design time only — do not use in production code.

---

## CDS Model — Projecting an External Service

```cds
// Import the external service definition
using { API_BUSINESS_PARTNER as S4 } from './srv/external/API_BUSINESS_PARTNER.csn';

service PartnerService {
  // Project only the entities / fields you need
  entity BusinessPartners as projection on S4.A_BusinessPartner {
    BusinessPartner,
    FirstName,
    LastName,
    BusinessPartnerFullName
  }
}
```

---

## Node.js

### Configuration (`package.json`)

```json
{
  "cds": {
    "requires": {
      "API_BUSINESS_PARTNER": {
        "kind": "odata-v2",
        "credentials": {
          "url": "https://my-s4-system.example.com/sap/opu/odata/sap/API_BUSINESS_PARTNER"
        }
      }
    }
  }
}
```

With a timeout override:

```json
{
  "cds": {
    "requires": {
      "API_BUSINESS_PARTNER": {
        "kind": "odata",
        "credentials": {
          "url": "https://...",
          "requestTimeout": 120000
        }
      }
    }
  }
}
```

### Hybrid testing — `.cdsrc-private.json`

```json
{
  "requires": {
    "API_BUSINESS_PARTNER": {
      "credentials": {
        "url": "https://my-s4.example.com/sap/opu/odata/sap/API_BUSINESS_PARTNER",
        "authentication": "BasicAuthentication",
        "username": "my_user",
        "password": "my_pass"
      }
    }
  }
}
```

> Add `.cdsrc-private.json` to `.gitignore`.

### Connecting and delegating queries (Node.js handler)

```javascript
const cds = require('@sap/cds')

module.exports = class PartnerService extends cds.ApplicationService {
  async init() {
    const s4 = await cds.connect.to('API_BUSINESS_PARTNER')

    // Delegate all reads to the remote service
    this.on('READ', 'BusinessPartners', req => s4.run(req.query))

    return super.init()
  }
}
```

### With mashup (join local + remote data)

```javascript
this.on('READ', 'EnrichedOrders', async req => {
  const orders = await SELECT.from('Orders')
  const bpIds  = orders.map(o => o.BusinessPartner)

  const bps = await s4.run(
    SELECT.from('A_BusinessPartner')
      .where({ BusinessPartner: { in: bpIds } })
  )

  // Merge
  return orders.map(o => ({
    ...o,
    partnerName: bps.find(b => b.BusinessPartner === o.BusinessPartner)?.BusinessPartnerFullName
  }))
})
```

### Convenience URL connect (REPL / design time only)

```javascript
// NOT for production — lacks type information
const srv = await cds.connect.to('http://localhost:4004/odata/v4/CatalogService')
const books = await srv.read`Books`
```

---

## Java

### Configure remote service (`application.yaml`)

```yaml
cds:
  remote.services:
    # OData V2 via BTP Destination
    API_BUSINESS_PARTNER:
      type: "odata-v2"
      destination:
        name: "s4-business-partner-api"

    # OData V4 with URL suffix
    SupplierService:
      type: "odata-v4"
      http:
        suffix: "/sap/opu/odata4/sap"
      destination:
        name: "s4-destination"

    # Another CAP service via shared XSUAA identity
    OtherCapService:
      binding:
        name: shared-xsuaa
        options:
          url: https://other-cap-app.example.com
```

### URL construction

```
destination URL  +  http.suffix  +  service name
https://s4.example.com  +  /sap/opu/odata/sap  +  API_BUSINESS_PARTNER
→ https://s4.example.com/sap/opu/odata/sap/API_BUSINESS_PARTNER
```

### Consuming in a Java handler

```java
import com.sap.cds.services.Service;
import com.sap.cds.ql.Select;
import com.sap.cds.Result;

@Autowired
@Qualifier("API_BUSINESS_PARTNER")
Service bpService;

@On(event = CqnService.EVENT_READ, entity = "BusinessPartners")
public void readPartners(CdsReadEventContext context) {
    CqnSelect query = context.getCqn();
    Result result = bpService.run(query);
    context.setResult(result);
    context.setCompleted();
}
```

### Programmatic destination (when no BTP Destination Service)

```java
import com.sap.cloud.sdk.cloudplatform.connectivity.DefaultHttpDestination;
import com.sap.cloud.sdk.cloudplatform.connectivity.DestinationAccessor;
import com.sap.cloud.sdk.cloudplatform.connectivity.DefaultDestinationLoader;

@Component
@ServiceName(ApplicationLifecycleService.DEFAULT_NAME)
public class DestinationConfiguration implements EventHandler {

    @Value("${api-hub.api-key:}")
    private String apiKey;

    @Before(event = ApplicationLifecycleService.EVENT_APPLICATION_PREPARED)
    public void initializeDestinations() {
        if (apiKey != null && !apiKey.isEmpty()) {
            DefaultHttpDestination destination = DefaultHttpDestination
                .builder("https://sandbox.api.sap.com/s4hanacloud")
                .header("APIKey", apiKey)
                .name("s4-business-partner-api")
                .build();

            DestinationAccessor.prependDestinationLoader(
                new DefaultDestinationLoader().registerDestination(destination));
        }
    }
}
```

### Low-level HttpClient (when CQN delegation is insufficient)

```java
import com.sap.cloud.sdk.cloudplatform.connectivity.ServiceBindingDestinationLoader;
import com.sap.cloud.sdk.cloudplatform.connectivity.ServiceBindingDestinationOptions;
import com.sap.cloud.sdk.cloudplatform.connectivity.OnBehalfOf;
import com.sap.cloud.sdk.http.HttpClientAccessor;
import org.apache.http.client.HttpClient;

ServiceBinding binding = /* obtain from environment */;
HttpDestination dest = ServiceBindingDestinationLoader.defaultLoaderChain().getDestination(
    ServiceBindingDestinationOptions.forService(binding)
        .onBehalfOf(OnBehalfOf.TECHNICAL_USER_CURRENT_TENANT)
        .build()
);

HttpClient httpClient = HttpClientAccessor.getHttpClient(dest);
// Execute custom HTTP calls
```

---

## Quick Reference

| Task | Node.js | Java |
|---|---|---|
| Connect to remote | `cds.connect.to('ServiceName')` | `@Qualifier("ServiceName") Service svc` |
| Run CQL against remote | `s4.run(req.query)` | `bpService.run(query)` |
| OData V2 kind | `"kind": "odata-v2"` | `type: "odata-v2"` |
| BTP Destination | credentials.url | `destination.name` in yaml |
| URL path suffix | N/A (built into url) | `http.suffix` in yaml |
| Hybrid credentials | `.cdsrc-private.json` | `binding.options.url` in yaml |
