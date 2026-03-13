---
name: cap-authentication
description: >
  SAP CAP authentication configuration — jwt, xsuaa, ias, mocked, dummy auth kinds,
  cds add xsuaa, xs-security.json, Node.js package.json setup, Java application.yaml
  mock users, @WithMockUser testing, XsuaaUserInfo JWT token access, IAS + XSUAA
  fallback, and hybrid testing.
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - auth kinds (jwt / xsuaa / ias / mocked / dummy)
    - cds.requires.auth
    - mock users Node.js
    - mock users Java (cds.security.mock.users)
    - xs-security.json / XSUAA scopes and roles
    - cds add xsuaa
    - XsuaaUserInfo (Java)
    - AuthenticationInfo / JwtTokenAuthenticationInfo
    - IAS with XSUAA fallback
    - @WithMockUser (Spring testing)
    - hybrid / .cdsrc-private.json
---

# CAP Authentication

## What This Skill Covers

Configuring and using authentication in SAP CAP applications — choosing an auth
strategy, setting up mock users for local development, configuring XSUAA or IAS for
production, and writing authenticated tests.

## Rules

1. **Always** call `cds-mcp_search_docs` before configuring or modifying authentication to verify the current API.
2. **Always** call `cds-mcp_search_model` to confirm service paths and authorization annotations.
3. Never use `mocked` or `dummy` auth strategies in production — use `xsuaa` or `ias`.
4. Never commit `.cdsrc-private.json` (contains credentials) — add it to `.gitignore`.
5. Never store passwords or tokens in `package.json` that is committed to version control.

---

## Auth Kinds Overview

| Kind | Description | Use Case |
|---|---|---|
| `mocked` | Password-based fake auth with configurable users | Local development & testing |
| `dummy` | No auth check — allows any request | Demo / CI without auth binding |
| `jwt` | Generic JWT bearer token validation | Cloud deployments with custom IdP |
| `xsuaa` | SAP XSUAA (Authorization & Trust Management) | SAP BTP Cloud Foundry production |
| `ias` | SAP Identity Authentication Service | SAP BTP production with IAS |

---

## Node.js Configuration

### Minimal setup (`package.json`)

```json
{
  "cds": {
    "requires": {
      "auth": "jwt"
    }
  }
}
```

### Mocked auth with custom users (local/development)

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[development]": {
          "kind": "mocked",
          "users": {
            "alice": {
              "password": "",
              "roles": ["admin", "Viewer"]
            },
            "bob": {
              "password": "pass",
              "tenant": "t1",
              "roles": ["cds.ExtensionDeveloper"]
            },
            "viewer-user": {
              "password": "pass",
              "tenant": "CrazyCars",
              "roles": ["Viewer"],
              "attr": { "Country": ["DE", "FR"] }
            }
          },
          "tenants": {
            "CrazyCars": {
              "features": ["cruise", "park"]
            }
          }
        }
      }
    }
  }
}
```

> Pre-defined mock users available out of the box: `alice` (admin), `bob` (cds.ExtensionDeveloper), `carol`, `dave`, `erin`, `fred`, `me`, `yves`, `*` (any user).

### Production XSUAA

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[production]": {
          "kind": "xsuaa"
        }
      }
    }
  }
}
```

### IAS with XSUAA fallback (migration scenario)

```json
{
  "cds": {
    "requires": {
      "auth": "ias",
      "xsuaa": true
    }
  }
}
```

### Dummy auth (demo/CI — no binding required)

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[production]": { "kind": "dummy" }
      }
    }
  }
}
```

> Warning: `dummy` skips all auth checks. Use only for demos or CI pipelines where no real binding is available.

---

## Setting Up XSUAA

### Add XSUAA to a CAP project

```shell
# Add XSUAA service and generate xs-security.json
cds add xsuaa

# Production-ready variant (includes MTA deployment config)
cds add xsuaa --for production

# Install the XSUAA security library
npm add @sap/xssec
```

### Minimal `xs-security.json`

```json
{
  "xsappname": "bookshop",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.admin", "description": "Admin access" },
    { "name": "$XSAPPNAME.viewer", "description": "Read-only access" }
  ],
  "role-templates": [
    {
      "name": "Admin",
      "description": "Admin role",
      "scope-references": ["$XSAPPNAME.admin"]
    },
    {
      "name": "Viewer",
      "description": "Viewer role",
      "scope-references": ["$XSAPPNAME.viewer"]
    }
  ]
}
```

---

## Node.js — Accessing User in Handlers

```javascript
module.exports = class CatalogService extends cds.ApplicationService {
  async init() {
    this.before('*', req => {
      const { user } = req
      console.log('User ID:', user.id)
      console.log('Tenant:', user.tenant)
      console.log('Has admin role:', user.is('admin'))
      console.log('Attr country:', user.attr.country)
    })
    return super.init()
  }
}
```

---

## Java Configuration

### Mock users in `application.yaml` (development profile)

```yaml
---
spring:
  config.activate.on-profile: default

cds:
  security:
    mock:
      users:
        - name: alice
          password: ""
          roles:
            - admin
          privileged: false
        - name: bob
          tenant: t1
          roles:
            - cds.ExtensionDeveloper
        - name: Viewer-User
          tenant: CrazyCars
          roles:
            - Viewer
          attributes:
            Country: [DE, FR]
          features:
            - cruise
            - park
        - name: Admin-User
          password: admin-pass
          privileged: true
          features:
            - "*"
      tenants:
        - name: CrazyCars
          features:
            - cruise
            - park
```

### Accessing the JWT token (XSUAA)

```java
import com.sap.cds.feature.xsuaa.XsuaaUserInfo;

@Autowired
private XsuaaUserInfo xsuaaToken;

@Before(event = CqnService.EVENT_READ, entity = "Books")
public void logUser(EventContext context) {
    logger.info("User: {} {} ({})",
        xsuaaToken.getGivenName(),
        xsuaaToken.getFamilyName(),
        xsuaaToken.getEmail());
}
```

### Accessing authentication info generically

```java
import com.sap.cds.services.request.UserInfo;

@Autowired
private UserInfo userInfo;

// In a handler:
String userId = userInfo.getName();
boolean isAdmin = userInfo.hasRole("admin");
String tenant = userInfo.getTenant();
```

---

## Automated Testing

### Node.js — authenticated HTTP requests

```javascript
// Using cds.test HTTP helpers with mocked auth
const { GET, POST } = cds.test(__dirname + '/..')

// Anonymous (no auth)
const { data } = await GET('/browse/Books')

// Authenticated as alice
await GET('/admin/Books', { auth: { username: 'alice', password: '' } })

// Authenticated as viewer-user with password
await POST('/browse/Orders', { book: 201, quantity: 1 },
  { auth: { username: 'viewer-user', password: 'pass' } })
```

### Java — `@WithMockUser` (Spring MVC Test)

```java
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
public class BookServiceTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "Viewer-User")  // must match mock user name in application.yaml
    public void readBooks_asViewer_returns200() throws Exception {
        mockMvc.perform(get("/odata/v4/CatalogService/Books"))
               .andExpect(status().isOk());
    }

    @Test
    public void readBooks_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/odata/v4/CatalogService/Books"))
               .andExpect(status().isUnauthorized());
    }
}
```

---

## Hybrid Testing (local + cloud services)

Use `.cdsrc-private.json` to bind cloud service credentials locally without changing `package.json`:

```json
{
  "requires": {
    "auth": {
      "credentials": {
        "url": "https://<subdomain>.authentication.eu10.hana.ondemand.com",
        "clientid": "...",
        "clientsecret": "..."
      }
    }
  }
}
```

> **Important:** Add `.cdsrc-private.json` to `.gitignore` — it contains secrets.

---

## Quick Reference

| Task | Command / Config |
|---|---|
| Add XSUAA | `cds add xsuaa` |
| Install XSUAA library | `npm add @sap/xssec` |
| Set auth kind | `cds.requires.auth = "jwt"` in `package.json` |
| Mocked auth (dev) | `"kind": "mocked"` with `users` map |
| Production auth | `"kind": "xsuaa"` or `"kind": "ias"` |
| IAS + XSUAA fallback | `"auth": "ias"` + `"xsuaa": true` |
| Java mock users | `cds.security.mock.users` in `application.yaml` |
| Java test user | `@WithMockUser(username = "...")` |
| Generate .http files | `cds add http` |
