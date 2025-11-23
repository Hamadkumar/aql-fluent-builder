import { AQLBuilder } from '../core/aql.builder';
import { ref } from '../core/expression.builder';
import { TestSchema } from '../schema/test-schema';

describe('Generic AQL Builder Tests', () => {

    test('Basic Select with Typed Collection', () => {
        const query = new AQLBuilder<TestSchema>()
            .for('u')
            .in('users')
            .return('u')
            .build();

        expect(query.query).toContain('FOR u IN users');
    });

    test('Filtering with Typed Fields', () => {
        const query = new AQLBuilder<TestSchema>()
            .for('u')
            .in('users')
            .filter(
                ref<TestSchema['users']>('u.age').gt(18)
                    .and(ref<TestSchema['users']>('u.active').eq(true))
            )
            .return('u')
            .build();

        const aql = query.query;
        expect(aql).toContain('FILTER ((u.age > 18) && (u.active == true))');
    });

    test('Nested Field Access', () => {
        const query = new AQLBuilder<TestSchema>()
            .for('u')
            .in('users')
            .filter(ref<TestSchema['users']>('u.address.city').eq('New York'))
            .return('u')
            .build();

        expect(query.query).toContain('FILTER (u.address.city == "New York")');
    });

    test('Edge Traversal', () => {
        const query = new AQLBuilder<TestSchema>()
            .forMultiple('v', 'e', 'p')
            .inGraph({
                graph: 'socialGraph',
                direction: 'OUTBOUND',
                startVertex: 'users/123'
            })
            .filter(ref<TestSchema['user_posts']>('e.type').eq('authored'))
            .return('v')
            .build();

        expect(query.query).toContain('FILTER (e.type == "authored")');
    });

});
