# AQL Fluent Builder - Developer Guide

A comprehensive, type-safe query builder for ArangoDB AQL queries in TypeScript.

## Table of Contents

- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Basic Usage](#basic-usage)
- [Query Operations](#query-operations)
- [Repository Pattern](#repository-pattern)
- [Expressions & Filters](#expressions--filters)
- [Aggregations & Grouping](#aggregations--grouping)
- [Graph Operations](#graph-operations)
- [Advanced Features](#advanced-features)
- [Type Safety](#type-safety)
- [API Reference](#api-reference)

---

## Installation

```bash
npm install aql-fluent-builder
```

## Core Concepts

### AQLBuilder

The `AQLBuilder` class is the main entry point for constructing queries. It provides a fluent, chainable API that mirrors AQL syntax.

```typescript
import { AQLBuilder, AB, ref } from 'aql-fluent-builder';

// Create a new builder
const builder = new AQLBuilder();

// Or use the static factory
const query = AB.for('doc').in('users').return('doc');
```

### ExpressionBuilder

The `ExpressionBuilder` (accessed via `ref()`) allows you to build type-safe expressions for filters, computations, and more.

```typescript
import { ref } from 'aql-fluent-builder';

// Create a reference to a field
const ageFilter = ref('user.age').gte(18);
```

---

## Basic Usage

### Simple Query

```typescript
import { AQLBuilder, ref } from 'aql-fluent-builder';

const query = new AQLBuilder()
  .for('user')
  .in('users')
  .filter(ref('user.active').eq(true))
  .return('user')
  .build();

console.log(query.query);
// FOR user IN users
// FILTER (user.active == true)
// RETURN user

console.log(query.bindVars);
// {}
```

### Using the Static Factory

```typescript
import { AB, ref } from 'aql-fluent-builder';

const query = AB.for('user')
  .in('users')
  .return('user')
  .build();
```

### Returning Specific Fields

```typescript
const query = AB.for('user')
  .in('users')
  .return({
    id: ref('user._key'),
    name: ref('user.name'),
    email: ref('user.email')
  })
  .build();

// FOR user IN users
// RETURN {"id": user._key, "name": user.name, "email": user.email}
```

---

## Query Operations

### FILTER

Add filtering conditions to your queries:

```typescript
// Simple filter
AB.for('user')
  .in('users')
  .filter(ref('user.age').gte(18))
  .return('user');

// Multiple filters (AND logic)
AB.for('user')
  .in('users')
  .filter(ref('user.active').eq(true))
  .filter(ref('user.age').gte(18))
  .return('user');

// Complex boolean logic
AB.for('user')
  .in('users')
  .filter(
    ref('user.active').eq(true)
      .and(ref('user.age').gte(18))
      .or(ref('user.role').eq('admin'))
  )
  .return('user');
```

### SORT

Sort results by one or more fields:

```typescript
// Single field sort
AB.for('user')
  .in('users')
  .sort('user.createdAt', 'DESC')
  .return('user');

// Multiple fields
AB.for('user')
  .in('users')
  .sort('user.lastName', 'ASC')
  .sort('user.firstName', 'ASC')
  .return('user');
```

### LIMIT & OFFSET

Paginate results:

```typescript
// Limit only
AB.for('doc')
  .in('collection')
  .limit(10)
  .return('doc');

// With offset (skip first 20, return next 10)
AB.for('doc')
  .in('collection')
  .limit(10, 20)
  .return('doc');

// Or separately
AB.for('doc')
  .in('collection')
  .offset(20)
  .limit(10)
  .return('doc');
```

### LET

Define variables for use in queries:

```typescript
AB.for('user')
  .in('users')
  .let('totalSpent', SUM(ref('user.purchases[*].amount')).getExpression())
  .filter(ref('totalSpent').gt(1000))
  .return({
    name: ref('user.name'),
    totalSpent: ref('totalSpent')
  });
```

```

### WITH

Specify collections for read/write locks in transactions:

```typescript
// Lock collections for exclusive access
AB.with('users', 'orders')
  .for('user')
  .in('users')
  .filter(ref('user.balance').lt(0))
  .updateWith('user', { balance: 0 })
  .return('NEW');

// Use WITH for transaction control
AB.with('inventory', 'orders')
  .for('order')
  .in('orders')
  .filter(ref('order.status').eq('pending'))
  .let('item', ref('order.itemId'))
  .updateWith('order', { status: 'confirmed' })
  .return('NEW');

// WITH users, orders
// FOR order IN orders
// FILTER (order.status == "pending")
// LET item = order.itemId
// UPDATE order WITH {"status": "confirmed"} IN orders
// RETURN NEW
```

---

## Repository Pattern

The repository pattern provides a clean, type-safe abstraction for data access operations.

### Creating a Repository

```typescript
import { BaseRepository } from 'aql-fluent-builder';

interface MySchema {
  users: {
    _key: string;
    _id: string;
    name: string;
    email: string;
    age: number;
    active: boolean;
  };
}

class UserRepository extends BaseRepository<MySchema, 'users'> {
  constructor() {
    super('users');
  }
  
  // Custom query methods
  findAdults() {
    return this.findAll({
      filter: (u) => u.get('age').gte(18)
    });
  }
  
  findByEmail(email: string) {
    return this.findOne({
      filter: (u) => u.get('email').eq(email)
    });
  }
}

const userRepo = new UserRepository();
```

### CRUD Operations

#### findAll - Query Multiple Documents

```typescript
// All users
const allUsers = userRepo.findAll().build();

// With filter
const activeUsers = userRepo.findAll({
  filter: (u) => u.get('active').eq(true)
}).build();

// With sorting
const sortedUsers = userRepo.findAll({
  sort: { field: 'name', direction: 'ASC' }
}).build();

// With limit
const recentUsers = userRepo.findAll({
  sort: { field: 'createdAt', direction: 'DESC' },
  limit: 10
}).build();
```

#### findOne - Query Single Document

```typescript
const user = userRepo.findOne({
  filter: (u) => u.get('email').eq('alice@example.com')
}).build();
```

#### findById - Get by Key

```typescript
const user = userRepo.findById('user123').build();
// FOR doc IN users FILTER doc._key == @value0 RETURN doc
```

#### create - Insert Document

```typescript
const newUser = userRepo.create({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  active: true
}).build();

// INSERT {name: "Alice", ...} INTO users RETURN NEW
```

#### update - Update by Key

```typescript
const updated = userRepo.update('user123', {
  age: 31,
  active: false
}).build();

// UPDATE "user123" WITH {...} IN users RETURN NEW
```

#### delete - Delete by Key

```typescript
const deleted = userRepo.delete('user123').build();
// REMOVE "user123" IN users RETURN OLD
```

### Batch Operations

#### createMany - Batch Insert

```typescript
const users = userRepo.createMany([
  { name: 'Alice', age: 20, email: 'alice@example.com', active: true },
  { name: 'Bob', age: 30, email: 'bob@example.com', active: true },
  { name: 'Charlie', age: 25, email: 'charlie@example.com', active: false }
]).build();

// FOR doc IN @data INSERT doc INTO users RETURN NEW
```

#### updateBatch - Batch Update by Key

```typescript
const updated = userRepo.updateBatch([
  { _key: 'user1', age: 21 },
  { _key: 'user2', age: 31 },
  { _id: 'users/user3', active: false }
]).build();

// FOR doc IN @data UPDATE doc IN users RETURN NEW
```

#### deleteBatch - Batch Delete by Keys

```typescript
const deleted = userRepo.deleteBatch(['user1', 'user2', 'user3']).build();
// FOR key IN @keys REMOVE key IN users RETURN OLD
```

#### updateMany - Update by Filter

```typescript
const updated = userRepo.updateMany(
  { filter: (u) => u.get('age').lt(18) },
  { active: false }
).build();

// FOR doc IN users
// FILTER (doc.age < 18)
// UPDATE doc WITH {active: false} IN users
// RETURN NEW
```

#### deleteMany - Delete by Filter

```typescript
const deleted = userRepo.deleteMany({
  filter: (u) => u.get('active').eq(false)
}).build();

// FOR doc IN users
// FILTER (doc.active == false)
// REMOVE doc IN users
// RETURN OLD
```

### Additional Repository Methods

#### count - Count Documents

Get the total count of documents matching criteria:

```typescript
// Count all documents
const totalCount = userRepo.count().build();
// FOR doc IN users
// COLLECT AGGREGATE count = COUNT(1)
// RETURN count

// Count with filter
const adultCount = userRepo.count(u => u.get('age').gte(18)).build();
// FOR doc IN users
// FILTER (doc.age >= 18)
// COLLECT AGGREGATE count = COUNT(1)
// RETURN count
```

#### exists - Check Existence

Check if a document exists by ID:

```typescript
const exists = userRepo.exists('user123').build();
// RETURN EXISTS(DOCUMENT('users', 'user123'))
```

#### upsert - Insert or Update

Perform an upsert operation (insert if not exists, update if exists):

```typescript
// Upsert with default update (uses insert data)
const result = userRepo.upsert(
  { email: 'alice@example.com' },  // Search criteria
  { name: 'Alice', email: 'alice@example.com', age: 30 }  // Insert data
).build();

// Upsert with custom update
const result2 = userRepo.upsert(
  { email: 'alice@example.com' },
  { name: 'Alice', email: 'alice@example.com', age: 30 },
  { age: 31, lastSeen: Date.now() }  // Custom update data
).build();

// UPSERT {"email": "alice@example.com"}
// INSERT {"name": "Alice", "email": "alice@example.com", "age": 30}
// UPDATE {"age": 31, "lastSeen": 1234567890}
// IN users
// RETURN NEW
```

#### distinct - Get Distinct Values

Get unique values for a specific field:

```typescript
const roles = userRepo.distinct('role').build();
// FOR doc IN users
// RETURN DISTINCT(doc.role)

const countries = userRepo.distinct('country').build();
// FOR doc IN users
// RETURN DISTINCT(doc.country)
```

### Pagination

The `paginate` method returns paginated data with metadata:

```typescript
const result = userRepo.paginate(2, 20, {
  filter: (u) => u.get('active').eq(true),
  sort: { field: 'createdAt', direction: 'DESC' }
}).build();

// Returns:
// {
//   data: [...],      // Array of documents for page 2
//   total: 150,       // Total matching documents
//   page: 2,          // Current page
//   pageSize: 20      // Items per page
// }
```

**Generated AQL:**
```sql
FOR doc IN users
FILTER (doc.active == true)
SORT doc.createdAt DESC
COLLECT {} INTO allItems
RETURN {
  "data": SLICE(allItems, 20, 20),
  "total": LENGTH(allItems),
  "page": 2,
  "pageSize": 20
}
```

### Edge Collections

For graph edges, use `EdgeRepository`:

```typescript
import { EdgeRepository } from 'aql-fluent-builder';

interface MySchema {
  users: { _key: string; name: string };
  follows: { _from: string; _to: string; since: number };
}

class FollowsRepository extends EdgeRepository<MySchema, 'follows'> {
  constructor() {
    super('follows');
  }
}

const followsRepo = new FollowsRepository();

// Outbound traversal
const following = followsRepo.outbound('users/alice', 1, 2).build();

// Inbound traversal
const followers = followsRepo.inbound('users/alice', 1, 1).build();

// Any direction
const connections = followsRepo.any('users/alice', 1, 3).build();
```

---

## Expressions & Filters

### Comparison Operators

```typescript
ref('field').eq(value)    // ==
ref('field').neq(value)   // !=
ref('field').lt(value)    // <
ref('field').lte(value)   // <=
ref('field').gt(value)    // >
ref('field').gte(value)   // >=
```

### Logical Operators

```typescript
ref('field1').eq(value1).and(ref('field2').eq(value2))  // &&
ref('field1').eq(value1).or(ref('field2').eq(value2))   // ||
```

### Arithmetic Operators

```typescript
ref('price').add(10)      // +
ref('price').sub(5)       // -
ref('price').times(2)     // *
ref('price').div(2)       // /
ref('price').mod(10)      // %
```

### IN Operator

```typescript
ref('status').in(['active', 'pending'])
ref('category').notIn(['archived', 'deleted'])
```

### Ternary Conditional

```typescript
AB.for('product')
  .in('products')
  .return({
    name: ref('product.name'),
    availability: ref('product.stock').gt(0)
      .then('available')
      .else('out of stock')
      .getExpression()
  });
```

### String Functions

```typescript
import { LOWER, UPPER, SUBSTRING, LENGTH, LIKE, TRIM, CONCAT } from 'aql-fluent-builder';

// Case conversion
LOWER(ref('user.email'))
UPPER(ref('user.name'))

// String manipulation
SUBSTRING(ref('user.name'), 0, 5)
LENGTH(ref('user.email'))
TRIM(ref('user.displayName'))
CONCAT(ref('user.firstName'), ' ', ref('user.lastName'))

// Pattern matching
LIKE(ref('user.email'), '@%.com%')
ref('user.email').like('%@example.com')
ref('user.email').regex('^[a-z]+@', 'i')
```

### Type-Safe Field Access

The library provides two approaches for type-safe field access:

#### 1. Using `.get()` Method

Use the `.get()` method for explicit, type-safe field access:

```typescript
// Create a typed reference
const user = ref<User>('user');

// Access fields in a type-safe way
user.get('name')        // Type-safe field access
user.get('age').gt(18)  // Chaining with operators
user.get('email').like('%@example.com')

// Use in repository filters
userRepo.findAll({
  filter: (u) => u.get('age').gte(18).and(u.get('active').eq(true))
});

// The .get() method provides IntelliSense for field names
// and prevents accessing non-existent fields at compile time
```

#### 2. Using Recursive Proxy Pattern (Deep Property Access)

The `ref()` function returns a recursive proxy that enables natural property access syntax:

```typescript
interface User {
  _key: string;
  name: string;
  age: number;
  email: string;
  address: {
    street: string;
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  tags: string[];
  metadata: {
    lastLogin: number;
    loginCount: number;
  };
}

// Deep property access with proxy
const u = ref<User>('u');

// Access nested properties naturally
AB.for('u')
  .in('users')
  .filter(u.address.city.eq('New York'))  // Deep access: u.address.city
  .return('u');

// Multiple levels of nesting
AB.for('u')
  .in('users')
  .filter(u.address.coordinates.lat.gt(40.7))
  .filter(u.address.coordinates.lng.lt(-73.9))
  .return('u');

// Combined with operators
AB.for('u')
  .in('users')
  .filter(
    u.age.gte(18)
      .and(u.address.country.eq('USA'))
      .and(u.metadata.loginCount.gt(10))
  )
  .return('u');

// Use in RETURN statements
AB.for('u')
  .in('users')
  .return({
    name: u.name,               // Direct property access
    city: u.address.city,       // Nested property
    lat: u.address.coordinates.lat
  });
```

#### Comparison: .get() vs Proxy Pattern

```typescript
// Using .get() - explicit, step-by-step
const user = ref<User>('user');
user.get('address').get('city').eq('NYC');

// Using proxy - natural, direct access
const user = ref<User>('user');
user.address.city.eq('NYC');  // ✨ Cleaner syntax!

// Both approaches are type-safe and validate fields at compile time
```

#### Advanced Proxy Examples

```typescript
// Array property access
const u = ref<User>('u');
AB.for('u')
  .in('users')
  .filter(u.tags.in(['premium', 'verified']))
  .return('u');

// Complex nested conditions
AB.for('order')
  .in('orders')
  .filter(
    ref<Order>('order').customer.address.country.eq('USA')
      .and(ref<Order>('order').items[0].price.gt(100))
  )
  .return('order');

// Use with ternary operators
AB.for('u')
  .in('users')
  .return({
    name: u.name,
    location: u.address.city
      .then(u.address.city)
      .else('"Unknown"')
      .getExpression()
  });

// Combining with functions
import { UPPER, CONCAT } from 'aql-fluent-builder';

AB.for('u')
  .in('users')
  .return({
    displayName: CONCAT(u.name, ' (', u.address.city, ')'),
    email: UPPER(u.email)
  });
```

#### Type Safety Benefits

```typescript
interface Product {
  _key: string;
  name: string;
  price: number;
}

const p = ref<Product>('p');

// ✅ Valid - TypeScript knows 'price' exists
p.price.gt(100)

// ❌ TypeScript Error - 'invalidField' doesn't exist on Product
// p.invalidField.eq(true)  

// ✅ IntelliSense suggests: _key, name, price
// Type: p.
//       ^ IntelliSense shows available fields
```

### Array Functions

```typescript
import { FIRST, LAST, UNIQUE, LENGTH, UNION } from 'aql-fluent-builder';

FIRST(ref('doc.tags'))
LAST(ref('doc.tags'))
UNIQUE(ref('doc.tags'))
LENGTH(ref('doc.tags'))
UNION(ref('arr1'), ref('arr2'))
```

### Math Functions

```typescript
import { SQRT, POW, ROUND, ABS, FLOOR, CEIL, RAND } from 'aql-fluent-builder';

SQRT(ref('value'))
POW(ref('value'), 2)
ROUND(ref('value'), 2)
ABS(ref('value'))
FLOOR(ref('value'))
CEIL(ref('value'))
RAND()
```

### Type Checking Functions

```typescript
import { IS_ARRAY, IS_OBJECT, IS_NUMBER, HAS } from 'aql-fluent-builder';

IS_ARRAY(ref('item.tags'))
IS_OBJECT(ref('item.metadata'))
IS_NUMBER(ref('item.price'))
HAS(ref('item'), 'price')
```

### Date Functions

```typescript
import { DateFunctions } from 'aql-fluent-builder';

DateFunctions.now()
DateFunctions.timestamp()
```

---

## Aggregations & Grouping

### COLLECT

Group results by fields:

```typescript
AB.for('order')
  .in('orders')
  .collect({ customerId: 'order.customerId' })
  .into('customerOrders')
  .return({
    customerId: ref('customerId'),
    orders: ref('customerOrders')
  });
```

### COUNT

```typescript
import { COUNT } from 'aql-fluent-builder';

// Simple count
AB.for('user')
  .in('users')
  .collect({})
  .count('totalUsers')
  .build();

// Count with grouping
AB.for('user')
  .in('users')
  .collect({ country: 'user.country' })
  .count('userCount')
  .build();
```

### Multiple Aggregates

```typescript
import { COUNT, SUM, AVERAGE, MIN, MAX } from 'aql-fluent-builder';

AB.for('order')
  .in('orders')
  .collect({ status: 'order.status' })
  .count('orderCount')
  .sum('totalAmount', ref('order.amount'))
  .average('avgAmount', ref('order.amount'))
  .min('minAmount', ref('order.amount'))
  .max('maxAmount', ref('order.amount'))
  .build();

// FOR order IN orders
// COLLECT status = order.status
//   AGGREGATE orderCount = COUNT(1), totalAmount = SUM(order.amount), 
//             avgAmount = AVERAGE(order.amount), minAmount = MIN(order.amount),
//             maxAmount = MAX(order.amount)
```

### COLLECT with INTO

```typescript
AB.for('order')
  .in('orders')
  .collect({ userId: 'order.userId' })
  .into('userOrders')
  .let('totalAmount', SUM(ref('userOrders[*].o.totalAmount')).getExpression())
  .filter(ref('totalAmount').gt(2000))
  .return({
    userId: ref('userId'),
    totalAmount: ref('totalAmount')
  });
```

### FILTER Ordering with COLLECT

The builder intelligently handles filter ordering:

- **Filters added BEFORE `.collect()`** are placed before the COLLECT clause (filter documents first)
- **Filters added AFTER `.collect()`** are placed after the COLLECT clause (filter aggregated results)

```typescript
// Pre-COLLECT filtering (filters individual documents)
AB.for('order')
  .in('orders')
  .filter(ref('order.status').eq('completed'))  // Applied BEFORE grouping
  .collect({ customerId: 'order.customerId' })
  .sum('total', ref('order.amount'))
  .build();

// FOR order IN orders
// FILTER (order.status == "completed")  -- Before COLLECT
// COLLECT customerId = order.customerId AGGREGATE total = SUM(order.amount)

// Post-COLLECT filtering (filters aggregated results)
AB.for('order')
  .in('orders')
  .collect({ customerId: 'order.customerId' })
  .sum('total', ref('order.amount'))
  .build()
  .filter(ref('total').gt(1000))  // Applied AFTER grouping
  .return({ customerId: ref('customerId'), total: ref('total') });

// FOR order IN orders
// COLLECT customerId = order.customerId AGGREGATE total = SUM(order.amount)
// FILTER (total > 1000)  -- After COLLECT
// RETURN {customerId: customerId, total: total}
```

---

## Graph Operations

### Basic Graph Traversal

```typescript
AB.for('vertex')
  .inGraph({
    graph: 'socialGraph',
    direction: 'OUTBOUND',
    startVertex: 'users/123',
    minDepth: 1,
    maxDepth: 3
  })
  .return('vertex');

// FOR vertex IN 1..3 OUTBOUND users/123 GRAPH "socialGraph"
// RETURN vertex
```

### Multiple Loop Variables

Access vertex, edge, and path data:

```typescript
AB.forMultiple('v', 'e', 'p')
  .inGraph({
    graph: 'socialGraph',
    direction: 'OUTBOUND',
    startVertex: 'users/123',
    minDepth: 1,
    maxDepth: 3
  })
  .filter(ref('e.type').in(['friend', 'follows']))
  .return({
    friend: ref('v.name'),
    connection: ref('e.type'),
    distance: LENGTH(ref('p.edges')).getExpression()
  });
```

### Directions

- `OUTBOUND` - Follow edges in forward direction
- `INBOUND` - Follow edges in reverse direction
- `ANY` - Follow edges in both directions

---

## Advanced Features

### CRUD Operations

#### INSERT

```typescript
import { DateFunctions } from 'aql-fluent-builder';

// Simple insert
AB.for('i')
  .in(AB.range(1, 5))
  .insert({
    name: ref('i'),
    createdAt: DateFunctions.now().getExpression()
  })
  .into('items')
  .build();
```

#### UPDATE

```typescript
AB.for('user')
  .in('users')
  .filter(ref('user.status').eq('pending'))
  .updateWith('user', {
    status: 'active',
    updatedAt: DateFunctions.now().getExpression()
  })
  .build();

// FOR user IN users
// FILTER (user.status == "pending")
// UPDATE user
// WITH {"status": "active", "updatedAt": DATE_NOW()}
// IN users
```

#### UPDATE with OLD Reference

```typescript
AB.for('user')
  .in('users')
  .updateWithOld('user', (old) => ({
    visits: old.visits.add(1).getExpression(),
    lastLogin: DateFunctions.now().getExpression()
  }))
  .build();
```

#### UPSERT

```typescript
AB.upsert({ email: ref('newEmail') })
  .insert({
    email: ref('newEmail'),
    createdAt: DateFunctions.now().getExpression(),
    visits: 1
  })
  .update({
    visits: ref('OLD.visits').add(1).getExpression(),
    lastLogin: DateFunctions.now().getExpression()
  })
  .into('users')
  .build();

// UPSERT {"email": newEmail}
// INSERT {"email": newEmail, "createdAt": DATE_NOW(), "visits": 1}
// UPDATE {"visits": (OLD.visits + 1), "lastLogin": DATE_NOW()}
// IN users
```

#### REMOVE

```typescript
AB.for('user')
  .in('users')
  .filter(ref('user.inactive').eq(true))
  .remove('user')
  .into('users')
  .build();
```

#### REPLACE

```typescript
AB.for('doc')
  .in('documents')
  .filter(ref('doc.version').lt(2))
  .replace('doc')
  .into('archive')
  .build();
```

### Subqueries

#### Subquery with LET

```typescript
import { createSubquery } from 'aql-fluent-builder';

AB.for('user')
  .in('users')
  .let('orders', createSubquery()
    .for('o')
    .in('orders')
    .filter(ref('o.userId').eq(ref('user._id')))
    .return('o')
    .build()
  )
  .return({
    name: ref('user.name'),
    orders: ref('orders')
  });

// FOR user IN users
// LET orders = (FOR o IN orders
// FILTER (o.userId == user._id)
// RETURN o)
// RETURN {"name": user.name, "orders": orders}
```

#### Nested Subqueries with Aggregation

```typescript
AB.for('customer')
  .in('customers')
  .let('orders', createSubquery()
    .for('order')
    .in('orders')
    .filter(ref('order.customerId').eq(ref('customer._id')))
    .collect({ status: 'order.status' })
    .count('count')
    .build()
    .toAql()
  )
  .return({
    customer: ref('customer.name'),
    orderSummary: ref('orders')
  });
```

### Range Iteration

```typescript
// Iterate over a numeric range
AB.for('i')
  .in(AB.range(0, 10))
  .return(ref('i'))
  .build();

// FOR i IN 0..10
// RETURN i
```

### Parameterized Queries

Use bind parameters for safe query execution:

```typescript
// Collection parameter
AB.for('doc')
  .in('@@collection')
  .return('doc')
  .build();

// Value parameter
AB.for('user')
  .in('users')
  .filter(ref('user.age').gte('@minAge'))
  .return('user')
  .build();
```

### JSON Serialization

Serialize and deserialize queries for storage or transport:

```typescript
const builder = AB.for('doc').in('collection').return('doc');

// Serialize
const json = builder.toJSON();
console.log(JSON.stringify(json));

// Deserialize
const restored = AQLBuilder.fromJSON(json);
const query = restored.build();
```

---

## Type Safety

### Define Your Schema

```typescript
interface MySchema {
  users: {
    _key: string;
    _id: string;
    name: string;
    email: string;
    age: number;
    active: boolean;
    createdAt: number;
  };
  orders: {
    _key: string;
    _id: string;
    userId: string;
    amount: number;
    status: 'pending' | 'completed' | 'cancelled';
    items: string[];
  };
}
```

### Use Type-Safe Builder

```typescript
import { AQLBuilder } from 'aql-fluent-builder';

const builder = new AQLBuilder<MySchema>();

// TypeScript will validate collection names
builder
  .for('user')
  .in('users')  // ✓ Valid collection
  // .in('invalid')  // ✗ TypeScript error
  .return('user');
```

### Type-Safe Field Access

```typescript
import { ref } from 'aql-fluent-builder';

// Field paths are type-checked
builder
  .for('user')
  .in('users')
  .filter(ref('user.email').like('%@example.com'))  // ✓ Valid field
  // .filter(ref('user.invalid').eq(true))  // ✗ TypeScript error
  .return('user');
```

---

## API Reference

### AQLBuilder Methods

#### Query Construction

- `with(...collections)` - Add WITH clause for read/write locks
- `for(variable: string)` - Start a FOR loop
- `forMultiple(vertex, edge, path)` - Start a FOR loop with multiple variables (graph)
- `in(source)` - Specify collection or source
- `inGraph(options)` - Configure graph traversal
- `inEdge(collection)` - Use edge collection (type-safe)

#### Filtering

- `filter(condition)` - Add FILTER clause
- `search(view, ...conditions)` - Add SEARCH clause for full-text search

#### Variables & Aggregation

- `let(variable, expression)` - Define a variable
- `collect(variables)` - Start COLLECT clause, returns `CollectBuilder`
- `collectKeep(variables, keep)` - COLLECT with KEEP modifier

#### CollectBuilder Methods

- `count(name)` - Add COUNT aggregation
- `sum(name, expression)` - Add SUM aggregation
- `average(name, expression)` - Add AVERAGE aggregation
- `min(name, expression)` - Add MIN aggregation
- `max(name, expression)` - Add MAX aggregation
- `into(groupName)` - Add INTO clause
- `build()` - Finalize COLLECT and return to AQLBuilder

#### Sorting & Pagination

- `sort(field, direction)` - Add SORT clause
- `limit(count, offset?)` - Set LIMIT clause
- `offset(count)` - Set OFFSET clause

#### CRUD Operations

- `insert(document)` - Add INSERT operation
- `updateWith(document, updates)` - Add UPDATE operation
- `updateWithOld(document, updatesFn)` - UPDATE with OLD reference
- `replace(variable)` - Add REPLACE operation
- `remove(variable)` - Add REMOVE operation
- `upsert(searchDoc)` - Start UPSERT operation, returns `UpsertBuilder`
- `into(collection)` - Specify target collection for operation

#### Graph Operations

- `traverse(variable, path, maxDepth?)` - Add TRAVERSE clause
- `prune(condition)` - Add PRUNE clause

#### Return & Build

- `return(value)` - Set RETURN clause
- `build()` - Build and return `GeneratedAqlQuery`
- `toAql()` - Build and return AQL string only

#### Serialization

- `toJSON()` - Serialize to JSON
- `fromJSON(json)` - Deserialize from JSON (static)

### BaseRepository Methods

#### Query Methods

- `findAll(options?)` - Query all documents with optional filtering and sorting
- `findOne(options?)` - Find a single document
- `findById(key)` - Find document by its `_key`
- `count(filter?)` - Count documents, optionally with a filter
- `exists(id)` - Check if a document exists by ID

#### CRUD Operations

- `create(data)` - Insert a new document
- `update(key, data)` - Update a document by key
- `upsert(search, insert, update?)` - Insert or update based on search criteria
- `delete(key)` - Delete a document by key
- `distinct(field)` - Get distinct values for a field

#### Batch Operations

- `createMany(data[])` - Batch insert multiple documents
- `updateBatch(data[])` - Batch update documents (each must have `_key` or `_id`)
- `deleteBatch(keys[])` - Batch delete documents by keys
- `updateMany(options, data)` - Update multiple documents matching a filter
- `deleteMany(options)` - Delete multiple documents matching a filter
- `paginate(page, pageSize, options?)` - Get paginated results with total count

### ExpressionBuilder Methods

#### Comparison

- `eq(value)` - Equal to (==)
- `neq(value)` - Not equal to (!=)
- `lt(value)` - Less than (<)
- `lte(value)` - Less than or equal (<=)
- `gt(value)` - Greater than (>)
- `gte(value)` - Greater than or equal (>=)

#### Logical

- `and(other)` - Logical AND (&&)
- `or(other)` - Logical OR (||)

#### Arithmetic

- `add(value)` - Addition (+)
- `sub(value)` - Subtraction (-)
- `times(value)` - Multiplication (*)
- `div(value)` - Division (/)
- `mod(value)` - Modulo (%)

#### Set Operations

- `in(values)` - IN operator
- `notIn(values)` - NOT IN operator

#### Pattern Matching

- `like(pattern, caseInsensitive?)` - LIKE operator
- `regex(pattern, flags?)` - Regex matching

#### Conditional

- `then(value)` - Ternary then branch, returns `TernaryBuilder`

#### TernaryBuilder Methods

- `else(value)` - Ternary else branch, returns `ExpressionBuilder`

#### Utility

- `get(field)` - Type-safe field access (returns ExpressionBuilder for the field)
- `getExpression()` - Get underlying AQL expression

### Built-in Functions

```typescript
// String Functions
CONCAT(...args)
LOWER(expr)
UPPER(expr)
SUBSTRING(expr, start, length)
LENGTH(expr)
TRIM(expr)
LIKE(expr, pattern)

// Array Functions
FIRST(arr)
LAST(arr)
UNIQUE(arr)
LENGTH(arr)
UNION(...arrays)

// Math Functions
SQRT(expr)
POW(expr, power)
ROUND(expr, decimals?)
ABS(expr)
FLOOR(expr)
CEIL(expr)
RAND()

// Aggregation Functions
COUNT(expr)
SUM(expr)
AVERAGE(expr)
MIN(expr)
MAX(expr)

// Type Checking
IS_ARRAY(expr)
IS_OBJECT(expr)
IS_NUMBER(expr)
IS_STRING(expr)
HAS(obj, attr)

// Date Functions
DateFunctions.now()
DateFunctions.timestamp()
```

### Helper Functions

```typescript
// Create reference to field/variable
ref(name: string): ExpressionBuilder

// Create subquery
createSubquery(): AQLBuilder

// Create range
AB.range(start: number, end: number): AqlRange

// Create string literal
AB.str(value: string): string
literal(value: string): ExpressionBuilder
```

---

## Complete Examples

### E-commerce Query

```typescript
import { AB, ref, SUM, COUNT, AVERAGE } from 'aql-fluent-builder';

const query = AB.for('order')
  .in('orders')
  .filter(
    ref('order.createdAt').gte('@startDate')
      .and(ref('order.createdAt').lte('@endDate'))
      .and(ref('order.status').eq('completed'))
  )
  .collect({ 
    productId: 'order.productId',
    productName: 'order.productName'
  })
  .count('orderCount')
  .sum('revenue', ref('order.amount'))
  .average('avgOrderValue', ref('order.amount'))
  .build()
  .filter(ref('revenue').gt(10000))
  .sort('revenue DESC')
  .limit(10)
  .return({
    product: {
      id: ref('productId'),
      name: ref('productName')
    },
    stats: {
      orders: ref('orderCount'),
      revenue: ref('revenue'),
      avgValue: ref('avgOrderValue')
    }
  })
  .build();
```

### Social Network Recommendation

```typescript
const query = AB.forMultiple('friend', 'edge', 'path')
  .inGraph({
    graph: 'socialGraph',
    direction: 'OUTBOUND',
    startVertex: '@userId',
    minDepth: 2,
    maxDepth: 3
  })
  .filter(
    ref('edge.type').eq('friend')
      .and(ref('friend.active').eq(true))
      .and(ref('friend._id').neq('@userId'))
  )
  .collect({ friendId: 'friend._id' })
  .count('connections')
  .build()
  .sort('connections', 'DESC')
  .limit(10)
  .return({
    recommendedFriend: ref('friendId'),
    mutualConnections: ref('connections')
  })
  .build();
```

---

## Best Practices

1. **Use Type Safety**: Define your schema interface for compile-time validation
2. **Use Bind Parameters**: Always use `@param` or `@@collection` for dynamic values
3. **Build Incrementally**: Chain methods step by step for readability
4. **Extract Complex Logic**: Use `let()` to define intermediate variables
5. **Leverage Subqueries**: Break complex queries into manageable subqueries
6. **Test Your Queries**: Use the test suite pattern shown in `aql.test.ts`

---

## License

MIT
