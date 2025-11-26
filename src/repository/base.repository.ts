import { DatabaseSchema, DocumentType, AqlValue } from '../schema/types';
import { AQLBuilder } from '../core/aql.builder';
import { ExpressionBuilder, variable as newVar, ref as AB } from '../core/expression.builder';

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
    protected createBuilder(variable = 'doc'): AQLBuilder<Schema, Doc> {
        return new AQLBuilder<Schema, Doc>().for(variable).in(this.collection);
    }

    /**
     * Find all documents matching criteria
     */
    findAll(options: RepositoryOptions<Doc> = {}): AQLBuilder<Schema, Doc> {
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
            const returnObj = options.returnFields.reduce((acc, field) => {
                acc[field] = AB<any>(`${variable}.${field}`);
                return acc;
            }, {} as Record<string, any>);
            builder.return(returnObj);
        } else {
            builder.return(variable);
        }

        return builder;
    }

    /**
     * Find a single document
     */
    findOne(options: RepositoryOptions<Doc> = {}): AQLBuilder<Schema, Doc> {
        const builder = this.findAll({ ...options, limit: 1 });
        return builder;
    }

    /**
     * Find by ID (document key or _id)
     */
    findById(id: string): AQLBuilder<Schema, Doc> {
        return new AQLBuilder<Schema, Doc>()
            .return(AB<any>(`DOCUMENT('${this.collection}', '${id}')`));
    }

    /**
     * Create a new document
     */
    create(data: Partial<Doc>): AQLBuilder<Schema, Doc> {
        return new AQLBuilder<Schema, Doc>()
            .insert(data as AqlValue)
            .into(this.collection)
            .return('NEW');
    }

    /**
     * Update a document by key
     */
    update(key: string, data: Partial<Doc>): AQLBuilder<Schema, Doc> {
        return new AQLBuilder<Schema, Doc>()
            .in(this.collection)
            .updateWith(`"${key}"`, data as Record<string, AqlValue>)
            .return('NEW');
    }

    /**
     * Delete a document by key
     */
    delete(key: string): AQLBuilder<Schema, Doc> {
        return new AQLBuilder<Schema, Doc>()
            .remove(`"${key}"`)
            .into(this.collection)
            .return('OLD');
    }
}
