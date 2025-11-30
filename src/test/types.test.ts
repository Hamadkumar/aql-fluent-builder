import { AQLBuilder } from '../core/aql.builder';
import { ref } from '../core/expression.builder';
import { ComplexTestSchema, User, FriendsEdge as FriendEdge, PurchaseEdge } from '../schema/test-schemas';

describe('Comprehensive Type Safety Tests', () => {

    describe('1. Collection Safety', () => {
        test('should accept valid collection names in .in()', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .return(u).build();

            expect(query.query).toBe('FOR u IN users\nRETURN u');
        });

        test('should accept valid edge collection names in .in()', () => {
            const e = ref<FriendEdge>('e');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(e).in('friends')
                .return(e).build();

            expect(query.query).toBe('FOR e IN friends\nRETURN e');
        });

    });

    describe('2. Field Safety', () => {
        test('should correctly handle primitive fields', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .filter(u.age.gt(18).and(u.name.eq('Alice')))
                .return(u).build();

            expect(query.query).toContain('((u.age > @value0) && (u.name == @value1))');
        });

        test('should correctly handle boolean fields', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .filter(u.isActive!.eq(true))
                .return(u).build();

            expect(query.query).toContain('(u.isActive == @value0)');
        });

        test('should correctly handle nested object fields', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .filter(u.address!.city.eq('New York'))
                .return(u).build();

            expect(query.query).toContain('(u.address.city == @value0)');
        });

        test('should correctly handle optional nested fields', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .filter(u.metadata!.source.eq('web'))
                .return(u).build();

            expect(query.query).toContain('(u.metadata.source == @value0)');
        });

        test('should correctly handle array fields', () => {
            const u = ref<User>('u');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .filter(u.role!.in(['admin', 'editor']))
                .return(u).build();

            expect(query.query).toContain('u.role IN @inValues0');
        });
    });

    describe('3. Edge Safety', () => {
        test('should access standard edge fields (_from, _to)', () => {
            const e = ref<FriendEdge>('e');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(e).in('friends')
                .filter(e._from.eq('users/1'))
                .filter(e._to.eq('users/2'))
                .return(e).build();

            expect(query.query).toContain('(e._from == @value0)');
            expect(query.query).toContain('(e._to == @value1)');
        });

        test('should access custom edge properties', () => {
            const e = ref<FriendEdge>('e');
            const query = new AQLBuilder<ComplexTestSchema>()
                .for(e).in('friends')
                .filter(e.strength!.gt(5))
                .return(e).build();

            expect(query.query).toContain('(e.strength > @value0)');
        });
    });

    describe('4. Complex Interactions', () => {
        test('should handle joins between collections', () => {
            const u = ref<User>('u');
            const pur = ref<PurchaseEdge>('pur');

            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .for(pur).in('purchases')
                .filter(pur._from.eq(u._id!))
                .return({ user: u.name, amount: pur.amount }).build();

            expect(query.query).toContain('FOR u IN users');
            expect(query.query).toContain('FOR pur IN purchases');
            expect(query.query).toContain('FILTER (pur._from == u._id)');
            expect(query.query).toContain('RETURN {"user": u.name, "amount": pur.amount}');
        });

        test('should handle graph traversal with typed start vertex', () => {
            const u = ref<User>('u');
            const v = ref<User>('v');
            const e = ref<FriendEdge>('e');

            const query = new AQLBuilder<ComplexTestSchema>()
                .for(u).in('users')
                .filter(u._id!.eq('users/123'))
                .forMultiple(v, e).inGraph({
                    graph: 'friendGraph',
                    direction: 'OUTBOUND',
                    startVertex: u._id!
                })
                .return(v).build();

            expect(query.query).toContain('FOR v, e IN 1..1 OUTBOUND u._id GRAPH "friendGraph"');
        });
    });
});
