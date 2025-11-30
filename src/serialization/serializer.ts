import { AQLBuilder } from '../core/aql.builder';
import { AqlQueryJson } from './json.types';

/**
 * Serialize an AQLBuilder to a JSON object
 */
export function serializeQuery(builder: AQLBuilder): AqlQueryJson {
    const query = builder.query;
    return JSON.parse(JSON.stringify(query));
}

/**
 * Deserialize a JSON object to an AQLBuilder
 */
export function deserializeQuery(json: AqlQueryJson): AQLBuilder {
    const builder = new AQLBuilder();

    (builder as any).query = JSON.parse(JSON.stringify(json));

    return builder;
}
