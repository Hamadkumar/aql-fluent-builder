import { AQLBuilder, AB } from '../core/aql.builder';
import { ref, SearchFunctions, ExpressionBuilder, SUM } from '../core/expression.builder';
import { TestSchema, User, Order, Product } from '../schema/test-schemas';
import { generateOpenApiSpec } from '../openapi/openapi.generator';

describe('Core AQL Functionality', () => {

    describe('1. Basic Query Building', () => {
        test('simple FOR...IN...RETURN', () => {
            const query = new AQLBuilder<TestSchema>().for('u').in('users').return('u').build();
            expect(query.query).toBe('FOR u IN users\nRETURN u');
        });

        test('FOR with filter', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .filter(u.age.gt(18))
                .return(u).build();
            expect(query.query).toContain('FILTER (u.age > @value0)');
            expect(query.bindVars).toEqual({ value0: 18 });
        });

        test('FOR with multiple filters', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .filter(u.active.eq(true))
                .filter(u.age.gte(18))
                .return(u).build();
            expect(query.query).toContain('FILTER (u.active == @value0)');
            expect(query.query).toContain('FILTER (u.age >= @value1)');
            expect(query.bindVars).toEqual({ value0: true, value1: 18 });
        });

        test('sorting', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .sort('u.name', 'ASC')
                .return(u).build();
            expect(query.query).toContain('SORT u.name ASC');
        });

        test('limit and offset', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .limit(10, 5)
                .return(u).build();
            expect(query.query).toContain('LIMIT 5, 10');
        });
    });

    describe('2. Aggregations', () => {
        test('COUNT aggregate', () => {
            const query = new AQLBuilder<TestSchema>()
                .for('u').in('users')
                .collect({}).count('total').build().build().query;
            expect(query).toContain('FOR u IN users\nCOLLECT \n  AGGREGATE total = COUNT(1)');
        });

        test('COLLECT with GROUP BY', () => {
            const query = new AQLBuilder<TestSchema>()
                .for('u').in('users')
                .collect({ country: 'u.country' })
                .count('total').build().build().query;
            expect(query).toContain('FOR u IN users\nCOLLECT country = u.country\n  AGGREGATE total = COUNT(1)');
        });

        test('multiple aggregates', () => {
            const o = ref<Order>('o');
            const query = new AQLBuilder<TestSchema>()
                .for(o).in('orders')
                .collect({ status: 'o.status' })
                .count('count')
                .sum('totalAmount', o.amount)
                .average('avgAmount', o.amount)
                .build().build().query;
            const normalizedQuery = query.replace(/\s+/g, ' ');
            expect(normalizedQuery).toContain('AGGREGATE count = COUNT(1), totalAmount = SUM(o.amount), avgAmount = AVERAGE(o.amount)');
        });

        test('COLLECT with KEEP', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .collectKeep({ name: u.name }, ['u'])
                .into('groups')
                .build();
            const aql = query.query;
            expect(aql).toContain('COLLECT name = u.name');
            expect(aql).toContain('INTO groups');
            expect(aql).toContain('KEEP u');
        });
    });

    describe('3. Subqueries & LET', () => {
        test('LET with subquery', () => {
            const u = ref<User>('u');
            const o = ref<Order>('o');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .let('orders', new AQLBuilder<TestSchema>()
                    .for(o).in('orders')
                    .filter(o.userId.eq(u._id!))
                    .return(o).build())
                .return({ name: u.name, orders: ref<any>('orders') })
                .build();
            expect(query.query).toContain('LET orders = (FOR o IN orders');
            expect(query.query).toContain('FILTER (o.userId == u._id)');
        });
    });

    describe('4. Data Modification', () => {
        test('INSERT', () => {
            const query = new AQLBuilder<TestSchema>()
                .insert({ name: 'Alice', age: 30 })
                .into('users').build();
            expect(query.query).toContain('INSERT {\"name\": \"Alice\", \"age\": 30} INTO users');
        });

        test('UPDATE', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .filter(u.status!.eq('pending'))
                .updateWith(u, { status: 'active' })
                .build();
            expect(query.query).toContain('UPDATE u');
            expect(query.query).toContain('WITH {\"status\": \"active\"}');
        });

        test('REMOVE', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .filter(u.inactive!.eq(true))
                .remove(u).into('users').build();
            expect(query.query).toContain('REMOVE u IN users');
        });

        test('UPSERT', () => {
            const query = new AQLBuilder<TestSchema>()
                .upsert({ email: 'test@example.com' })
                .insert({ email: 'test@example.com', visits: 1 })
                .update({ visits: ref<any>('OLD.visits').add(1) })
                .into('users').build();
            expect(query.query).toContain('UPSERT {"email": "test@example.com"}');
            expect(query.query).toContain('INSERT {"email": "test@example.com", "visits": 1}');
            expect(query.query).toContain('UPDATE {"visits": (OLD.visits + @value0)}');
        });
    });

    describe('5. Complex Filters & Operators', () => {
        test('AND/OR combinations', () => {
            const p = ref<Product>('p');
            const query = new AQLBuilder<TestSchema>()
                .for(p).in('products')
                .filter(
                    p.category.eq('electronics')
                        .and(p.price.lt(1000).or(p.onSale!.eq(true)))
                )
                .return(p).build();
            expect(query.query).toContain('((p.category == @value0) && ((p.price < @value1) || (p.onSale == @value2)))');
            expect(query.bindVars).toEqual({ value0: 'electronics', value1: 1000, value2: true });
        });

        test('IN operator', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .filter(u.city!.in(['NYC', 'LA', 'SF']))
                .return(u).build();
            expect(query.query).toContain('u.city IN @inValues0');
            expect(query.bindVars['inValues0']).toEqual(['NYC', 'LA', 'SF']);
        });

        test('LIKE operator', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<TestSchema>()
                .for(u).in('users')
                .filter(u.email!.like('%@example.com'))
                .return(u).build();
            expect(query.query).toContain('(u.email LIKE @likePattern0)');
        });
    });

    describe('6. Graph Traversal', () => {
        test('basic graph traversal', () => {
            const query = new AQLBuilder<TestSchema>()
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

        test('Traversal OPTIONS', () => {
            const query = new AQLBuilder<TestSchema>()
                .forMultiple('v', 'e', 'p')
                .inGraph({
                    graph: 'social',
                    direction: 'OUTBOUND',
                    startVertex: 'users/123',
                    options: {
                        uniqueVertices: 'global',
                        bfs: true
                    }
                })
                .return('v');

            expect(query.build().query).toContain('OPTIONS {\"uniqueVertices\": \"global\", \"bfs\": true}');
        });

        test('PRUNE with callback syntax', () => {
            const query = new AQLBuilder<TestSchema>()
                .forMultiple('v', 'e', 'p')
                .inGraph({
                    graph: 'social',
                    direction: 'OUTBOUND',
                    startVertex: 'users/123'
                })
                .prune((v, _e, _p) => v.get('age').gt(10))
                .return('v');

            const result = query.build();
            expect(result.query).toContain('PRUNE (v.age > @value0)');
            expect(result.bindVars).toEqual({ value0: 10 });
        });

        test('PRUNE with ExpressionBuilder', () => {
            const query = new AQLBuilder<TestSchema>()
                .forMultiple('v', 'e', 'p')
                .inGraph({
                    graph: 'social',
                    direction: 'OUTBOUND',
                    startVertex: 'users/123'
                })
                .prune(AB.ref('v.deleted').eq(true))
                .return('v');

            const result = query.build();
            expect(result.query).toContain('PRUNE (v.deleted == @value0)');
            expect(result.bindVars).toEqual({ value0: true });
        });
    });

    describe('7. ArangoSearch', () => {
        function getAql(expr: ExpressionBuilder): string {
            const builder = new AQLBuilder().return(expr);
            return builder.toDebugString().replace(/^RETURN /, '');
        }

        test('ANALYZER function', () => {
            const expr = SearchFunctions.analyzer('doc.text', 'text_en');
            expect(getAql(expr)).toBe('ANALYZER(doc.text, "text_en")');
        });

        test('BOOST function', () => {
            const expr = SearchFunctions.boost('doc.title', 2.5);
            expect(getAql(expr)).toBe('BOOST(doc.title, 2.5)');
        });

        test('PHRASE function', () => {
            const expr = SearchFunctions.phrase('doc.text', 'hello world');
            expect(getAql(expr)).toBe('PHRASE(doc.text, "hello world")');
        });

        test('PHRASE function with analyzer', () => {
            const expr = SearchFunctions.phrase('doc.text', 'hello world', 'text_en');
            expect(getAql(expr)).toBe('PHRASE(doc.text, "hello world", "text_en")');
        });

        test('TOKENS function', () => {
            const expr = SearchFunctions.tokens('hello world', 'text_en');
            expect(getAql(expr)).toBe('TOKENS("hello world", "text_en")');
        });

        test('MIN_MATCH function', () => {
            const expr = SearchFunctions.minMatch('doc.text', '2', 'term1', 'term2', 'term3');
            expect(getAql(expr)).toBe('MIN_MATCH(doc.text, "2", term1, term2, term3)');
        });

        test('SEARCH clause', () => {
            const query = new AQLBuilder<any>()
                .for('doc').in('view_name')
                .search('view_name', SearchFunctions.phrase('doc.text', 'hello'))
                .return('doc')
                .build();
            expect(query.query).toContain('SEARCH view_name PHRASE(doc.text, @value0)');
        });
    });
});

describe('8. Advanced Features', () => {
    test('WINDOW clause', () => {
        const query = new AQLBuilder<any>()
            .for('doc').in('collection')
            .window(1, 1, SUM(AB.ref('doc.val')))
            .return('rolling')
            .build();

        expect(query.query).toContain('WINDOW {');
        expect(query.query).toContain('preceding: 1,');
        expect(query.query).toContain('following: 1');
        expect(query.query).toContain('AGGREGATE SUM(doc.val)');
    });

    test('WITH clause', () => {
        const query = new AQLBuilder<TestSchema>()
            .with('users', 'orders')
            .for('u').in('users')
            .return('u').build();
        expect(query.query).toBe('WITH users, orders\nFOR u IN users\nRETURN u');
    });

    test('Raw Queries', () => {
        const query = AQLBuilder.raw('FOR u IN users FILTER u.age > @age RETURN u', { age: 18 }).build();
        expect(query.query).toBe('FOR u IN users FILTER u.age > @age RETURN u');
        expect(query.bindVars).toEqual({ age: 18 });
    });
});

describe('9. OpenAPI Generation', () => {
    test('extract parameters from query', () => {
        const query = new AQLBuilder<TestSchema>()
            .for('u').in('users')
            .filter(ref('u.age').gt('@minAge'))
            .filter(ref('u.active').eq('@isActive'))
            .return('u');

        const spec = generateOpenApiSpec(query, {
            title: 'Filter Users',
            version: '1.0',
            path: '/users/filter',
            method: 'get'
        });

        const params = spec.paths['/users/filter']['get'].parameters;
        expect(params).toBeDefined();
        const paramNames = params!.map(p => p.name).sort();
        expect(paramNames).toEqual(['isActive', 'minAge']);
    });
});


