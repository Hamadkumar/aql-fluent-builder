import { BaseRepository } from '../repository/base.repository';
import { EdgeRepository } from '../repository/edge.repository';
import { AB } from '../core/aql.builder';
import { TestSchema } from '../schema/test-schemas';

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

        describe('1. Read Operations', () => {
            test('findAll with "as" option', () => {
                const result = repo.findAll({
                    as: 'u',
                    filter: (u) => u.get('age').gt(18)
                }).build();

                expect(result.query).toContain('FOR u IN users');
                expect(result.query).toContain('FILTER (u.age > @value0)');
                expect(result.query).toContain('RETURN u');
                expect(result.bindVars).toEqual({ value0: 18 });
            });

            test('findAll with filter, sort, limit', () => {
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

            test('exists', () => {
                const query = repo.exists('123').build();
                expect(query.query).toContain("RETURN EXISTS(DOCUMENT('users', '123'))");
            });

            test('count', () => {
                const query = repo.count(u => u.get('age').gt(18)).build();
                const normalizedQuery = query.query.replace(/\s+/g, ' ');
                expect(normalizedQuery).toContain('FOR doc IN users');
                expect(normalizedQuery).toContain('FILTER (doc.age > @value0)');
                expect(normalizedQuery).toContain('COLLECT AGGREGATE count = COUNT(1)');
                expect(normalizedQuery).toContain('RETURN count');
            });

            test('distinct', () => {
                const query = repo.distinct('role').build();
                expect(query.query).toContain('FOR doc IN users');
                expect(query.query).toContain('RETURN DISTINCT(doc.role)');
            });
        });

        describe('2. Write Operations', () => {
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

            test('upsert', () => {
                const query = repo.upsert(
                    { name: 'John' },
                    { name: 'John', age: 30 },
                    { age: 31 }
                ).build();
                expect(query.query).toContain('UPSERT {"name": "John"}');
                expect(query.query).toContain('INSERT {"name": "John", "age": 30}');
                expect(query.query).toContain('UPDATE {"age": 31}');
                expect(query.query).toContain('IN users');
            });
        });

        describe('3. Batch Operations', () => {
            test('createMany', () => {
                const data = [{ name: 'Alice', age: 20 }, { name: 'Bob', age: 30 }];
                const query = repo.createMany(data);
                const result = query.build();
                expect(result.query).toContain('FOR doc IN @data INSERT doc INTO users RETURN NEW');
                expect(result.bindVars).toEqual({ data });
            });

            test('updateBatch', () => {
                const data = [{ _id: '1', age: 21 }, { _id: '2', age: 31 }];
                const query = repo.updateBatch(data);
                const result = query.build();
                expect(result.query).toContain('FOR doc IN @data UPDATE doc IN users RETURN NEW');
                expect(result.bindVars).toEqual({ data });
            });

            test('deleteBatch', () => {
                const keys = ['1', '2'];
                const query = repo.deleteBatch(keys);
                const result = query.build();
                expect(result.query).toContain('FOR key IN @keys REMOVE key IN users RETURN OLD');
                expect(result.bindVars).toEqual({ keys });
            });

            test('updateMany', () => {
                const query = repo.updateMany({
                    filter: (u) => u.get('age').lt(20)
                }, { active: true });
                const result = query.build();
                expect(result.query).toContain('FOR doc IN users');
                expect(result.query).toContain('FILTER (doc.age < @value0)');
                expect(result.query).toContain('UPDATE doc');
                expect(result.query).toContain('WITH {\"active\": true}');
            });

            test('deleteMany', () => {
                const query = repo.deleteMany({
                    filter: (u) => u.get('active').eq(false)
                });
                const result = query.build();
                expect(result.query).toContain('FOR doc IN users');
                expect(result.query).toContain('FILTER (doc.active == @value0)');
                expect(result.query).toContain('REMOVE doc');
            });
        });

        describe('4. Pagination', () => {
            test('paginate with filter', () => {
                const query = repo.paginate(1, 10, { filter: u => u.get('age').gt(18) }).build();
                expect(query.query).toContain('FILTER (doc.age > @value0)');
                expect(query.query).toContain('SLICE(allItems, 0, 10)');
                expect(query.query).toContain('LENGTH(allItems)');
            });

            test('paginate page 2', () => {
                const query = repo.paginate(2, 10);
                const result = query.build();
                expect(result.query).toContain('SLICE(allItems, 10, 10)');
            });
        });

        describe('5. Raw Queries', () => {
            test('query method', () => {
                const query = repo.query('FOR u IN users FILTER u.age > @age RETURN u', { age: 18 });
                const result = query.build();
                expect(result.query).toBe('FOR u IN users FILTER u.age > @age RETURN u');
                expect(result.bindVars).toEqual({ age: 18 });
            });
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
        });

        test('named graph', () => {
            const query = repo.outbound('users/123', { graph: 'socialGraph' });
            const aql = query.toAql();
            expect(aql).toContain('GRAPH \"socialGraph\"');
        });

        test('traversal with options', () => {
            const query = repo.outbound('users/123', {
                options: { bfs: true }
            }).return('v');
            expect(query.toAql()).toContain('OPTIONS {\"bfs\": true}');
        });
    });
});
