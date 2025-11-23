/**
 * Enhanced AQL Builder Examples - Aggregate Functions and Subqueries
 */

import { AQLBuilder, createSubquery, AB } from '../core/aql.builder';
import {
  COUNT, SUM, AVERAGE,
  SUBSTRING, LENGTH, LOWER, UPPER, TRIM, LIKE,
  FIRST, LAST, UNIQUE, LENGTH as ARRAY_LENGTH,
  SQRT, POW, ROUND, ABS, IS_ARRAY, IS_OBJECT, HAS,
  ref,
  ArrayFunctions,
  DateFunctions,
  ExpressionBuilder,
  StringFunctions
} from '../core/expression.builder';

describe('AQL Examples', () => {
  test('Example 1: Simple COUNT Aggregate', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .collect({})
      .count('totalUsers')
      .build().toAql();

    expect(query).toBe(`FOR user IN users
  AGGREGATE totalUsers = COUNT(1)`);
  });

  test('Example 2: COUNT with GROUP BY', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .collect({ country: 'user.country' })
      .count('total')
      .build().toAql();

    expect(query).toBe(`FOR user IN users
COLLECT country = user.country
  AGGREGATE total = COUNT(1)`);
  });

  test('Example 3: Multiple Aggregates', () => {
    const query = new AQLBuilder()
      .for('order')
      .in('orders')
      .collect({ status: 'order.status' })
      .count('orderCount')
      .sum('totalAmount', ref('order.amount'))
      .average('avgAmount', ref('order.amount'))
      .min('minAmount', ref('order.amount'))
      .max('maxAmount', ref('order.amount'))
      .build().toAql();

    expect(query).toBe(`FOR order IN orders
COLLECT status = order.status
  AGGREGATE orderCount = COUNT(1), totalAmount = SUM(order.amount), avgAmount = AVERAGE(order.amount), minAmount = MIN(order.amount), maxAmount = MAX(order.amount)`);
  });

  test('Example 4: Subquery with LET clause', () => {
    const query = new AQLBuilder()
      .for('user')
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
      })
      .build();

    expect(query.query).toBe(`FOR user IN users
LET orders = (FOR o IN orders
FILTER (o.userId == user._id)
RETURN o)
RETURN {"name": user.name, "orders": orders}`);
  });

  test('Example 5: LET with Aggregate Functions', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .let('totalSpent',
        SUM(ref('user.purchases[*].amount')).getExpression()
      )
      .let('avgPurchase',
        AVERAGE(ref('user.purchases[*].amount')).getExpression()
      )
      .filter(ref('totalSpent').gt(1000))
      .return({
        name: ref('user.name'),
        totalSpent: ref('totalSpent'),
        avgPurchase: ref('avgPurchase')
      })
      .build();

    expect(query.query).toBe(`FOR user IN users
LET totalSpent = SUM(user.purchases[*].amount)
LET avgPurchase = AVERAGE(user.purchases[*].amount)
FILTER (totalSpent > 1000)
RETURN {"name": user.name, "totalSpent": totalSpent, "avgPurchase": avgPurchase}`);
  });

  test('Example 6: String Functions', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .filter(LIKE(ref('user.email'), '@%.com%').getExpression())
      .return({
        name: ref('user.name'),
        email: LOWER(ref('user.email')).getExpression(),
        emailLength: LENGTH(ref('user.email')).getExpression(),
        firstName: SUBSTRING(ref('user.name'), 0, 5).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR user IN users
FILTER LIKE(user.email, "@%.com%")
RETURN {"name": user.name, "email": LOWER(user.email), "emailLength": LENGTH(user.email), "firstName": SUBSTRING(user.name, 0, 5)}`);
  });

  test('Example 7: Array Functions', () => {
    const query = new AQLBuilder()
      .for('doc')
      .in('documents')
      .return({
        name: ref('doc.name'),
        firstTag: FIRST(ref('doc.tags')).getExpression(),
        lastTag: LAST(ref('doc.tags')).getExpression(),
        tagCount: ARRAY_LENGTH(ref('doc.tags')).getExpression(),
        uniqueTags: UNIQUE(ref('doc.tags')).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR doc IN documents
RETURN {"name": doc.name, "firstTag": FIRST(doc.tags), "lastTag": LAST(doc.tags), "tagCount": LENGTH(doc.tags), "uniqueTags": UNIQUE(doc.tags)}`);
  });

  test('Example 8: Math Functions', () => {
    const query = new AQLBuilder()
      .for('product')
      .in('products')
      .return({
        name: ref('product.name'),
        price: ref('product.price'),
        sqrtPrice: SQRT(ref('product.price')).getExpression(),
        raisedPrice: POW(ref('product.price'), 2).getExpression(),
        roundedPrice: ROUND(ref('product.price'), 2).getExpression(),
        absDiscount: ABS(ref('product.discount')).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR product IN products
RETURN {"name": product.name, "price": product.price, "sqrtPrice": SQRT(product.price), "raisedPrice": POW(product.price, 2), "roundedPrice": ROUND(2), "absDiscount": ABS(product.discount)}`);
  });

  test('Example 9: Type Checking Functions', () => {
    const query = new AQLBuilder()
      .for('item')
      .in('items')
      .filter(IS_OBJECT(ref('item.metadata')).getExpression())
      .return({
        id: ref('item._id'),
        hasPrice: HAS(ref('item'), 'price').getExpression(),
        isArray: IS_ARRAY(ref('item.tags')).getExpression(),
        type: ref('item')
      })
      .build();

    expect(query.query).toBe(`FOR item IN items
FILTER IS_OBJECT(item.metadata)
RETURN {"id": item._id, "hasPrice": HAS(item, "price"), "isArray": IS_ARRAY(item.tags), "type": item}`);
  });

  test('Example 10: Complex Query', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .filter(ref('user.active').eq(true))
      .let('purchaseCount', COUNT(ref('user.purchases')).getExpression())
      .let('totalAmount', SUM(ref('user.purchases[*].amount')).getExpression())
      .collect({ country: 'user.country', age: ROUND(ref('user.age'), 0).getExpression() })
      .count('userCount')
      .sum('totalSpent', ref('totalAmount'))
      .average('avgSpent', ref('totalAmount'))
      .build()
      .return({
        country: ref('country'),
        age: ref('age'),
        userCount: ref('userCount'),
        totalSpent: ref('totalSpent'),
        avgSpent: ref('avgSpent')
      })
      .build();

    expect(query.query).toBe(`FOR user IN users
LET purchaseCount = COUNT(user.purchases)
LET totalAmount = SUM(user.purchases[*].amount)
COLLECT country = user.country, age = ROUND(user.age)
  AGGREGATE userCount = COUNT(1), totalSpent = SUM(totalAmount), avgSpent = AVERAGE(totalAmount)
FILTER (user.active == true)
RETURN {"country": country, "age": age, "userCount": userCount, "totalSpent": totalSpent, "avgSpent": avgSpent}`);
  });

  test('Example 11: Nested Subqueries', () => {
    const query = new AQLBuilder()
      .for('customer')
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
      })
      .build();

    expect(query.query).toBe(`FOR customer IN customers
LET orders = FOR order IN orders
COLLECT status = order.status
  AGGREGATE count = COUNT(1)
FILTER (order.customerId == customer._id)
RETURN {"customer": customer.name, "orderSummary": orders}`);
  });

  test('Example 12: String Function Filtering', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .filter(ref('user.username').eq(UPPER('admin').getExpression()))
      .return({
        username: UPPER(ref('user.username')).getExpression(),
        email: LOWER(ref('user.email')).getExpression(),
        displayName: TRIM(ref('user.displayName')).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR user IN users
FILTER (user.username == UPPER("admin"))
RETURN {"username": UPPER(user.username), "email": LOWER(user.email), "displayName": TRIM(user.displayName)}`);
  });

  test('Example 13: Pagination + Dynamic Filters', () => {
    const query = new AQLBuilder()
      .for('p')
      .in('products')
      .let('minPrice', 100)
      .let('maxPrice', 500)
      .filter(
        ref('p.price').gte(ref('minPrice'))
          .and(ref('p.price').lte(ref('maxPrice')))
      )
      .sort('p.price', 'ASC')
      .limit(10, 20)
      .return(ref('p'))
      .build();

    expect(query.query).toBe(`FOR p IN products
LET minPrice = 100
LET maxPrice = 500
FILTER ((p.price >= minPrice) && (p.price <= maxPrice))
SORT p.price ASC
LIMIT 20, 10
RETURN p`);
  });

  test('Example 14: Aggregate With Grouping + Window-like Logic', () => {
    const query = new AQLBuilder()
      .for('o').in('orders')
      .collect({ userId: 'o.userId' })
      .into('userOrders')
      .let('totalAmount', SUM(ref('userOrders[*].o.totalAmount')).getExpression())
      .let('avgAmount', AVERAGE(ref('userOrders[*].o.totalAmount')).getExpression())
      .filter(ref('totalAmount').gt(2000))
      .return({
        userId: ref('userId'),
        totalAmount: ref('totalAmount'),
        avgAmount: ref('avgAmount'),
        orderCount: LENGTH(ref('userOrders')).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR o IN orders
COLLECT userId = o.userId
  INTO userOrders
LET totalAmount = SUM(userOrders[*].o.totalAmount)
LET avgAmount = AVERAGE(userOrders[*].o.totalAmount)
FILTER (totalAmount > 2000)
RETURN {"userId": userId, "totalAmount": totalAmount, "avgAmount": avgAmount, "orderCount": LENGTH(userOrders)}`);
  });

  test('Example 15: Social Network Graph Traversal', () => {
    const query = new AQLBuilder()
      .for('p')
      .inGraph({
        graph: 'socialGraph',
        direction: 'OUTBOUND',
        startVertex: 'users/123',
        minDepth: 1,
        maxDepth: 5
      })
      .filter(ref('p.edges[*].relation').eq('friend'))
      .return({
        friend: LAST(ref('p.vertices')).getExpression(),
        degreesAway: LENGTH(ref('p.edges')).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR p IN 1..5 OUTBOUND users/123 GRAPH "socialGraph"
FILTER (p.edges[*].relation == "friend")
RETURN {"friend": LAST(p.vertices), "degreesAway": LENGTH(p.edges)}`);
  });

  test('Example 16: Upsert query', () => {
    const query = new AQLBuilder()
      .upsert({ email: ref('newEmail') })
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

    expect(query.query).toBe(`UPSERT {"email": newEmail}
INSERT {"email": newEmail, "createdAt": DATE_NOW(), "visits": 1}
UPDATE {"visits": (OLD.visits + 1), "lastLogin": DATE_NOW()}
IN users`);
  });

  test('Example 17: String Functions', () => {
    const query = new AQLBuilder()
      .for('u')
      .in('users')
      .filter(
        StringFunctions.lower(ref('u.email')).like('%@example.com')
      )
      .return({
        name: StringFunctions.upper(ref('u.name')).getExpression(),
        email: ref('u.email')
      })
      .build();

    expect(query.query).toBe(`FOR u IN users
FILTER (LOWER(u.email) LIKE @likePattern0)
RETURN {"name": UPPER(u.name), "email": u.email}`);
  });

  test('Example 18: Array Functions', () => {
    const query = new AQLBuilder()
      .for('o')
      .in('orders')
      .collect({ userId: 'o.userId' })
      .into('userOrders')
      .let('items', ArrayFunctions.union(
        ref('userOrders[*].o.items')
      ).getExpression())
      .return({
        userId: ref('userId'),
        uniqueItems: ArrayFunctions.unique(ref('items')).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR o IN orders
COLLECT userId = o.userId
  INTO userOrders
LET items = UNION(userOrders[*].o.items)
RETURN {"userId": userId, "uniqueItems": UNIQUE(items)}`);
  });

  test('Example 19: Multiple Loop Variables (Graph)', () => {
    const query = new AQLBuilder()
      .forMultiple('v', 'e', 'p')
      .inGraph({
        graph: 'socialGraph',
        direction: 'OUTBOUND',
        startVertex: 'users/123',
        minDepth: 1,
        maxDepth: 3
      })
      .filter(
        ref('e.type').in(['friend', 'follows'])
      )
      .return({
        friend: ref('v.name'),
        connection: ref('e.type'),
        distance: new ExpressionBuilder({
          type: 'function',
          name: 'LENGTH',
          args: [{ type: 'reference', name: 'p.edges' }]
        }).getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR v, e, p IN 1..3 OUTBOUND "users/123" GRAPH "socialGraph"
FILTER (e.type IN @inValues0)
RETURN {"friend": v.name, "connection": e.type, "distance": LENGTH(p.edges)}`);
  });

  test('Example 20: REMOVE operation', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .filter(ref('user.inactive').eq(true))
      .remove('user')
      .into('users')
      .build();

    expect(query.query).toBe(`FOR user IN users
FILTER (user.inactive == true)
REMOVE user IN users`);
  });

  test('Example 21: INSERT operation', () => {
    const query = new AQLBuilder()
      .for('i')
      .in(AB.range(1, 5))
      .insert({
        name: ref('i'),
        createdAt: DateFunctions.now().getExpression()
      })
      .into('items')
      .build();

    expect(query.query).toBe(`FOR i IN 1..5
INSERT {"name": i, "createdAt": DATE_NOW()} INTO items`);
  });

  test('Example 22: REPLACE operation', () => {
    const query = new AQLBuilder()
      .for('doc')
      .in('documents')
      .filter(ref('doc.version').lt(2))
      .replace('doc')
      .into('archive')
      .build();

    expect(query.query).toBe(`FOR doc IN documents
FILTER (doc.version < 2)
REPLACE doc IN archive`);
  });

  test('Example 23: UPDATE with updateWith', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .filter(ref('user.status').eq('pending'))
      .updateWith('user', {
        status: 'active',
        updatedAt: DateFunctions.now().getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR user IN users
FILTER (user.status == "pending")
UPDATE user
WITH {"status": "active", "updatedAt": DATE_NOW()}
IN users`);
  });

  test('Example 24: Complex filter with AND/OR', () => {
    const query = new AQLBuilder()
      .for('product')
      .in('products')
      .filter(
        ref('product.category').eq('electronics')
          .and(
            ref('product.price').lt(1000)
              .or(ref('product.onSale').eq(true))
          )
      )
      .return(ref('product'))
      .build();

    expect(query.query).toBe(`FOR product IN products
FILTER ((product.category == "electronics") && ((product.price < 1000) || (product.onSale == true)))
RETURN product`);
  });

  test('Example 25: Multiple filters', () => {
    const query = new AQLBuilder()
      .for('item')
      .in('items')
      .filter(ref('item.active').eq(true))
      .filter(ref('item.stock').gt(0))
      .filter(ref('item.price').lte(100))
      .return(ref('item'))
      .build();

    expect(query.query).toBe(`FOR item IN items
FILTER (item.active == true)
FILTER (item.stock > 0)
FILTER (item.price <= 100)
RETURN item`);
  });

  test('Example 26: Sorting with multiple fields', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .sort('user.lastName', 'ASC')
      .sort('user.firstName', 'ASC')
      .return(ref('user'))
      .build();

    expect(query.query).toBe(`FOR user IN users
SORT user.lastName ASC, user.firstName ASC
RETURN user`);
  });

  test('Example 27: Range iteration', () => {
    const query = new AQLBuilder()
      .for('i')
      .in(AB.range(0, 10))
      .return(ref('i'))
      .build();

    expect(query.query).toBe(`FOR i IN 0..10
RETURN i`);
  });

  test('Example 28: Ternary conditional in RETURN', () => {
    const query = new AQLBuilder()
      .for('product')
      .in('products')
      .return({
        name: ref('product.name'),
        availability: ref('product.stock').gt(0)
          .then('available')
          .else('out of stock')
          .getExpression()
      })
      .build();

    expect(query.query).toBe(`FOR product IN products
RETURN {"name": product.name, "availability": ((product.stock > 0) ? "available" : "out of stock")}`);
  });

  test('Example 29: Nested object in RETURN', () => {
    const query = new AQLBuilder()
      .for('user')
      .in('users')
      .return({
        id: ref('user._id'),
        profile: {
          name: ref('user.name'),
          email: ref('user.email'),
          age: ref('user.age')
        },
        metadata: {
          createdAt: ref('user.createdAt'),
          lastLogin: ref('user.lastLogin')
        }
      })
      .build();

    expect(query.query).toBe(`FOR user IN users
RETURN {"id": user._id, "profile": {"name": user.name, "email": user.email, "age": user.age}, "metadata": {"createdAt": user.createdAt, "lastLogin": user.lastLogin}}`);
  });

  test('Example 30: COLLECT with INTO and no aggregates', () => {
    const query = new AQLBuilder()
      .for('order')
      .in('orders')
      .collect({ customerId: 'order.customerId' })
      .into('customerOrders')
      .return({
        customerId: ref('customerId'),
        orders: ref('customerOrders')
      })
      .build();

    expect(query.query).toBe(`FOR order IN orders
COLLECT customerId = order.customerId
  INTO customerOrders
RETURN {"customerId": customerId, "orders": customerOrders}`);
  });
});
