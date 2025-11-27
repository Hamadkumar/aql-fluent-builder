import { DatabaseSchema, DocumentType, AqlValue } from '../schema/types';
import { AQLBuilder } from '../core/aql.builder';
import { ExpressionBuilder, variable as newVar } from '../core/expression.builder';

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

export class BaseRepository<
    Schema extends DatabaseSchema,
    Collection extends keyof Schema & string,
    Doc = DocumentType<Schema, Collection>
> {
    constructor(protected readonly collection: Collection) { }

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
                builder.filter(options.filter(newVar<Doc>(variable)));
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
     * Execute a raw AQL query
     */
    query(aql: string, bindVars?: Record<string, unknown>): AQLBuilder<Schema> {
        return AQLBuilder.raw<Schema>(aql, bindVars);
    }
}
