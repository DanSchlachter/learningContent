---
name: cap-testing-java
description: >
  SAP CAP Java testing — @SpringBootTest with MockMvc, @WithMockUser for mock auth,
  H2 in-memory database setup, application.yaml test profile, MockMvcRequestBuilders,
  status assertions, testcontainers with cds:watch -DtestRun, and Maven archetype
  integration test option.
license: SAP Sample Code License
compatibility:
  runtime: [java]
metadata:
  topics:
    - "@SpringBootTest + @AutoConfigureMockMvc"
    - MockMvc GET/POST/PATCH/DELETE
    - "@WithMockUser for mock auth"
    - H2 in-memory database (spring.sql.init.platform: h2)
    - application.yaml test profile
    - status().isOk() / isUnauthorized() / isForbidden()
    - testcontainers (mvn cds:watch -DtestRun)
    - Maven archetype -DincludeIntegrationTest
    - cds.data-source.auto-config.enabled: false
---

# CAP Java Testing

## What This Skill Covers

Writing automated integration tests for CAP Java services using Spring Boot Test,
MockMvc, and in-memory H2 — including authenticated and anonymous request scenarios.

## Rules

1. **Always** call `cds-mcp_search_docs` before adding or modifying test setup.
2. **Always** call `cds-mcp_search_model` to confirm OData URLs (service name, entity set names).
3. Configure H2 for tests — never connect test runs to production databases.
4. Define mock users in `application.yaml` under a `default` (or dedicated `test`) profile.
5. Use `@WithMockUser(username = "...")` matching the name in `application.yaml` — not an arbitrary username.

---

## Dependencies (Maven)

```xml
<!-- pom.xml — typically already present in generated projects -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

---

## Test Profile Configuration (`application.yaml`)

```yaml
# src/main/resources/application.yaml

---
spring:
  config.activate.on-profile: default
  sql.init.platform: h2          # use H2 DDL/DML scripts for local/test

cds:
  data-source:
    auto-config.enabled: false   # disable CAP auto-config for H2 setup

  security:
    mock:
      users:
        - name: alice
          password: ""
          roles:
            - admin
        - name: viewer
          roles:
            - Viewer

---
spring:
  config.activate.on-profile: test
cds:
  security:
    mock:
      users:
        - name: Alice
          tenant: CrazyCars
          roles:
            - admin
```

---

## Basic Integration Test

```java
package com.example.bookshop;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
public class CatalogServiceTest {

    static final String BOOKS_URL = "/odata/v4/CatalogService/Books";

    @Autowired
    private MockMvc mockMvc;

    // --- Anonymous access ---

    @Test
    public void readBooks_anonymous_returns401() throws Exception {
        mockMvc.perform(get(BOOKS_URL))
               .andExpect(status().isUnauthorized());
    }

    // --- Authenticated access ---

    @Test
    @WithMockUser(username = "viewer")          // must match name in application.yaml
    public void readBooks_asViewer_returns200() throws Exception {
        mockMvc.perform(get(BOOKS_URL))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.value").isArray());
    }

    @Test
    @WithMockUser(username = "alice")
    public void createBook_asAdmin_returns201() throws Exception {
        String body = """
            {"ID": 999, "title": "Test Book", "stock": 10}
            """;
        mockMvc.perform(
            post("/odata/v4/AdminService/Books")
                .contentType("application/json")
                .content(body)
        ).andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = "viewer")
    public void createBook_asViewer_returns403() throws Exception {
        mockMvc.perform(
            post("/odata/v4/AdminService/Books")
                .contentType("application/json")
                .content("{\"ID\": 999, \"title\": \"X\"}")
        ).andExpect(status().isForbidden());
    }
}
```

---

## Asserting Response Body

```java
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.hamcrest.Matchers.*;

@Test
@WithMockUser(username = "alice")
public void readBooks_returnsExpectedFields() throws Exception {
    mockMvc.perform(get(BOOKS_URL + "?$select=ID,title"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.value", hasSize(greaterThan(0))))
           .andExpect(jsonPath("$.value[0].ID").exists())
           .andExpect(jsonPath("$.value[0].title").isString());
}
```

---

## PATCH and DELETE

```java
@Test
@WithMockUser(username = "alice")
public void updateBook_returns204() throws Exception {
    mockMvc.perform(
        patch("/odata/v4/AdminService/Books(201)")
            .contentType("application/json")
            .content("{\"stock\": 99}")
    ).andExpect(status().isNoContent());
}

@Test
@WithMockUser(username = "alice")
public void deleteBook_returns204() throws Exception {
    mockMvc.perform(
        delete("/odata/v4/AdminService/Books(999)")
    ).andExpect(status().isNoContent());
}
```

---

## Running Actions

```java
@Test
@WithMockUser(username = "alice")
public void submitOrder_action_returns200() throws Exception {
    mockMvc.perform(
        post("/odata/v4/CatalogService/submitOrder")
            .contentType("application/json")
            .content("{\"book\": 201, \"quantity\": 1}")
    ).andExpect(status().isOk());
}
```

---

## Testcontainers (Real Database)

Use testcontainers when you need a real HANA or PostgreSQL instance in CI:

```shell
# Start CAP Java with spring-boot test-run mode (enables testcontainers)
mvn cds:watch -DtestRun
```

---

## Maven Archetype — Include Integration Test Module

```shell
mvn archetype:generate \
  -DarchetypeArtifactId=cds-services-archetype \
  -DarchetypeGroupId=com.sap.cds \
  -DgroupId=com.example \
  -DartifactId=bookshop \
  -DincludeModel=true \
  -DincludeIntegrationTest=true \
  -DinMemoryDatabase=h2
```

`-DincludeIntegrationTest=true` generates a pre-configured integration test module.

---

## Quick Reference

| Task | Annotation / API |
|---|---|
| Load Spring context | `@SpringBootTest` |
| Inject MockMvc | `@AutoConfigureMockMvc` + `@Autowired MockMvc` |
| Run as user | `@WithMockUser(username = "alice")` |
| GET | `mockMvc.perform(get(url))` |
| POST with body | `mockMvc.perform(post(url).contentType(...).content(...))` |
| Assert 200 | `.andExpect(status().isOk())` |
| Assert 401 | `.andExpect(status().isUnauthorized())` |
| Assert 403 | `.andExpect(status().isForbidden())` |
| Assert JSON path | `.andExpect(jsonPath("$.value").isArray())` |
| H2 database | `spring.sql.init.platform: h2` in `application.yaml` |
