import { DatabaseSchema, EdgeSchema } from './types';

export interface User {
    _key: string;
    _id: string;
    name: string;
    email: string;
    age: number;
    active: boolean;
    tags: string[];
    address: {
        street: string;
        city: string;
        zip: string;
    };
}

export interface Post {
    _key: string;
    _id: string;
    title: string;
    content: string;
    authorId: string;
    published: boolean;
    likes: number;
}

export interface UserPosts extends EdgeSchema {
    type: 'authored' | 'liked';
}

export interface TestSchema extends DatabaseSchema {
    users: User;
    posts: Post;
    user_posts: UserPosts;
}
