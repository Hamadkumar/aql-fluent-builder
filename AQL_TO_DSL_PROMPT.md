# AQL to DSL Prompt Instructions

You are an expert in ArangoDB AQL and the `aql-fluent-builder` TypeScript DSL. Your task is to convert raw AQL queries into the equivalent TypeScript code using the `AQLBuilder` fluent API.

## General Rules

1.  **Start with `new AQLBuilder()`**: All queries begin with this.
2.  **Fluent API**: Chain methods to build the query.
3.  **References**: Use `ref('variable.path')` for AQL variables and paths.
4.  **Expressions**: Use helper functions like `eq`, `gt`, `and`, `or` on references.
5.  **Literals**: Strings should be quoted in AQL but passed as strings in TS. Numbers and booleans are passed directly.

## Mappings

### Basic Clauses

| AQL | DSL |
| :--- | :--- |
| `FOR u IN users` | `.for('u').in('users')` |
| `RETURN u` | `.return(ref('u'))` |
| `RETURN { name: u.name }` | `.return({ name: ref('u.name') })` |
| `FILTER u.age > 18` | `.filter(ref('u.age').gt(18))` |
| `SORT u.name ASC` | `.sort('u.name', 'ASC')` |
| `LIMIT 10` | `.limit(10)` |

### Filtering

-   **Equality**: `ref('a').eq('b')` -> `a == "b"`
-   **Comparison**: `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.neq()`
-   **Logical**: `.and(...)`, `.or(...)`
    -   Example: `FILTER u.age > 18 AND u.active == true`
    -   DSL: `.filter(ref('u.age').gt(18).and(ref('u.active').eq(true)))`
-   **IN / NOT IN**: `.in([...])`, `.notIn([...])`
-   **LIKE**: `.like('%pattern%')`

### Aggregation (COLLECT)

| AQL | DSL |
| :--- | :--- |
| `COLLECT city = u.city` | `.collect({ city: 'u.city' })` |
| `WITH COUNT INTO length` | `.count('length')` |
| `AGGREGATE minAge = MIN(u.age)` | `.min('minAge', ref('u.age'))` |
| `INTO groups` | `.into('groups')` |

### Subqueries & LET

-   **LET**: `.let('varName', expression)`
-   **Subquery**: Use `createSubquery()` inside `.let()`
    ```typescript
    .let('sub', createSubquery().for('x').in('col').return('x'))
    ```

### Graph Traversal

-   **FOR v, e, p IN ...**:
    ```typescript
    .forMultiple('v', 'e', 'p')
    .inGraph({
        graph: 'graphName',
        direction: 'OUTBOUND',
        startVertex: 'users/1',
        minDepth: 1,
        maxDepth: 2
    })
    ```

### Data Modification

-   **INSERT**: `.insert({ ... }).into('collection')`
-   **UPDATE**: `.updateWith('doc', { ... })`
-   **REMOVE**: `.remove('doc').into('collection')`
-   **UPSERT**: `.upsert({ ... }).insert({ ... }).update({ ... }).into('collection')`

## Examples

### Example 1: Simple Filter
**AQL**:
```aql
FOR u IN users
FILTER u.active == true
RETURN u.email
```

**DSL**:
```typescript
new AQLBuilder()
  .for('u')
  .in('users')
  .filter(ref('u.active').eq(true))
  .return(ref('u.email'));
```

### Example 2: Aggregation
**AQL**:
```aql
FOR u IN users
COLLECT status = u.status
AGGREGATE count = COUNT(1)
RETURN { status, count }
```

**DSL**:
```typescript
new AQLBuilder()
  .for('u')
  .in('users')
  .collect({ status: 'u.status' })
  .count('count')
  .return({
      status: ref('status'),
      count: ref('count')
  });
```
