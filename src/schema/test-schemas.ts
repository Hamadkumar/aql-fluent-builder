import { DatabaseSchema, EdgeSchema } from './types';

/**
 * Consolidated Test Schemas
 * Used across multiple test files to ensure consistency
 */

export interface Address {
    street: string;
    city: string;
    zip: number | string;
}

export interface User {
    _id?: string;
    _key?: string;
    name: string;
    age: number;
    email?: string;
    active: boolean;
    inactive?: boolean;
    role?: string;
    isActive?: boolean;
    country?: string;
    city?: string;
    visits?: number;
    status?: string;
    tags?: string[];
    address?: Address;
    metadata?: {
        lastLogin: string;
        source: string;
    };
}

export interface Order {
    _id?: string;
    _key?: string;
    userId: string;
    amount: number;
    status: string;
}

export interface Product {
    _id?: string;
    _key?: string;
    title?: string;
    name?: string;
    category: string;
    price: number;
    stock?: number;
    onSale?: boolean;
}

export interface FriendsEdge extends EdgeSchema {
    since: string;
    strength?: number;
}

export interface SocialEdge extends EdgeSchema {
    type: string;
}

export interface PurchaseEdge extends EdgeSchema {
    amount: number;
    date: string;
}

export interface TestSchema extends DatabaseSchema {
    users: User;
    orders?: Order;
    products?: Product;
    social?: SocialEdge;
    friends?: FriendsEdge;
}

/**
 * Complex test schema for comprehensive type safety tests
 */
export interface ComplexTestSchema extends DatabaseSchema {
    users: User;
    products: Product;
    friends: FriendsEdge;
    purchases: PurchaseEdge;
}
