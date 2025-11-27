import { AQLBuilder } from '../core/aql.builder';
import { AqlQueryJson } from './json.types';

/**
 * Serialize an AQLBuilder to a JSON object
 */
export function serializeQuery(builder: AQLBuilder): AqlQueryJson {
    // Deep clone the query object to avoid mutation issues and ensure pure data
    const query = builder.query;
    return JSON.parse(JSON.stringify(query));
}

/**
 * Deserialize a JSON object to an AQLBuilder
 */
export function deserializeQuery(json: AqlQueryJson): AQLBuilder {
    const builder = new AQLBuilder();

    // Manually reconstruct the builder state from JSON
    // We can't just assign json to builder.query because we need to ensure
    // all internal structures are valid and potentially re-hydrate ExpressionBuilders if needed
    // However, since AQLBuilder stores raw objects mostly, we can assign it directly
    // but we need to be careful about types.

    // For now, direct assignment is the most pragmatic approach given the structure
    (builder as any).query = JSON.parse(JSON.stringify(json));

    return builder;
}
