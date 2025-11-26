import { EdgeRepository } from '../repository/edge.repository';
import { DatabaseSchema, EdgeSchema } from '../schema/types';
import { AB } from '../core/aql.builder';

interface User {
    name: string;
    age: number;
    active: boolean;
    _id: string;
}

interface FriendsEdge extends EdgeSchema {
    since: string;
    strength: number;
}

interface FollowsEdge extends EdgeSchema {
    followedAt: string;
}

interface TestSchema extends DatabaseSchema {
    users: User;
    friends: FriendsEdge;
    follows: FollowsEdge;
}

class FriendsRepository extends EdgeRepository<TestSchema, 'friends'> {
    constructor() {
        super('friends');
    }
}

class FollowsRepository extends EdgeRepository<TestSchema, 'follows'> {
    constructor() {
        super('follows');
    }
}

describe('EdgeRepository', () => {
    let friendsRepo: FriendsRepository;
    let followsRepo: FollowsRepository;

    beforeEach(() => {
        friendsRepo = new FriendsRepository();
        followsRepo = new FollowsRepository();
    });

    describe('traversal', () => {
        test('should generate basic outbound traversal AQL', () => {
            const query = friendsRepo.traversal('users/123', 'OUTBOUND');
            const aql = query.toAql();

            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('1..1 OUTBOUND');
            expect(aql).toContain('"users/123"');
            expect(aql).toContain('GRAPH "friends"');
        });

        test('should generate inbound traversal AQL', () => {
            const query = friendsRepo.traversal('users/456', 'INBOUND');
            const aql = query.toAql();

            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('1..1 INBOUND');
            expect(aql).toContain('"users/456"');
            expect(aql).toContain('GRAPH "friends"');
        });

        test('should generate any direction traversal AQL', () => {
            const query = friendsRepo.traversal('users/789', 'ANY');
            const aql = query.toAql();

            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('1..1 ANY');
            expect(aql).toContain('"users/789"');
            expect(aql).toContain('GRAPH "friends"');
        });

        test('should support custom depth range', () => {
            const query = friendsRepo.traversal('users/123', 'OUTBOUND', {
                minDepth: 1,
                maxDepth: 3
            });
            const aql = query.toAql();

            expect(aql).toContain('1..3 OUTBOUND');
        });

        test('should support single depth', () => {
            const query = friendsRepo.traversal('users/123', 'OUTBOUND', {
                minDepth: 2,
                maxDepth: 2
            });
            const aql = query.toAql();

            expect(aql).toContain('2..2 OUTBOUND');
        });

        test('should support named graph', () => {
            const query = friendsRepo.traversal('users/123', 'OUTBOUND', {
                graph: 'socialGraph'
            });
            const aql = query.toAql();

            expect(aql).toContain('GRAPH "socialGraph"');
        });

        test('should support expression as start vertex', () => {
            const query = friendsRepo.traversal(AB.ref('user._id'), 'OUTBOUND');
            const aql = query.toAql();

            expect(aql).toContain('user._id');
            expect(aql).toContain('OUTBOUND');
        });
    });

    describe('outbound', () => {
        test('should generate outbound traversal AQL', () => {
            const query = friendsRepo.outbound('users/123');
            const aql = query.toAql();

            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('OUTBOUND');
            expect(aql).toContain('"users/123"');
        });

        test('should support depth options', () => {
            const query = friendsRepo.outbound('users/123', { maxDepth: 5 });
            const aql = query.toAql();

            expect(aql).toContain('1..5 OUTBOUND');
        });

        test('should chain with filter and return', () => {
            const query = friendsRepo
                .outbound('users/123', { maxDepth: 2 })
                .filter(AB.ref('v.active').eq(true))
                .return('v');
            const aql = query.toAql();

            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('1..2 OUTBOUND');
            expect(aql).toContain('FILTER (v.active == true)');
            expect(aql).toContain('RETURN v');
        });

        test('should return vertex and edge info', () => {
            const query = friendsRepo
                .outbound('users/123')
                .return({
                    vertex: AB.ref('v'),
                    edge: AB.ref('e'),
                    path: AB.ref('p')
                });
            const aql = query.toAql();

            expect(aql).toContain('RETURN {"vertex": v, "edge": e, "path": p}');
        });
    });

    describe('inbound', () => {
        test('should generate inbound traversal AQL', () => {
            const query = followsRepo.inbound('users/456');
            const aql = query.toAql();

            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('INBOUND');
            expect(aql).toContain('"users/456"');
        });

        test('should support depth options', () => {
            const query = followsRepo.inbound('users/456', { minDepth: 2, maxDepth: 4 });
            const aql = query.toAql();

            expect(aql).toContain('2..4 INBOUND');
        });

        test('should chain with filters', () => {
            const query = followsRepo
                .inbound('users/456')
                .filter(AB.ref('e.followedAt').gt('2023-01-01'))
                .return('v');
            const aql = query.toAql();

            expect(aql).toContain('FILTER (e.followedAt > "2023-01-01")');
        });
    });

    describe('any', () => {
        test('should generate any direction traversal AQL', () => {
            const query = friendsRepo.any('users/789');
            const aql = query.toAql();

            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('ANY');
            expect(aql).toContain('"users/789"');
        });

        test('should support depth options', () => {
            const query = friendsRepo.any('users/789', { maxDepth: 3 });
            const aql = query.toAql();

            expect(aql).toContain('1..3 ANY');
        });

        test('should chain with complex filters', () => {
            const query = friendsRepo
                .any('users/789', { maxDepth: 2 })
                .filter(
                    AB.ref('v.active').eq(true)
                        .and(AB.ref('e.strength').gt(5))
                )
                .return({
                    user: AB.ref('v'),
                    relationship: AB.ref('e')
                });
            const aql = query.toAql();

            expect(aql).toContain('1..2 ANY');
            expect(aql).toContain('FILTER ((v.active == true) && (e.strength > 5))');
            expect(aql).toContain('RETURN {"user": v, "relationship": e}');
        });
    });

    describe('complex traversal scenarios', () => {
        test('should support multi-hop friend discovery', () => {
            // Find friends of friends
            const query = friendsRepo
                .outbound('users/123', { minDepth: 2, maxDepth: 2 })
                .filter(AB.ref('v._id').neq('users/123')) // Exclude self
                .return('DISTINCT v');
            const aql = query.toAql();

            expect(aql).toContain('2..2 OUTBOUND');
            expect(aql).toContain('FILTER (v._id != "users/123")');
            expect(aql).toContain('RETURN DISTINCT v');
        });

        test('should support follower count aggregation', () => {
            // Count followers using inbound traversal
            const query = followsRepo
                .inbound('users/456')
                .collect({ count: 1 })
                .count('followerCount')
                .build();
            const aql = query.toAql();

            expect(aql).toContain('INBOUND');
            expect(aql).toContain('COLLECT');
            expect(aql).toContain('followerCount = COUNT(1)');
        });

        test('should support path filtering', () => {
            const query = friendsRepo
                .outbound('users/123', { maxDepth: 3 })
                .filter(AB.ref('LENGTH(p.edges)').lte(3))
                .return({
                    vertex: AB.ref('v'),
                    pathLength: AB.ref('LENGTH(p.edges)')
                });
            const aql = query.toAql();

            expect(aql).toContain('1..3 OUTBOUND');
            expect(aql).toContain('FILTER (LENGTH(p.edges) <= 3)');
        });

        test('should support named graph traversal', () => {
            const query = friendsRepo
                .outbound('users/123', { graph: 'socialNetwork', maxDepth: 2 })
                .return('v');
            const aql = query.toAql();

            expect(aql).toContain('GRAPH "socialNetwork"');
            expect(aql).not.toContain('GRAPH "friends"');
        });
    });

    describe('type safety', () => {
        test('EdgeRepository should extend BaseRepository', () => {
            expect(friendsRepo).toBeInstanceOf(EdgeRepository);
        });

        test('should have all repository methods', () => {
            expect(typeof friendsRepo.findAll).toBe('function');
            expect(typeof friendsRepo.findOne).toBe('function');
            expect(typeof friendsRepo.findById).toBe('function');
            expect(typeof friendsRepo.create).toBe('function');
            expect(typeof friendsRepo.update).toBe('function');
            expect(typeof friendsRepo.delete).toBe('function');
        });

        test('should have traversal methods', () => {
            expect(typeof friendsRepo.traversal).toBe('function');
            expect(typeof friendsRepo.outbound).toBe('function');
            expect(typeof friendsRepo.inbound).toBe('function');
            expect(typeof friendsRepo.any).toBe('function');
        });
    });
});
