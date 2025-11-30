import { AQLBuilder } from '../core/aql.builder';
import { ref } from '../core/expression.builder';
import { TestSchema, User } from '../schema/test-schemas';

describe('AST Serialization', () => {
    test('Basic Query Serialization', () => {
        const query = new AQLBuilder<TestSchema>()
            .for('u').in('users')
            .return('u');

        const json = query.toJSON();

        expect(json).toEqual({
            variable: 'u',
            collection: 'users',
            source: 'users',
            returnValue: 'u'
        });
    });

    test('Complex Query Serialization', () => {
        const u = ref<User>('u');
        const query = new AQLBuilder<TestSchema>()
            .for(u).in('users')
            .filter(u.age.gt(18))
            .sort('u.name', 'ASC')
            .limit(10)
            .return(u);

        const json = query.toJSON();

        expect(json).toMatchObject({
            variable: 'u',
            collection: 'users',
            source: 'users',
            filters: expect.any(Array),
            sorts: [{ field: 'u.name', direction: 'ASC' }],
            limit: 10,
            returnValue: { type: 'reference', name: 'u' }
        });

        const filter = json.filters![0];
        expect(filter).toEqual({
            type: 'binary',
            operator: '>',
            left: 'u.age',
            right: { type: 'literal', value: 18 }
        });
    });

    test('Round Trip Serialization', () => {
        const u = ref<User>('u');
        const original = new AQLBuilder<TestSchema>()
            .for(u).in('users')
            .filter(u.active.eq(true))
            .collect({ age: 'u.age' }).count('count').build()
            .return('count');

        const json = original.toJSON();
        const restored = AQLBuilder.fromJSON(json);
        const json2 = restored.toJSON();

        expect(json).toEqual(json2);
        expect(original.toAql()).toBe(restored.toAql());
    });

    test('Deserialization to AQL', () => {
        const json = {
            variable: 'u',
            collection: 'users',
            source: 'users',
            filters: [
                {
                    type: 'binary',
                    operator: '==',
                    left: { type: 'reference', name: 'u.name' },
                    right: { type: 'literal', value: 'Alice' }
                }
            ],
            returnValue: 'u'
        };

        // @ts-ignore - Manually constructing JSON might miss some optional fields but should be valid for deserialization
        const builder = AQLBuilder.fromJSON(json);
        const query = builder.build();

        expect(query.query).toContain('FOR u IN users');
        expect(query.query).toContain('FILTER (u.name == @value0)');
        expect(query.query).toContain('RETURN u');
        expect(query.bindVars).toEqual({ value0: 'Alice' });
    });

    test('WITH Clause Serialization', () => {
        const query = new AQLBuilder<TestSchema>()
            .with('users', 'orders')
            .for('u').in('users')
            .return('u');

        const json = query.toJSON();

        expect(json).toEqual({
            withCollections: ['users', 'orders'],
            variable: 'u',
            collection: 'users',
            source: 'users',
            returnValue: 'u'
        });

        const restored = AQLBuilder.fromJSON(json);
        expect(restored.toAql()).toBe('WITH users, orders\nFOR u IN users\nRETURN u');
    });
});
