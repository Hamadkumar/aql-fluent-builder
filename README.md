# AQL Fluent Builder

[![npm version](https://img.shields.io/npm/v/aql-fluent-builder.svg)](https://www.npmjs.com/package/aql-fluent-builder)
[![npm downloads](https://img.shields.io/npm/dm/aql-fluent-builder.svg)](https://www.npmjs.com/package/aql-fluent-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Sponsor](https://img.shields.io/badge/Sponsor-Hamadkumar-pink.svg)](https://github.com/sponsors/Hamadkumar)

A powerful, **type-safe**, and **fluent query builder** for **ArangoDB AQL queries** in TypeScript. Build complex graph traversals, edge collections, and database queries with full compile-time type checking and IntelliSense support.

This library allows you to construct complex AQL queries programmatically with full TypeScript support, ensuring type safety for collections, fields, and operations. It also supports JSON serialization of queries and automatic OpenAPI 3.0 specification generation.

## Why use this?

Writing raw AQL strings is error-prone and lacks type safety. `aql-fluent-builder` solves this by providing:

- **Type Safety**: Catch errors at compile time, not runtime.
- **Developer Experience**: Full IntelliSense support for collections and fields.
- **Maintainability**: Refactor queries easily with TypeScript.
- **Security**: Automatic bind variable generation prevents injection attacks.
- **Productivity**: Fluent API makes writing complex queries intuitive.


## Features

- 🚀 **Fluent API**: Intuitive, chainable methods for building queries (`FOR`, `FILTER`, `RETURN`, etc.).
- 🛡️ **Type-Safe**: Leverages TypeScript generics to validate collection names and field paths at compile time.
- 📦 **JSON Serialization**: Serialize queries to JSON for storage, transport, or caching.
- 📄 **OpenAPI Generation**: Automatically generate OpenAPI 3.0 specifications from your AQL queries.
- 🔍 **Complex Queries**: Support for Graph Traversals, Window Functions, Upserts, and more.
- 🔒 **Security**: Automatic bind variable generation to prevent AQL injection.
- ⚡ **Zero Runtime Dependencies**: Lightweight and efficient (core builder).

## Installation

```bash
npm install aql-fluent-builder
```

## Quick Start

### Basic Query

```typescript
import { AB, ref } from 'aql-fluent-builder';

// Define your schema (optional but recommended for type safety)
interface MySchema {
  users: {
    _key: string;
    name: string;
    age: number;
    active: boolean;
  };
}

const query = new AB<MySchema>()
  .for('u')
  .in('users')
  .filter(ref('u.age').gte(18))
  .return('u')
  .build();

console.log(query.query);
// FOR u IN users
// FILTER (u.age >= 18)
// RETURN u
```

### Deep Property Access with Proxy Pattern

The `ref()` function returns a recursive proxy enabling natural property access:

```typescript
interface User {
  _key: string;
  name: string;
  address: {
    city: string;
    country: string;
  };
}

const u = ref<User>('u');

// Access nested properties naturally - no .get() needed!
const query = AB.for('u')
  .in('users')
  .filter(u.address.city.eq('New York'))  // Type-safe deep access
  .return({
    name: u.name,
    city: u.address.city
  })
  .build();

// FOR u IN users
// FILTER (u.address.city == "New York")
// RETURN {name: u.name, city: u.address.city}
```

### Complex Filtering & Operations

```typescript
import { AB, ref } from 'aql-fluent-builder';

const query = AB.for('u')
  .in('users')
  .filter(
    ref('u.active').eq(true)
      .and(ref('u.age').gte(21))
      .or(ref('u.role').eq('admin'))
  )
  .sort('u.createdAt', 'DESC')
  .limit(10)
  .return({
    username: 'u.name',
    status: ref('u.active').then('"active"').else('"inactive"')
  })
  .build();
```

### Repository Pattern

Use repositories for type-safe, reusable data access patterns:

```typescript
import { BaseRepository } from 'aql-fluent-builder';

interface MySchema {
  users: {
    _key: string;
    name: string;
    age: number;
    active: boolean;
  };
}

class UserRepository extends BaseRepository<MySchema, 'users'> {
  constructor() {
    super('users');
  }
  
  findAdults() {
    return this.findAll({
      filter: (u) => u.get('age').gte(18)
    });
  }
}

const userRepo = new UserRepository();

// CRUD operations
await db.query(userRepo.findById('123').build());
await db.query(userRepo.create({ name: 'Alice', age: 30 }).build());
await db.query(userRepo.update('123', { age: 31 }).build());
await db.query(userRepo.delete('123').build());

// Count documents
const totalUsers = await db.query(userRepo.count().build());
const adultCount = await db.query(userRepo.count(u => u.get('age').gte(18)).build());

// Check existence
const exists = await db.query(userRepo.exists('123').build());

// Upsert (insert or update)
await db.query(userRepo.upsert(
  { email: 'alice@example.com' },  // Search criteria
  { name: 'Alice', email: 'alice@example.com', age: 30 },  // Insert data
  { age: 31 }  // Update data (optional)
).build());

// Get distinct values
const roles = await db.query(userRepo.distinct('role').build());

// Batch operations
await db.query(userRepo.createMany([
  { name: 'Alice', age: 20 },
  { name: 'Bob', age: 30 }
]).build());

await db.query(userRepo.updateMany(
  { filter: (u) => u.get('age').lt(18) },
  { active: false }
).build());

// Pagination
const result = await db.query(userRepo.paginate(1, 20, {
  filter: (u) => u.get('active').eq(true),
  sort: { field: 'name', direction: 'ASC' }
}).build());
// Returns: { data: [...], total: 150, page: 1, pageSize: 20 }
```

### Graph Traversal

```typescript
const query = AB.for('v')
  .inGraph({
    graph: 'socialGraph',
    direction: 'OUTBOUND',
    startVertex: '"users/john"',
    minDepth: 1,
    maxDepth: 3
  })
  .return('v')
  .build();
```

### JSON Serialization & Deserialization

Perfect for saving queries or sending them over the network.

```typescript
const query = AB.for('doc').in('collection').return('doc');

// Serialize to JSON
const json = query.toJSON();
console.log(JSON.stringify(json));

// Deserialize back to AQLBuilder
const restoredQuery = AQLBuilder.fromJSON(json);
```

### OpenAPI Specification Generation

Automatically generate OpenAPI specs for your queries, inferring parameters and responses.

```typescript
import { generateOpenApiSpec } from 'aql-fluent-builder';

const query = AB.for('u')
  .in('users')
  .filter(ref('u.id').eq('@userId')) // Parameterized
  .return('u');

const spec = generateOpenApiSpec(query, {
  title: 'GetUser',
  description: 'Fetch a user by ID',
  tags: ['Users']
});

console.log(spec);
// Generates a full OpenAPI 3.0 Path Item object
```

## API Reference

### `AQLBuilder`

The main entry point.

- **`with(...collections)`**: Add WITH clause for read/write locks.
- **`for(variable)`**: Start a loop.
- **`in(collection)`**: Specify source.
- **`filter(expression)`**: Add conditions.
- **`let(variable, expression)`**: Define variables.
- **`collect(variables)`**: Group results.
- **`sort(field, direction)`**: Sort results.
- **`limit(count, offset)`**: Limit results.
- **`offset(count)`**: Skip results.
- **`return(value)`**: Return data.
- **`insert(doc).into(collection)`**: Insert data.
- **`update(doc).with(changes).in(collection)`**: Update data.
- **`upsert(search).insert(doc).update(doc).in(collection)`**: Upsert data.
- **`remove(doc).in(collection)`**: Remove data.

### `BaseRepository`

Repository for type-safe CRUD operations:

- **`findAll(options?)`**: Query all documents with optional filtering and sorting.
- **`findOne(options?)`**: Find a single document.
- **`findById(key)`**: Find document by its `_key`.
- **`count(filter?)`**: Count documents, optionally with a filter.
- **`exists(id)`**: Check if a document exists by ID.
- **`create(data)`**: Insert a new document.
- **`update(key, data)`**: Update a document by key.
- **`upsert(search, insert, update?)`**: Insert or update based on search criteria.
- **`delete(key)`**: Delete a document by key.
- **`distinct(field)`**: Get distinct values for a field.
- **`createMany(data[])`**: Batch insert multiple documents.
- **`updateBatch(data[])`**: Batch update documents (each must have `_key` or `_id`).
- **`deleteBatch(keys[])`**: Batch delete documents by keys.
- **`updateMany(options, data)`**: Update multiple documents matching a filter.
- **`deleteMany(options)`**: Delete multiple documents matching a filter.
- **`paginate(page, pageSize, options?)`**: Get paginated results with total count.

### `ExpressionBuilder` (`ref`)

Used to build AQL expressions.

- **Comparison**: `.eq()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.in()`, `.notIn()`
- **Logical**: `.and()`, `.or()`, `.not()`
- **Arithmetic**: `.add()`, `.sub()`, `.times()`, `.div()`, `.mod()`
- **String**: `CONCAT`, `LOWER`, `UPPER`, `SUBSTRING`, `LIKE`, `REGEX_MATCH`
- **Array**: `LENGTH`, `FIRST`, `LAST`, `UNIQUE`, `UNION`
- **Math**: `FLOOR`, `CEIL`, `ROUND`, `RAND`, `ABS`

## AI Assistant Prompt

If you are using an AI assistant (like ChatGPT, Claude, or GitHub Copilot) to help you write queries, you can use the [AQL_TO_DSL_PROMPT.md](./AQL_TO_DSL_PROMPT.md) file. Paste its content into your AI chat to teach it how to convert raw AQL into this fluent builder DSL with strict type safety.

## Funding

If you find this project useful, please consider supporting it:

- [GitHub Sponsors](https://github.com/sponsors/Hamadkumar)

## License

MIT