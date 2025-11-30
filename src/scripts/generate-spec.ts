import { AQLBuilder } from '../core/aql.builder';
import { generateOpenApiSpec, OpenApiOperation } from '../openapi/openapi.generator';
import { ref } from '../core/expression.builder';
import * as fs from 'fs';
import * as path from 'path';
import { AppSchema } from '../schema/mocks';

const operations: OpenApiOperation[] = [];

const getUsersQuery = new AQLBuilder<AppSchema>()
    .for('u')
    .in('users')
    .filter(ref('u.active').eq('@isActive'))
    .filter(ref('u.age').gte('@minAge'))
    .return(ref('u'));

operations.push(generateOpenApiSpec(getUsersQuery, {
    title: 'Get Users',
    version: '1.0.0',
    description: 'Retrieve a list of users with filtering',
    path: '/users',
    method: 'get',
    tags: ['Users']
}));

const getUserByIdQuery = new AQLBuilder<AppSchema>()
    .for('u')
    .in('users')
    .filter(ref('u._id').eq('@userId'))
    .return(ref('u'));

operations.push(generateOpenApiSpec(getUserByIdQuery, {
    title: 'Get User By ID',
    version: '1.0.0',
    description: 'Retrieve a single user by ID',
    path: '/users/{userId}',
    method: 'get',
    tags: ['Users']
}));

const openApiDoc = {
    openapi: '3.0.0',
    info: {
        title: 'My App API',
        version: '1.0.0',
        description: 'API generated from AQL queries'
    },
    paths: {} as Record<string, any>
};

operations.forEach(op => {
    Object.entries(op.paths).forEach(([pathKey, methods]) => {
        if (!openApiDoc.paths[pathKey]) {
            openApiDoc.paths[pathKey] = {};
        }
        Object.assign(openApiDoc.paths[pathKey], methods);
    });
});

// Write to file
const outputPath = path.join(process.cwd(), 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiDoc, null, 2));
console.log(`OpenAPI spec generated at ${outputPath}`);
