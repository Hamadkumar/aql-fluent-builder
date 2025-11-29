import { DatabaseSchema, DocumentType, AqlValue } from '../schema/types';
import { AQLBuilder } from '../core/aql.builder';
import { ExpressionBuilder, ref } from '../core/expression.builder';

export interface RepositoryOptions<T> {
    as?: string;
    filter?: ExpressionBuilder | ((doc: ExpressionBuilder<T>) => ExpressionBuilder);
    sort?: {
        field: keyof T & string;
        direction?: 'ASC' | 'DESC';
    }[];
    limit?: number;
    offset?: number;
    returnFields?: (keyof T & string)[];
}

export interface PaginationResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

export class BaseRepository<
    Schema extends DatabaseSchema,
    Collection extends keyof Schema & string,
    Doc = DocumentType<Schema, Collection>
> {
    constructor(public readonly collection: Collection) { }

    /**
     * Create a new query builder for this collection
     */
    protected createBuilder(variable = 'doc'): AQLBuilder<Schema> {
        return new AQLBuilder<Schema>().for(variable).in(this.collection);
    }

    /**
     * Find all documents matching criteria
     */
    findAll(options: RepositoryOptions<Doc> = {}): AQLBuilder<Schema> {
        const variable = options.as || 'doc';
        const builder = this.createBuilder(variable);

        if (options.filter) {
            if (typeof options.filter === 'function') {
                // AB now returns ExpressionBuilder<Doc>
                builder.filter(options.filter(ref<Doc>(variable)));
            } else {
                builder.filter(options.filter);
            }
        }

        if (options.sort) {
            for (const sort of options.sort) {
                builder.sort(`${variable}.${sort.field}`, sort.direction);
            }
        }

        if (options.limit) {
            builder.limit(options.limit, options.offset);
        }

        if (options.returnFields) {
            const returnObj: Record<string, unknown> = {};
            for (const field of options.returnFields) {
                returnObj[field as string] = new ExpressionBuilder({ type: 'reference', name: `${variable}.${field}` });
            }
            builder.return(returnObj);
        } else {
            builder.return(variable);
        }

        return builder;
    }

    /**
     * Find a single document
     */
    findOne(options: RepositoryOptions<Doc> = {}): AQLBuilder<Schema> {
        const builder = this.findAll({ ...options, limit: 1 });
        return builder;
    }

    /**
     * Find by ID (document key or _id)
     */
    findById(id: string): AQLBuilder<Schema> {
        return new AQLBuilder<Schema>()
            .return(new ExpressionBuilder({ type: 'reference', name: `DOCUMENT('${this.collection}', '${id}')` }));
    }

    /**
     * Create a new document
     */
    create(data: Partial<Doc>): AQLBuilder<Schema> {
        return new AQLBuilder<Schema>()
            .insert(data as AqlValue)
            .into(this.collection)
            .return('NEW');
    }

    /**
     * Update a document by key
     */
    update(key: string, data: Partial<Doc>): AQLBuilder<Schema> {
        return new AQLBuilder<Schema>()
            .in(this.collection)
            .updateWith(`"${key}"`, data as Record<string, AqlValue>)
            .return('NEW');
    }

    /**
     * Delete a document by key
     */
    delete(key: string): AQLBuilder<Schema> {
        return new AQLBuilder<Schema>()
            .remove(`"${key}"`)
            .into(this.collection)
            .return('OLD');
    }

    /**
     * Paginate through documents with metadata
     * Returns an array where first element contains { data, total, page, pageSize }
     * 
     * @param page - Page number (1-based)
     * @param pageSize - Number of items per page
     * @param options - Filter, sort, and other query options
     * @returns AQLBuilder that returns pagination result
     * 
     * @example
     * ```typescript
     * const query = userRepo.paginate(1, 10, {
     *   filter: (u) => u.get('age').gt(18),
     *   sort: [{ field: 'name', direction: 'ASC' }]
     * });
     * const result = await db.query(query.build());
     * // result[0] = { data: [...], total: 100, page: 1, pageSize: 10 }
     * ```
     */
    paginate(page: number, pageSize: number, options: RepositoryOptions<Doc> = {}): AQLBuilder<Schema> {
        const variable = options.as || 'doc';
        const builder = new AQLBuilder<Schema>();

        // Start with FOR loop
        builder.for(variable).in(this.collection);

        // Apply filter
        if (options.filter) {
            if (typeof options.filter === 'function') {
                builder.filter(options.filter(ref<Doc>(variable)));
            } else {
                builder.filter(options.filter);
            }
        }

        // Apply sorting BEFORE collecting (important for correct pagination)
        if (options.sort) {
            for (const sort of options.sort) {
                builder.sort(`${variable}.${sort.field}`, sort.direction);
            }
        }

        // Collect all filtered items into array
        builder.collect({}).into('allItems');

        // Calculate offset from page number (1-based)
        const offset = (Math.max(page, 1) - 1) * pageSize;

        // Build return object with pagination metadata
        const returnObj: Record<string, unknown> = {
            data: new ExpressionBuilder({
                type: 'reference',
                name: `SLICE(allItems, ${offset}, ${pageSize})`
            }),
            total: new ExpressionBuilder({
                type: 'reference',
                name: `LENGTH(allItems)`
            }),
            page: page,
            pageSize: pageSize
        };

        builder.return(returnObj);
        return builder;
    }

    /**
     * Batch insert documents
     */
    createMany(data: Partial<Doc>[]): AQLBuilder<Schema> {
        return AQLBuilder.raw<Schema>(
            `FOR doc IN @data INSERT doc INTO ${this.collection} RETURN NEW`,
            { data }
        );
    }

    /**
     * Batch update documents by key
     * Data must contain _key or _id
     */
    updateBatch(data: Partial<Doc>[]): AQLBuilder<Schema> {
        return AQLBuilder.raw<Schema>(
            `FOR doc IN @data UPDATE doc IN ${this.collection} RETURN NEW`,
            { data }
        );
    }

    /**
     * Batch delete documents by key
     */
    deleteBatch(keys: string[]): AQLBuilder<Schema> {
        return AQLBuilder.raw<Schema>(
            `FOR key IN @keys REMOVE key IN ${this.collection} RETURN OLD`,
            { keys }
        );
    }

    /**
     * Update multiple documents matching filter
     */
    updateMany(options: RepositoryOptions<Doc>, data: Partial<Doc>): AQLBuilder<Schema> {
        const variable = options.as || 'doc';
        const builder = this.createBuilder(variable);

        if (options.filter) {
            if (typeof options.filter === 'function') {
                builder.filter(options.filter(ref<Doc>(variable)));
            } else {
                builder.filter(options.filter);
            }
        }

        return builder
            .updateWith(variable, data as Record<string, AqlValue>)
            .into(this.collection)
            .return('NEW');
    }

    /**
     * Delete multiple documents matching filter
     */
    deleteMany(options: RepositoryOptions<Doc>): AQLBuilder<Schema> {
        const variable = options.as || 'doc';
        const builder = this.createBuilder(variable);

        if (options.filter) {
            if (typeof options.filter === 'function') {
                builder.filter(options.filter(ref<Doc>(variable)));
            } else {
                builder.filter(options.filter);
            }
        }

        return builder
            .remove(variable)
            .into(this.collection)
            .return('OLD');
    }

    /**
     * Count documents matching criteria
     */
    count(filter?: RepositoryOptions<Doc>['filter']): AQLBuilder<Schema> {
        const builder = this.createBuilder('doc');

        if (filter) {
            if (typeof filter === 'function') {
                builder.filter(filter(ref<Doc>('doc')));
            } else {
                builder.filter(filter);
            }
        }

        return (builder
            .collect({})
            .count('count')
            .build() as unknown as AQLBuilder<Schema>)
            .return('count');
    }

    /**
     * Check if a document exists by ID
     */
    exists(id: string): AQLBuilder<Schema> {
        return new AQLBuilder<Schema>()
            .return(
                new ExpressionBuilder({
                    type: 'function',
                    name: 'EXISTS',
                    args: [
                        {
                            type: 'reference',
                            name: `DOCUMENT('${this.collection}', '${id}')`
                        }
                    ]
                })
            );
    }

    /**
     * Upsert a document
     * @param search - Criteria to search for existing document
     * @param insert - Data to insert if not found
     * @param update - Data to update if found (or boolean/undefined to control behavior)
     *   - If object: Updates with this data
     *   - If true or undefined: Updates with 'insert' data
     *   - If false: Does not update (insert only)
     */
    upsert(search: Partial<Doc>, insert: Partial<Doc>, update?: Partial<Doc> | boolean): AQLBuilder<Schema> {
        const builder = new AQLBuilder<Schema>();

        let updateData: Partial<Doc> | Record<string, AqlValue> = {};

        if (update === false) {
            updateData = {}; // Empty update (effectively no-op if we could, but UPSERT requires UPDATE clause usually, or we use REPLACE)
            // Actually AQL UPSERT syntax is: UPSERT search INSERT insert UPDATE update IN collection
            // If we want "insert only", we might need a different approach or just update with empty? 
            // But UPDATE with empty object is valid.
        } else if (update === true || update === undefined) {
            updateData = insert;
        } else {
            updateData = update;
        }

        return (builder
            .upsert(search as AqlValue)
            .insert(insert as AqlValue)
            .update(updateData as Record<string, AqlValue>)
            .into(this.collection) as unknown as AQLBuilder<Schema>)
            .return('NEW');
    }

    /**
     * Get distinct values for a field
     */
    distinct(field: keyof Doc): AQLBuilder<Schema> {
        return this.createBuilder('doc')
            .return(
                new ExpressionBuilder({
                    type: 'function',
                    name: 'DISTINCT',
                    args: [
                        {
                            type: 'reference',
                            name: `doc.${field as string}`
                        }
                    ]
                })
            );
    }


    /**
     * Execute a raw AQL query
     */
    query(aql: string, bindVars?: Record<string, unknown>): AQLBuilder<Schema> {
        return AQLBuilder.raw<Schema>(aql, bindVars);
    }
}
