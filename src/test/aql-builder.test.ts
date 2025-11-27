import { AQLBuilder, createSubquery } from '../core/aql.builder';
import { ref } from '../core/expression.builder';

describe('AQL Builder', () => {
    describe('Basic Queries', () => {
        test('simple FOR...IN...RETURN', () => {
            const query = new AQLBuilder().for('u').in('users').return('u').build();
            expect(query.query).toBe('FOR u IN users\nRETURN u');
        });

        test('FOR with filter', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.age').gt(18))
                .return('u').build();
            expect(query.query).toContain('FILTER (u.age > @value0)');
            expect(query.bindVars).toEqual({ value0: 18 });
        });

        test('FOR with multiple filters', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.active').eq(true))
                .filter(ref('u.age').gte(18))
                .return('u').build();
            expect(query.query).toContain('FILTER (u.active == @value0)');
            expect(query.query).toContain('FILTER (u.age >= @value1)');
            expect(query.bindVars).toEqual({ value0: true, value1: 18 });
        });

        test('sorting', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .sort('u.name', 'ASC')
                .return('u').build();
            expect(query.query).toContain('SORT u.name ASC');
        });

        test('limit and offset', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .limit(10, 5)
                .return('u').build();
            expect(query.query).toContain('LIMIT 5, 10');
        });
    });

    describe('Aggregations', () => {
        test('COUNT aggregate', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .collect({}).count('total').build().toAql();
            expect(query).toBe('FOR u IN users\n  AGGREGATE total = COUNT(1)');
        });

        test('COLLECT with GROUP BY', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .collect({ country: 'u.country' })
                .count('total').build().toAql();
            expect(query).toBe('FOR u IN users\nCOLLECT country = u.country\n  AGGREGATE total = COUNT(1)');
        });

        test('multiple aggregates', () => {
            const query = new AQLBuilder()
                .for('o').in('orders')
                .collect({ status: 'o.status' })
                .count('count')
                .sum('totalAmount', ref('o.amount'))
                .average('avgAmount', ref('o.amount'))
                .build().toAql();
            expect(query).toContain('AGGREGATE count = COUNT(1), totalAmount = SUM(o.amount), avgAmount = AVERAGE(o.amount)');
        });
    });

    describe('Subqueries', () => {
        test('LET with subquery', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .let('orders', createSubquery()
                    .for('o').in('orders')
                    .filter(ref('o.userId').eq(ref('u._id')))
                    .return('o').build())
                .return({ name: ref('u.name'), orders: ref('orders') })
                .build();
            expect(query.query).toContain('LET orders = (FOR o IN orders');
            expect(query.query).toContain('FILTER (o.userId == u._id)');
        });
    });

    describe('Data Modification', () => {
        test('INSERT', () => {
            const query = new AQLBuilder()
                .insert({ name: 'Alice', age: 30 })
                .into('users').build();
            expect(query.query).toContain('INSERT {\"name\": \"Alice\", \"age\": 30} INTO users');
        });

        test('UPDATE', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.status').eq('pending'))
                .updateWith('u', { status: 'active' })
                .build();
            expect(query.query).toContain('UPDATE u');
            expect(query.query).toContain('WITH {\"status\": \"active\"}');
        });

        test('REMOVE', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.inactive').eq(true))
                .remove('u').into('users').build();
            expect(query.query).toContain('REMOVE u IN users');
        });

        test('UPSERT', () => {
            const query = new AQLBuilder()
                .upsert({ email: 'test@example.com' })
                .insert({ email: 'test@example.com', visits: 1 })
                .update({ visits: ref('OLD.visits').add(1) })
                .into('users').build();
            expect(query.query).toContain('UPSERT {"email": "test@example.com"}');
            expect(query.query).toContain('INSERT {"email": "test@example.com", "visits": 1}');
            expect(query.query).toContain('UPDATE {"visits": (OLD.visits + @value0)}');
        });
    });

    describe('Complex Filters', () => {
        test('AND/OR combinations', () => {
            const query = new AQLBuilder()
                .for('p').in('products')
                .filter(
                    ref('p.category').eq('electronics')
                        .and(ref('p.price').lt(1000).or(ref('p.onSale').eq(true)))
                )
                .return('p').build();
            expect(query.query).toContain('((p.category == @value0) && ((p.price < @value1) || (p.onSale == @value2)))');
            expect(query.bindVars).toEqual({ value0: 'electronics', value1: 1000, value2: true });
        });

        test('IN operator', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.city').in(['NYC', 'LA', 'SF']))
                .return('u').build();
            expect(query.query).toContain('u.city IN @inValues0');
            expect(query.bindVars['inValues0']).toEqual(['NYC', 'LA', 'SF']);
        });

        test('LIKE operator', () => {
            const query = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.email').like('%@example.com'))
                .return('u').build();
            expect(query.query).toContain('(u.email LIKE @likePattern0)');
        });
    });

    describe('Graph Traversal', () => {
        test('basic graph traversal', () => {
            const query = new AQLBuilder()
                .forMultiple('v', 'e', 'p')
                .inGraph({
                    graph: 'social',
                    direction: 'OUTBOUND',
                    startVertex: 'users/123',
                    minDepth: 1,
                    maxDepth: 3
                })
                .return('v').build();
            expect(query.query).toContain('FOR v, e, p IN 1..3 OUTBOUND \"users/123\" GRAPH \"social\"');
        });
    });

    describe('JSON Serialization', () => {
        test('round-trip serialization', () => {
            const original = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.age').gt(21))
                .return('u');
            const json = original.toJSON();
            const restored = AQLBuilder.fromJSON(json);
            expect(original.toAql()).toBe(restored.toAql());
        });
    });
});
