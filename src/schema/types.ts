/**
 * Schema Definitions for Type-Safe AQL
 */

/**
 * Base type for any document in a collection
 */
export interface DocumentSchema {
    _id?: string;
    _key?: string;
    _rev?: string;
    [key: string]: any;
}

/**
 * Base type for edge documents
 */
export interface EdgeSchema extends DocumentSchema {
    _from: string;
    _to: string;
}

/**
 * Represents the entire database schema
 * Keys are collection names, values are document types
 */
export interface DatabaseSchema { }

/**
 * Helper to extract keys from a schema
 */
export type CollectionKeys<D extends DatabaseSchema> = keyof D & string;

/**
 * Helper to get document type for a collection
 */
export type DocumentType<D extends DatabaseSchema, K extends keyof D> = D[K];

/**
 * Recursive type for dot-notation paths
 * e.g. 'user.address.city'
 */
export type Path<T> = T extends object
    ? {
        [K in keyof T]: K extends string
        ? T[K] extends Array<infer U>
        ? K | `${K}[*]` | `${K}[*].${Path<U>}`
        : K | `${K}.${Path<T[K]>}`
        : never;
    }[keyof T]
    : never;

/**
 * Valid AQL primitive values
 */
export type AqlValue = string | number | boolean | null | AqlValue[] | { [key: string]: AqlValue };
