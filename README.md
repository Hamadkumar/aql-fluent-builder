# AQL Fluent Builder

[![npm version](https://img.shields.io/npm/v/aql-fluent-builder.svg)](https://www.npmjs.com/package/aql-fluent-builder)
[![npm downloads](https://img.shields.io/npm/dm/aql-fluent-builder.svg)](https://www.npmjs.com/package/aql-fluent-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

A powerful, **type-safe**, and **fluent query builder** for **ArangoDB AQL queries** in TypeScript. Build complex graph traversals, edge collections, and database queries with full compile-time type checking and IntelliSense support.

This library allows you to construct complex AQL queries programmatically with full TypeScript support, ensuring type safety for collections, fields, and operations. It also supports JSON serialization of queries and automatic OpenAPI 3.0 specification generation.

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

### `ExpressionBuilder` (`ref`)

Used to build AQL expressions.

- **Comparison**: `.eq()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.in()`, `.notIn()`
- **Logical**: `.and()`, `.or()`, `.not()`
- **Arithmetic**: `.add()`, `.sub()`, `.times()`, `.div()`, `.mod()`
- **String**: `CONCAT`, `LOWER`, `UPPER`, `SUBSTRING`, `LIKE`, `REGEX_MATCH`
- **Array**: `LENGTH`, `FIRST`, `LAST`, `UNIQUE`, `UNION`
- **Math**: `FLOOR`, `CEIL`, `ROUND`, `RAND`, `ABS`

## License

MIT