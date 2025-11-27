import { BaseRepository } from '../repository/base.repository';
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
}

interface TestSchema extends DatabaseSchema {
    users: User;
    friends: FriendsEdge;
}

class UserRepository extends BaseRepository<TestSchema, 'users'> {
    constructor() {
        super('users');
    }
}

class FriendsRepository extends EdgeRepository<TestSchema, 'friends'> {
    constructor() {
        super('friends');
    }
}

describe('Repository Pattern', () => {
    describe('BaseRepository', () => {
        let repo: UserRepository;

        beforeEach(() => {
            repo = new UserRepository();
        });

        test('findAll with "as" option should generate correct AQL', () => {
            const repo = new UserRepository();
            const result = repo.findAll({
                as: 'u',
                filter: (u) => u.get('age').gt(18)
            }).build();

            expect(result.query).toContain('FOR u IN users');
            expect(result.query).toContain('FILTER (u.age > @value0)');
            expect(result.query).toContain('RETURN u');
            expect(result.bindVars).toEqual({ value0: 18 });
        });

        test('should support raw AQL queries', () => {
            const repo = new UserRepository();
            const query = repo.query('FOR u IN users FILTER u.age > @age RETURN u', { age: 18 });

            const result = query.build();
            expect(result.query).toBe('FOR u IN users FILTER u.age > @age RETURN u');
            expect(result.bindVars).toEqual({ age: 18 });
        });

        test('findAll with filter', () => {
            const query = repo.findAll({
                filter: (doc) => doc.get('age').gt(18),
                sort: [{ field: 'name', direction: 'ASC' }],
                limit: 10,
                returnFields: ['name', 'age']
            });
            const result = query.build();
            expect(result.query).toContain('FOR doc IN users');
            expect(result.query).toContain('FILTER (doc.age > @value0)');
            expect(result.query).toContain('SORT doc.name ASC');
            expect(result.query).toContain('LIMIT 0, 10');
            expect(result.query).toContain('RETURN {\"name\": doc.name, \"age\": doc.age}');
            expect(result.bindVars).toEqual({ value0: 18 });
        });

        test('findOne', () => {
            const query = repo.findOne({
                filter: (doc) => doc.get('name').eq('Alice')
            });
            const aql = query.toAql();
            expect(aql).toContain('LIMIT 0, 1');
        });

        test('findById', () => {
            const query = repo.findById('123');
            const aql = query.toAql();
            expect(aql).toContain("DOCUMENT('users', '123')");
        });

        test('create', () => {
            const query = repo.create({ name: 'Bob', age: 30 });
            const aql = query.toAql();
            expect(aql).toContain('INSERT {\"name\": \"Bob\", \"age\": 30}');
            expect(aql).toContain('INTO users');
        });

        test('update', () => {
            const query = repo.update('123', { age: 31 });
            const aql = query.toAql();
            expect(aql).toContain('UPDATE \"123\"');
            expect(aql).toContain('WITH {\"age\": 31}');
        });

        test('delete', () => {
            const query = repo.delete('123');
            const aql = query.toAql();
            expect(aql).toContain('REMOVE \"123\"');
        });
    });

    describe('EdgeRepository', () => {
        let repo: FriendsRepository;

        beforeEach(() => {
            repo = new FriendsRepository();
        });

        test('outbound traversal', () => {
            const query = repo.outbound('users/123');
            const aql = query.toAql();
            expect(aql).toContain('FOR v, e, p IN');
            expect(aql).toContain('1..1 OUTBOUND');
            expect(aql).toContain('\"users/123\"');
            expect(aql).toContain('GRAPH \"friends\"');
        });

        test('inbound traversal with depth', () => {
            const query = repo.inbound('users/456', { minDepth: 2, maxDepth: 4 });
            const aql = query.toAql();
            expect(aql).toContain('2..4 INBOUND');
        });

        test('any direction traversal', () => {
            const query = repo.any('users/789', { maxDepth: 3 });
            const aql = query.toAql();
            expect(aql).toContain('1..3 ANY');
        });

        test('traversal with filters', () => {
            const query = repo
                .outbound('users/123', { maxDepth: 2 })
                .filter(AB.ref('v.active').eq(true))
                .return('v');
            const result = query.build();
            expect(result.query).toContain('FILTER (v.active == @value0)');
            expect(result.query).toContain('RETURN v');
            expect(result.bindVars).toEqual({ value0: true });
        });

        test('named graph', () => {
            const query = repo.outbound('users/123', { graph: 'socialGraph' });
            const aql = query.toAql();
            expect(aql).toContain('GRAPH \"socialGraph\"');
        });

        test('expression as start vertex', () => {
            const query = repo.outbound(AB.ref('user._id'));
            const aql = query.toAql();
            expect(aql).toContain('user._id');
        });
    });
});
