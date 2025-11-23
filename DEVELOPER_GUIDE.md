# AQL Fluent Builder - Developer Guide

A comprehensive, type-safe query builder for ArangoDB AQL queries in TypeScript.

## Table of Contents

- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Basic Usage](#basic-usage)
- [Query Operations](#query-operations)
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
