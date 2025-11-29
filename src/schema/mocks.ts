import { DatabaseSchema } from './types';

/**
 * Example schema used in scripts/generate-spec.ts
 * This is kept separate from test schemas as it's used for demonstration purposes
 */
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
