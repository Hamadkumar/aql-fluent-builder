import { BaseRepository } from '../repository/base.repository';
import { DatabaseSchema } from '../schema/types';
import { AB } from '../core/aql.builder';

interface User {
    name: string;
    age: number;
    active: boolean;
    _id: string;
}

interface Order {
    id: string;
    userId: string;
    total: number;
}

interface Post {
    id: string;
    userId: string;
    title: string;
    _id: string;
}

interface TestSchema extends DatabaseSchema {
    users: User;
    orders: Order;
    posts: Post;
}

class UserRepository extends BaseRepository<TestSchema, 'users'> {
    constructor() {
        super('users');
    }
}

describe('BaseRepository', () => {
    let repo: UserRepository;

    beforeEach(() => {
        repo = new UserRepository();
    });

    test('findAll should generate correct AQL', () => {
        const query = repo.findAll({
            filter: AB.ref('doc.age').gt(18),
            sort: [{ field: 'name', direction: 'ASC' }],
            limit: 10,
            returnFields: ['name', 'age']
        });

        const aql = query.toAql();
        expect(aql).toContain('FOR doc IN users');
        expect(aql).toContain('FILTER (doc.age > 18)');
        expect(aql).toContain('SORT doc.name ASC');
        expect(aql).toContain('LIMIT 0, 10');
        expect(aql).toContain('RETURN {"name": doc.name, "age": doc.age}');
    });

    test('findOne should generate correct AQL', () => {
        const query = repo.findOne({
            filter: AB.ref('doc.name').eq('Alice')
        });

        const aql = query.toAql();
        expect(aql).toContain('FOR doc IN users');
        expect(aql).toContain('FILTER (doc.name == "Alice")');
        expect(aql).toContain('LIMIT 0, 1');
        expect(aql).toContain('RETURN doc');
    });

    test('findById should generate correct AQL', () => {
        const query = repo.findById('123');
        const aql = query.toAql();
        expect(aql).toContain('RETURN DOCUMENT(\'users\', \'123\')');
    });

    test('create should generate correct AQL', () => {
        const query = repo.create({ name: 'Bob', age: 30 });
        const aql = query.toAql();
        expect(aql).toContain('INSERT {"name": "Bob", "age": 30}');
        expect(aql).toContain('INTO users');
        expect(aql).toContain('RETURN NEW');
    });

    test('update should generate correct AQL', () => {
        const query = repo.update('123', { age: 31 });
        const aql = query.toAql();
        expect(aql).toContain('UPDATE "123"');
        expect(aql).toContain('WITH {"age": 31}');
        expect(aql).toContain('IN users');
        expect(aql).toContain('RETURN NEW');
    });

    test('delete should generate correct AQL', () => {
        const query = repo.delete('123');
        const aql = query.toAql();
        expect(aql).toContain('REMOVE "123"');
        expect(aql).toContain('IN users');
        expect(aql).toContain('RETURN OLD');
    });

    it('findAll should generate correct AQL', () => {
        const repo = new UserRepository();
        const aql = repo.findAll({
            filter: (doc) => doc.get('age').gt(18),
            sort: [{ field: 'name', direction: 'ASC' }],
            limit: 10,
            returnFields: ['name', 'age']
        }).toAql();

        expect(aql).toContain('FOR doc IN users');
        expect(aql).toContain('FILTER (doc.age > 18)');
        expect(aql).toContain('SORT doc.name ASC');
        expect(aql).toContain('LIMIT 0, 10');
        expect(aql).toContain('RETURN {"name": doc.name, "age": doc.age}');
    });

    it('should support joins using join method', () => {
        const repo = new UserRepository();
        const aql = repo.findAll()
            .join('posts', 'post')
            .filter(AB.var<User>('doc').get('_id').eq(AB.var<Post>('post').get('userId')))
            .return('doc')
            .toAql();

        expect(aql).toContain('FOR doc IN users');
        expect(aql).toContain('FOR post IN posts');
        expect(aql).toContain('FILTER (doc._id == post.userId)');
        expect(aql).toContain('RETURN doc');
    });

    it('findAll with "as" option should generate correct AQL', () => {
        const repo = new UserRepository();
        const aql = repo.findAll({
            as: 'u',
            filter: (u) => u.get('age').gt(18)
        }).toAql();

        expect(aql).toContain('FOR u IN users');
        expect(aql).toContain('FILTER (u.age > 18)');
        expect(aql).toContain('RETURN u');
    });
});
