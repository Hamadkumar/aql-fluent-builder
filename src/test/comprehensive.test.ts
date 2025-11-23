import { AQLBuilder } from '../core/aql.builder';
import { ref, COUNT, SUM, AVERAGE, MIN, MAX, LIKE, REGEX_MATCH, WINDOW } from '../core/expression.builder';
import { generateOpenApiSpec } from '../openapi/openapi.generator';
import { ComprehensiveTestSchema } from '../schema/mocks';

// Mock Schema imported from mocks.ts

describe('Comprehensive AQL Builder Tests', () => {

    describe('Complex Filters', () => {
        test('should handle nested AND/OR conditions', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .for('u')
                .in('users')
                .filter(
                    ref('u.active').eq(true)
                        .and(
                            ref('u.age').gte(18).or(ref('u.age').lte(65))
                        )
                )
                .return(ref('u'))
                .build();

            expect(query.query).toContain('FILTER ((u.active == true) && ((u.age >= 18) || (u.age <= 65)))');
        });

        test('should handle array comparisons (IN, NOT IN)', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .for('u')
                .in('users')
                .filter(ref('u.address.city').in(['New York', 'London', 'Tokyo']))
                .filter(ref('u.tags').notIn(['banned', 'inactive']))
                .return(ref('u'))
                .build();

            expect(query.query).toContain('u.address.city IN @inValues0');
            expect(query.query).toContain('u.tags NOT IN @inValues1');
            expect(query.bindVars['inValues0']).toEqual(['New York', 'London', 'Tokyo']);
            expect(query.bindVars['inValues1']).toEqual(['banned', 'inactive']);
        });

        test('should handle LIKE and REGEX', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .for('u')
                .in('users')
                .filter(ref('u.email').like('%@example.com'))
                .filter(ref('u.name').regex('^John.*', 'i'))
                .return(ref('u'))
                .build();

            expect(query.query).toContain('(u.email LIKE @likePattern0)');
            expect(query.query).toContain('REGEX_MATCH(u.name, @regexPattern1, "i")');
            expect(query.bindVars['likePattern0']).toBe('%@example.com');
            expect(query.bindVars['regexPattern1']).toBe('^John.*');
        });
    });

    describe('Graph Traversal', () => {
        test('should generate valid graph traversal query', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .forMultiple('v', 'e', 'p')
                .inGraph({
                    graph: 'socialGraph',
                    direction: 'OUTBOUND',
                    startVertex: 'users/123',
                    minDepth: 1,
                    maxDepth: 3
                })
                .filter(ref('e.type').eq('friend'))
                .return({
                    friend: ref('v.name'),
                    path: ref('p')
                })
                .build();

            expect(query.query).toContain('FOR v, e, p IN 1..3 OUTBOUND "users/123" GRAPH "socialGraph"');
            expect(query.query).toContain('FILTER (e.type == "friend")');
        });
    });

    describe('Window Functions', () => {
        test('should generate WINDOW aggregation', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .for('o')
                .in('orders')
                .window(1, 1, AVERAGE(ref('o.amount')))
                .return(ref('o'))
                .build();

            // Note: The exact string representation depends on implementation details, 
            // but we check for key components
            expect(query.query).toContain('WINDOW {');
            expect(query.query).toContain('preceding: 1');
            expect(query.query).toContain('following: 1');
            expect(query.query).toContain('AGGREGATE AVERAGE(o.amount)');
        });
    });

    describe('Data Modification', () => {
        test('should generate INSERT query', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .insert({
                    name: 'New User',
                    email: 'new@example.com',
                    active: true
                })
                .into('users')
                .build();

            expect(query.query).toContain('INSERT {"name": "New User", "email": "new@example.com", "active": true} INTO users');
        });

        test('should generate UPSERT query', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .upsert({ email: 'test@example.com' })
                .insert({ email: 'test@example.com', visits: 1 })
                .update({ visits: ref('OLD.visits').add(1) })
                .into('users')
                .build();

            expect(query.query).toContain('UPSERT {"email": "test@example.com"}');
            expect(query.query).toContain('INSERT {"email": "test@example.com", "visits": 1}');
            expect(query.query).toContain('UPDATE {"visits": (OLD.visits + 1)}');
            expect(query.query).toContain('IN users');
        });
    });

    describe('JSON Serialization Round-Trip', () => {
        test('should support full round-trip serialization', () => {
            const original = new AQLBuilder<ComprehensiveTestSchema>()
                .for('u')
                .in('users')
                .filter(ref('u.age').gt(21))
                .collect({ city: 'u.address.city' })
                .count('count')
                .sort('count', 'DESC')
                .limit(10)
                .return({
                    city: ref('city'),
                    userCount: ref('count')
                });

            const json = original.toJSON();
            const restored = AQLBuilder.fromJSON(json);

            expect(json).toEqual(restored.toJSON());
            expect(original.toAql()).toBe(restored.toAql());
        });
    });

    describe('OpenAPI Generation', () => {
        test('should extract parameters correctly', () => {
            const query = new AQLBuilder<ComprehensiveTestSchema>()
                .for('u')
                .in('users')
                .filter(ref('u.age').gt('@minAge'))
                .filter(ref('u.active').eq('@isActive'))
                .return(ref('u'));

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

});
