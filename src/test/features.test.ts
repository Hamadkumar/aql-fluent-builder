import { AQLBuilder, AB } from '../core/aql.builder';
import { EdgeRepository } from '../repository/edge.repository';
import { DatabaseSchema, EdgeSchema } from '../schema/types';
import { generateOpenApiSpec } from '../openapi/openapi.generator';
import { ref } from '../core/expression.builder';

describe('AQL Features', () => {
    describe('Traversal OPTIONS', () => {
        test('OPTIONS in graph traversal', () => {
            const query = new AQLBuilder()
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

            expect(query.toAql()).toContain('OPTIONS {\"uniqueVertices\": \"global\", \"bfs\": true}');
        });

        test('empty OPTIONS', () => {
            const query = new AQLBuilder()
                .forMultiple('v', 'e', 'p')
                .inGraph({
                    graph: 'social',
                    direction: 'OUTBOUND',
                    startVertex: 'users/123'
                })
                .return('v');

            expect(query.toAql()).not.toContain('OPTIONS');
        });

        test('OPTIONS in EdgeRepository', () => {
            interface FriendsEdge extends EdgeSchema {
                since: string;
            }
            interface TestSchema extends DatabaseSchema {
                friends: FriendsEdge;
            }
            const repo = new EdgeRepository<TestSchema, 'friends'>('friends');

            const query = repo.outbound('users/123', {
                options: { bfs: true }
            }).return('v');

            expect(query.toAql()).toContain('OPTIONS {\"bfs\": true}');
        });
    });

    describe('PRUNE', () => {
        test('PRUNE with callback syntax', () => {
            const query = new AQLBuilder()
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
            const query = new AQLBuilder()
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

    describe('JSON Serialization', () => {
        test('round-trip query serialization', () => {
            const original = new AQLBuilder()
                .for('u').in('users')
                .filter(ref('u.age').gt(21));

            const json = original.toJSON();
            const restored = AQLBuilder.fromJSON(json);

            expect(json).toEqual(restored.toJSON());
        });
    });
});

describe('OpenAPI Generation', () => {
    test('extract parameters from query', () => {
        const query = new AQLBuilder()
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
