import { DatabaseSchema } from './types';

// From src/test/comprehensive.test.ts
export interface ComprehensiveTestSchema extends DatabaseSchema {
    users: {
        _id: string;
        name: string;
        email: string;
        age: number;
        active: boolean;
        tags: string[];
        address: {
            city: string;
            zip: string;
        };
    };
    orders: {
        _id: string;
        userId: string;
        amount: number;
        status: 'pending' | 'shipped' | 'delivered';
        items: Array<{ productId: string; quantity: number }>;
        createdAt: string;
    };
    products: {
        _id: string;
        name: string;
        price: number;
        category: string;
    };
}

// From src/test/runtime.test.ts
export interface RuntimeMockSchema extends DatabaseSchema {
    users: {
        _id: string;
        name: string;
        age: number;
    };
    orders: {
        _id: string;
        userId: string;
        amount: number;
    };
}

// From src/test/json-openapi.test.ts
export interface OpenApiMockSchema extends DatabaseSchema {
    users: {
        _id: string;
        name: string;
        email: string;
    };
}

// From src/scripts/generate-spec.ts
export interface AppSchema extends DatabaseSchema {
    users: {
        _id: string;
        name: string;
        email: string;
        age: number;
        active: boolean;
    };
    posts: {
        _id: string;
        title: string;
        content: string;
        authorId: string;
    };
}
