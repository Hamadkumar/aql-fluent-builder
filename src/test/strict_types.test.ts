import { BaseRepository } from '../repository/base.repository';


interface User {
    _key: string;
    name: string;
    age: number;
    active: boolean;
}

interface Schema {
    users: User;
}

class UserRepository extends BaseRepository<Schema, 'users'> {
    constructor() {
        super('users');
    }
}

describe('Strict Type Checking Repro', () => {
    const repo = new UserRepository();

    it('should allow invalid types currently (but shouldn\'t)', () => {
        const query = repo.findAll({
            // @ts-expect-error - strict type checking should prevent string comparison with number field
            filter: (u) => u.get('age').gt('invalid_string')
        }).build();

        expect(query.bindVars).toEqual(expect.objectContaining({
            value0: 'invalid_string'
        }));
    });

    it('should allow valid types', () => {
        const query = repo.findAll({
            filter: (u) => u.get('age').gt(18)
        }).build();

        expect(query.bindVars).toEqual(expect.objectContaining({
            value0: 18
        }));
    });
});
