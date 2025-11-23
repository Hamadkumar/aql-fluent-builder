/**
 * Tests for AQL Builder - Jest Test Suite
 */

import { AB } from "../core/aql.builder";
import { ref, FLOOR, RAND } from "../core/expression.builder";

describe('AQLBuilder', () => {
  test('simple FOR...IN...RETURN query', () => {
    const result = AB.for('doc')
      .in('collection')
      .return('doc._key')
      .toAql();

    expect(result).toBe('FOR doc IN collection\nRETURN doc._key');
  });

  test('query with filter', () => {
    const result = AB.for('doc')
      .in('users')
      .filter(ref('doc.age').gte(18))
      .return('doc')
      .build();

    expect(result.query).toContain('FOR doc IN users');
    expect(result.query).toContain('FILTER (doc.age >= 18)');
    expect(result.query).toContain('RETURN doc');
  });

  test('query with multiple chained filters', () => {
    const result = AB.for('u')
      .in('users')
      .filter(
        ref('u.active').eq(true)
          .and(ref('u.age').gte(21))
      )
      .return('u')
      .toAql();

    expect(result).toContain('FILTER ((u.active == true) && (u.age >= 21))');
  });

  test('replace operation', () => {
    const result = AB.for('u')
      .in('users')
      .replace('u')
      .into('backup')
      .toAql();

    expect(result).toBe('FOR u IN users\nREPLACE u IN backup');
  });

  test('remove operation', () => {
    const result = AB.for('u')
      .in('users')
      .filter(ref('u.inactive').eq(true))
      .remove('u')
      .into('users')
      .toAql();

    expect(result).toContain('REMOVE u IN users');
  });

  test('insert with simple document', () => {
    const result = AB.for('i')
      .in(AB.range(1, 10))
      .insert({ name: 'test', value: 42 })
      .into('collection')
      .toAql();

    expect(result).toContain('INSERT');
    expect(result).toContain('INTO collection');
  });

  test('sort operation', () => {
    const result = AB.for('doc')
      .in('products')
      .sort('doc.price', 'DESC')
      .return('doc')
      .toAql();

    expect(result).toContain('SORT doc.price DESC');
  });

  test('limit and offset', () => {
    const result = AB.for('doc')
      .in('items')
      .limit(10)
      .offset(5)
      .return('doc')
      .toAql();

    expect(result).toContain('LIMIT 5, 10');
  });

  test('graph traversal', () => {
    const result = AB.for('v')
      .inGraph({
        graph: 'myGraph',
        direction: 'OUTBOUND',
        startVertex: '"vertices/start"',
        minDepth: 1,
        maxDepth: 3
      })
      .return('v')
      .toAql();

    expect(result).toContain('1..3 OUTBOUND');
    expect(result).toContain('GRAPH "myGraph"');
  });

  test('parameterized query', () => {
    const result = AB.for('user')
      .in('@@collection')
      .filter(ref('user.age').gte('@minAge'))
      .return('user._key')
      .build();

    expect(result.query).toContain('@@collection');
    expect(result.query).toContain('@minAge');
  });

  test('ternary conditional', () => {
    const result = AB.for('item')
      .in('items')
      .return({
        name: 'item.name',
        status: ref('item.stock').gt(0)
          .then('"available"')
          .else('"sold out"')
          .getExpression()
      })
      .build();

    expect(result.query).toContain('?');
    expect(result.query).toContain(':');
  });
});

describe('ExpressionBuilder', () => {
  test('comparison operators', () => {
    expect(ref('x').eq(5).getExpression()).toMatchObject({
      type: 'binary',
      operator: '=='
    });

    expect(ref('x').neq(5).getExpression()).toMatchObject({
      type: 'binary',
      operator: '!='
    });

    expect(ref('x').lt(5).getExpression()).toMatchObject({
      type: 'binary',
      operator: '<'
    });
  });

  test('arithmetic operators', () => {
    expect(ref('x').add(5).getExpression()).toMatchObject({
      type: 'binary',
      operator: '+'
    });

    expect(ref('x').times(2).getExpression()).toMatchObject({
      type: 'binary',
      operator: '*'
    });
  });

  test('logical operators', () => {
    const expr = ref('a').eq(1).and(ref('b').eq(2));
    expect(expr.getExpression()).toMatchObject({
      type: 'binary',
      operator: '&&'
    });
  });

  test('AQL functions', () => {
    expect(FLOOR(ref('x')).getExpression()).toMatchObject({
      type: 'function',
      name: 'FLOOR'
    });

    expect(RAND().getExpression()).toMatchObject({
      type: 'function',
      name: 'RAND'
    });
  });
});