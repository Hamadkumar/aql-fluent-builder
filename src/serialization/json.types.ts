/**
 * JSON Representation of AQL Query
 * Strictly typed for serialization/deserialization
 */

export interface AqlQueryJson {
    collection?: string;
    variable?: string;
    source?: string | AqlRangeJson | AqlGraphJson;
    filters?: AqlExpressionJson[];
    operations?: AqlOperationJson[];
    collects?: AqlCollectJson[];
    sorts?: AqlSortJson[];
    returnValue?: unknown;
    limit?: number;
    offset?: number;
    lets?: AqlLetJson[];
    letsPreCollect?: AqlLetJson[];
    aggregations?: AqlAggregationJson[];
    upserts?: AqlUpsertJson[];
    updatesEnhanced?: AqlUpdateEnhancedJson[];
    multipleLoopVars?: AqlMultipleLoopVarsJson;
    searches?: AqlSearchJson[];
    traversals?: AqlTraverseJson[];
    prunes?: AqlPruneJson[];
    windows?: AqlWindowJson[];
}

export interface AqlRangeJson {
    type: 'range';
    start: number;
    end: number;
}

export interface AqlGraphJson {
    type: 'graph';
    graph: string;
    direction: 'OUTBOUND' | 'INBOUND' | 'ANY';
    startVertex: string;
    minDepth?: number;
    maxDepth?: number;
}

export interface AqlOperationJson {
    type: 'INSERT' | 'REPLACE' | 'REMOVE' | 'UPDATE';
    document: unknown;
    collection?: string;
    variable?: string;
}

export interface AqlCollectJson {
    variables: AqlCollectVariableJson[];
    into?: string;
    aggregate?: AqlCollectAggregateJson[];
}

export interface AqlCollectVariableJson {
    key: string;
    value: string;
}

export interface AqlCollectAggregateJson {
    name: string;
    expression: string;
}

export interface AqlSortJson {
    field: string;
    direction: 'ASC' | 'DESC';
}

export type AqlExpressionJson =
    | AqlLiteralJson
    | AqlReferenceJson
    | AqlBinaryOpJson
    | AqlUnaryOpJson
    | AqlFunctionCallJson
    | AqlTernaryJson
    | AqlParameterJson
    | AqlUnsetJson

    | AqlRegexJson
    | AqlLikeJson
    | OldReferenceJson
    | AqlAllOperatorJson
    | AqlAnyOperatorJson;

export interface AqlLiteralJson {
    type: 'literal';
    value: number | string | boolean | null | object;
}

export interface AqlReferenceJson {
    type: 'reference';
    name: string;
}

export interface AqlParameterJson {
    type: 'parameter';
    name: string;
    isCollection: boolean;
}

export interface AqlBinaryOpJson {
    type: 'binary';
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||' | '+' | '-' | '*' | '/' | '%' | 'IN' | 'NOT IN';
    left: AqlExpressionJson;
    right: AqlExpressionJson;
}

export interface AqlUnaryOpJson {
    type: 'unary';
    operator: '!' | '-';
    operand: AqlExpressionJson;
}

export interface AqlFunctionCallJson {
    type: 'function';
    name: string;
    args: AqlExpressionJson[];
}

export interface AqlTernaryJson {
    type: 'ternary';
    condition: AqlExpressionJson;
    thenValue: AqlExpressionJson;
    elseValue: AqlExpressionJson;
}

export interface AqlLetJson {
    variable: string;
    expression: unknown;
}

export interface AqlAggregationJson {
    name: string;
    function: 'COUNT' | 'SUM' | 'AVERAGE' | 'AVG' | 'MIN' | 'MAX' | 'COLLECT' | 'KEEP';
    expression?: unknown;
}

export interface AqlUpsertJson {
    type: 'UPSERT';
    searchDoc: unknown;
    insertDoc: unknown;
    updateDoc: unknown;
    collection: string;
}

export interface AqlUpdateEnhancedJson {
    type: 'UPDATE';
    document: unknown;
    updateFields: Record<string, unknown>;
    collection: string;
    variable?: string;
    oldReference?: boolean;
}

export interface OldReferenceJson {
    type: 'old';
    path: string;
}

export interface AqlMultipleLoopVarsJson {
    vertex: string;
    edge: string;
    path: string;
}

export interface AqlAllOperatorJson {
    type: 'all';
    expression: AqlExpressionJson;
    condition: AqlExpressionJson;
}

export interface AqlAnyOperatorJson {
    type: 'any';
    expression: AqlExpressionJson;
    condition: AqlExpressionJson;
}

export interface AqlSearchJson {
    type: 'search';
    view: string;
    conditions: AqlExpressionJson[];
    options?: Record<string, unknown>;
}

export interface AqlTraverseJson {
    type: 'traverse';
    variable: string;
    path: string;
    maxDepth?: number;
    minDepth?: number;
}

export interface AqlPruneJson {
    type: 'prune';
    condition: AqlExpressionJson;
}

export interface AqlWindowJson {
    type: 'window';
    preceding?: number;
    following?: number;
    aggregation: AqlExpressionJson;
}

export interface AqlUnsetJson {
    type: 'unset';
    object: AqlExpressionJson;
    fields: string[];
}



export interface AqlRegexJson {
    type: 'regex';
    expression: AqlExpressionJson;
    pattern: string;
    flags?: string;
}

export interface AqlLikeJson {
    type: 'like';
    expression: AqlExpressionJson;
    pattern: string;
    caseInsensitive?: boolean;
}
