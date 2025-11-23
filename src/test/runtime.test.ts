import { AQLBuilder } from '../core/aql.builder';
import { ref, COUNT, SUM } from '../core/expression.builder';
import { RuntimeMockSchema } from '../schema/mocks';

// Mock Schema imported from mocks.ts

describe('AQL Builder Runtime Verification', () => {
    test('should build simple query with SafeUnknown types', () => {
        const query = new AQLBuilder<RuntimeMockSchema>()
            .for('u')
            .in('users')
            .filter(ref('u.age').gt(18))
            .return(ref('u'))
            .build();

        expect(query.query).toContain('FOR u IN users');
        expect(query.query).toContain('FILTER (u.age > 18)');
        expect(query.query).toContain('RETURN u');
    });

    test('should handle aggregates with SafeUnknown', () => {
        const query = new AQLBuilder<RuntimeMockSchema>()
            .for('o')
            .in('orders')
            .collect({ userId: 'o.userId' })
            .count('count')
            .sum('total', ref('o.amount'))
            .build()
            .build();

        expect(query.query).toContain('COLLECT userId = o.userId');
        expect(query.query).toContain('AGGREGATE count = COUNT(1), total = SUM(o.amount)');
    });

    test('should handle subqueries', () => {
        const query = new AQLBuilder<RuntimeMockSchema>()
            .for('u')
            .in('users')
            .let('orderCount',
                new AQLBuilder<RuntimeMockSchema>()
                    .for('o')
                    .in('orders')
                    .filter(ref('o.userId').eq(ref('u._id')))
                    .return(COUNT(1))
            )
            .return({
                name: ref('u.name'),
                count: ref('orderCount')
            })
            .build();

        const expectedSubquery = `LET orderCount = (FOR o IN orders
FILTER (o.userId == u._id)
RETURN COUNT(1))`;
        expect(query.query).toContain(expectedSubquery);
    });
});
