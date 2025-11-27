import { DatabaseSchema, EdgeSchema, DocumentType } from '../schema/types';
import { BaseRepository } from './base.repository';
import { AQLBuilder } from '../core/aql.builder';
import { ExpressionBuilder } from '../core/expression.builder';
import { AqlTraversalOptions } from '../core/core.types';

export interface TraversalOptions {
    minDepth?: number;
    maxDepth?: number;
    graph?: string;
    options?: AqlTraversalOptions;
}

/**
 * Repository for Edge collections with type-safe traversal support
 *
 * Edge collections in ArangoDB are special collections that store edges connecting
 * vertices in a graph. This repository extends BaseRepository with graph traversal
 * capabilities.
 *
 * @example
 * ```typescript
 * interface FriendsEdge extends EdgeSchema {
 *   since: string;
 * }
 *
 * interface MySchema extends DatabaseSchema {
 *   friends: FriendsEdge;
 *   users: User;
 * }
 *
 * const friendsRepo = new EdgeRepository<MySchema, 'friends'>('friends');
 *
 * // Traverse outbound from a user
 * const query = friendsRepo.outbound('users/123', { maxDepth: 2 });
 * ```
 */
export class EdgeRepository<
    Schema extends DatabaseSchema,
    Collection extends keyof Schema & string,
    Doc extends EdgeSchema = DocumentType<Schema, Collection> & EdgeSchema
> extends BaseRepository<Schema, Collection, Doc> {

    constructor(collection: Collection) {
        super(collection);
    }

    /**
     * Start a graph traversal from this edge collection
     *
     * Creates a query with FOR v, e, p IN minDepth..maxDepth DIRECTION startVertex syntax.
     * Returns a builder with vertex (v), edge (e), and path (p) variables available.
     *
     * @param startVertex - Starting vertex ID or expression (e.g., "users/123" or AB.ref('doc._id'))
     * @param direction - Traversal direction: OUTBOUND, INBOUND, or ANY
     * @param options - Additional options like depth and graph name
     * @returns AQLBuilder configured for traversal
     *
     * @example
     * ```typescript
     * // Traverse outbound from a specific user, up to 3 levels deep
     * const query = repo.traversal('users/123', 'OUTBOUND', { maxDepth: 3 })
     *   .filter(AB.ref('v.active').eq(true))
     *   .return({ vertex: AB.ref('v'), edge: AB.ref('e') });
     * ```
     */
    traversal(
        startVertex: string | ExpressionBuilder,
        direction: 'OUTBOUND' | 'INBOUND' | 'ANY',
        options: TraversalOptions = {}
    ): AQLBuilder<Schema> {
        const builder = new AQLBuilder<Schema>();

        // Set up multiple loop variables for vertex, edge, path
        builder.forMultiple('v', 'e', 'p');

        const { minDepth = 1, maxDepth = 1, graph, options: traversalOptions } = options;

        if (graph) {
            // Use named graph
            builder.inGraph({
                graph,
                direction,
                startVertex,
                minDepth,
                maxDepth,
                options: traversalOptions
            });
        } else {
            // Use anonymous graph with this edge collection
            // We can use inGraph with the collection name as the graph parameter
            builder.inGraph({
                graph: this.collection,
                direction,
                startVertex,
                minDepth,
                maxDepth,
                options: traversalOptions
            });
        }

        return builder;
    }

    /**
     * Traverse outbound from a starting vertex
     * Follows edges in the direction from _from to _to
     *
     * @param startVertex - Starting vertex ID or expression
     * @param options - Traversal options (depth, graph name)
     * @returns AQLBuilder configured for outbound traversal
     *
     * @example
     * ```typescript
     * // Find all friends of a user
     * const query = friendsRepo.outbound('users/123')
     *   .return('v');
     * ```
     */
    outbound(
        startVertex: string | ExpressionBuilder,
        options: TraversalOptions = {}
    ): AQLBuilder<Schema> {
        return this.traversal(startVertex, 'OUTBOUND', options);
    }

    /**
     * Traverse inbound to a starting vertex
     * Follows edges in the direction from _to to _from
     *
     * @param startVertex - Starting vertex ID or expression
     * @param options - Traversal options (depth, graph name)
     * @returns AQLBuilder configured for inbound traversal
     *
     * @example
     * ```typescript
     * // Find all users who are friends with a specific user
     * const query = friendsRepo.inbound('users/123')
     *   .return('v');
     * ```
     */
    inbound(
        startVertex: string | ExpressionBuilder,
        options: TraversalOptions = {}
    ): AQLBuilder<Schema> {
        return this.traversal(startVertex, 'INBOUND', options);
    }

    /**
     * Traverse in any direction from a starting vertex
     * Follows edges in both directions
     *
     * @param startVertex - Starting vertex ID or expression
     * @param options - Traversal options (depth, graph name)
     * @returns AQLBuilder configured for any-direction traversal
     *
     * @example
     * ```typescript
     * // Find all connected users (friends in both directions)
     * const query = friendsRepo.any('users/123', { maxDepth: 2 })
     *   .return('v');
     * ```
     */
    any(
        startVertex: string | ExpressionBuilder,
        options: TraversalOptions = {}
    ): AQLBuilder<Schema> {
        return this.traversal(startVertex, 'ANY', options);
    }
}
