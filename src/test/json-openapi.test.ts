import { AQLBuilder } from '../core/aql.builder';
import { ref } from '../core/expression.builder';
import { generateOpenApiSpec } from '../openapi/openapi.generator';
import { OpenApiMockSchema } from '../schema/mocks';

// Mock Schema imported from mocks.ts

describe('JSON Serialization & OpenAPI', () => {
    test('should serialize and deserialize query correctly', () => {
        const original = new AQLBuilder<OpenApiMockSchema>()
            .for('u')
            .in('users')
            .filter(ref('u.name').eq('John'))
            .return(ref('u'));

        const json = original.toJSON();
        const deserialized = AQLBuilder.fromJSON(json);

        expect(json).toEqual(deserialized.toJSON());
        expect(original.toAql()).toBe(deserialized.toAql());
    });

    test('should generate OpenAPI spec from query', () => {
        const query = new AQLBuilder<OpenApiMockSchema>()
            .for('u')
            .in('users')
            .filter(ref('u.email').eq('@email'))
            .return(ref('u'));

        const spec = generateOpenApiSpec(query, {
            title: 'GetUser',
            version: '1.0.0',
            path: '/users',
            method: 'get',
            description: 'Get user by email'
        });

        expect(spec.info.title).toBe('GetUser');
        expect(spec.paths['/users']['get'].summary).toBe('GetUser');

        // Check parameters
        const params = spec.paths['/users']['get'].parameters;
        expect(params).toBeDefined();
        expect(params).toHaveLength(1);
        expect(params![0].name).toBe('email');
        expect(params![0].in).toBe('query');
    });
});
