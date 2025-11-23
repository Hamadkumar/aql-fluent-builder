/**
 * Type Definitions
 * A fluent API for building ArangoDB AQL queries
 */

import { DatabaseSchema } from '../schema/types';

/**
 * Represents a complete AQL query configuration
 */
export interface AqlQuery<Schema extends DatabaseSchema = any> {
  /** The collection to query */
  collection?: string;
  /** Variable name for FOR loop */
  variable?: string;
  /** FOR loop source (collection, range, or graph) */
  source?: string | AqlRange | AqlGraph;
  /** Filter conditions */
  filters?: AqlExpression[];
  /** Document operations (INSERT, REPLACE, REMOVE, UPDATE) */
  operations?: AqlOperation[];
  /** COLLECT clauses */
  collects?: AqlCollect[];
  /** SORT clauses */
  sorts?: AqlSort[];
  /** RETURN clause */
  returnValue?: unknown;
  /** Limit clause */
  limit?: number;
  /** Offset clause */
  offset?: number;
  /** LET clauses for variable assignment */
  lets?: AqlLet[];
  letsPreCollect?: AqlLet[];
  /** Aggregation functions in COLLECT */
  aggregations?: AqlAggregation[];

  upserts?: AqlUpsert[];
  updatesEnhanced?: AqlUpdateEnhanced[];
  multipleLoopVars?: AqlMultipleLoopVars;

  searches?: AqlSearch[];
  traversals?: AqlTraverse[];
  prunes?: AqlPrune[];
  windows?: AqlWindow[];
}

/**
 * Represents a range for FOR loops
 */
export interface AqlRange {
  type: 'range';
  start: number;
  end: number;
}

/**
 * Represents a graph traversal configuration
 */
export interface AqlGraph {
  type: 'graph';
  graph: string;
  direction: 'OUTBOUND' | 'INBOUND' | 'ANY';
  startVertex: string;
  minDepth?: number;
  maxDepth?: number;
}

/**
 * Represents a document operation (INSERT, REPLACE, REMOVE, UPDATE)
 */
export interface AqlOperation {
  type: 'INSERT' | 'REPLACE' | 'REMOVE' | 'UPDATE';
  document: unknown;
  collection?: string;
  variable?: string;
}

/**
 * Represents a COLLECT clause
 */
export interface AqlCollect {
  variables: AqlCollectVariable[];
  into?: string;
  aggregate?: AqlCollectAggregate[];
}

export interface AqlCollectVariable {
  key: string;     // Variable name
  value: string;   // Stringified expression
}

export interface AqlCollectAggregate {
  name: string;        // Aggregate name
  expression: string;  // Stringified: "SUM(amount)"
}

/**
 * Represents a SORT clause
 */
export interface AqlSort {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Base type for AQL expressions
 */
export type AqlExpression =
  | AqlLiteral
  | AqlReference
  | AqlBinaryOp
  | AqlUnaryOp
  | AqlFunctionCall
  | AqlTernary
  | AqlParameter
  | AqlUnset

  | AqlRegex
  | AqlLike
  | OldReference
  | AqlAllOperator
  | AqlAnyOperator;

/**
 * Literal value (number, string, boolean, null)
 */
export interface AqlLiteral {
  type: 'literal';
  value: number | string | boolean | null | object;
}

/**
 * Reference to a property or variable
 */
export interface AqlReference {
  type: 'reference';
  name: string;
}

/**
 * Parameter placeholder (@param or @@param)
 */
export interface AqlParameter {
  type: 'parameter';
  name: string;
  isCollection: boolean;
}

/**
 * Binary operation (comparison, arithmetic, logical)
 */
export interface AqlBinaryOp {
  type: 'binary';
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||' | '+' | '-' | '*' | '/' | '%' | 'IN' | 'NOT IN';
  left: AqlExpression;
  right: AqlExpression;
}

/**
 * Unary operation (NOT, negation)
 */
export interface AqlUnaryOp {
  type: 'unary';
  operator: '!' | '-';
  operand: AqlExpression;
}

/**
 * Function call
 */
export interface AqlFunctionCall {
  type: 'function';
  name: string;
  args: AqlExpression[];
}

/**
 * Ternary conditional expression
 */
export interface AqlTernary {
  type: 'ternary';
  condition: AqlExpression;
  thenValue: AqlExpression;
  elseValue: AqlExpression;
}

/**
 * Result of building an AQL query
 */
export interface GeneratedAqlQuery {
  /** The AQL query string */
  query: string;
  /** Bind variables for parameterized queries */
  bindVars: Record<string, unknown>;
}

/**
 * Represents a LET clause for variable assignment
 * Example: LET myVar = (subquery), LET total = SUM(values)
 */
export interface AqlLet {
  variable: string;
  expression: unknown;  // Can be a subquery or expression
}

/**
 * Represents aggregation configuration for COLLECT
 */
export interface AqlAggregation {
  name: string;
  function: 'COUNT' | 'SUM' | 'AVERAGE' | 'AVG' | 'MIN' | 'MAX' | 'COLLECT' | 'KEEP';
  expression?: unknown;
}

/**
 * Subquery configuration - a nested query
 */
export interface AqlSubquery {
  type: 'subquery';
  query: AqlQuery;
}

/**
 * Function wrapper for aggregate functions
 */
export interface AqlAggregateFunction extends AqlFunctionCall {
  name: 'COUNT' | 'SUM' | 'AVERAGE' | 'AVG' | 'MIN' | 'MAX';
}

/**
 * Base generic type for safe handling of unknown data
 */
export type SafeUnknown = unknown;

/**
 * Represents an UPSERT operation
 */
export interface AqlUpsert {
  type: 'UPSERT';
  searchDoc: SafeUnknown;
  insertDoc: SafeUnknown;
  updateDoc: SafeUnknown;
  collection: string;
}

/**
 * Enhanced UPDATE operation with detailed field updates
 */
export interface AqlUpdateEnhanced {
  type: 'UPDATE';
  document: SafeUnknown;
  updateFields: Record<string, SafeUnknown>; // Specific fields to update
  collection: string;
  variable?: string;
  oldReference?: boolean; // Use OLD reference
}

/**
 * Represents OLD reference in update context
 */
export interface OldReference {
  type: 'old';
  path: string; // e.g., "OLD.visits"
}

/**
 * Multiple loop variables for graph traversal
 */
export interface AqlMultipleLoopVars {
  vertex: string; // v in: FOR v, e, p IN ...
  edge: string; // e
  path: string; // p
}

/**
 * ALL operator for array validation
 */
export interface AqlAllOperator {
  type: 'all';
  expression: AqlExpression;
  condition: AqlExpression;
}

/**
 * ANY operator for array validation
 */
export interface AqlAnyOperator {
  type: 'any';
  expression: AqlExpression;
  condition: AqlExpression;
}

/**
 * Function call with parameters
 */
export interface AqlFunctionCallEnhanced {
  type: 'function';
  name: string;
  args: AqlExpression[];
  options?: Record<string, SafeUnknown>; // For functions like REGEX
}

/**
 * Date/Time function types
 */
export type DateFunction =
  | 'DATE_NOW'
  | 'DATE_FORMAT'
  | 'DATE_PARSE'
  | 'DATE_ADD'
  | 'DATE_SUBTRACT'
  | 'DATE_DIFFERENCE'
  | 'DATE_YEAR'
  | 'DATE_MONTH'
  | 'DATE_DAY'
  | 'CURRENT_TIMESTAMP';

/**
 * String function types
 */
export type StringFunction =
  | 'CONCAT'
  | 'CONCAT_SEPARATOR'
  | 'LOWER'
  | 'UPPER'
  | 'LTRIM'
  | 'RTRIM'
  | 'TRIM'
  | 'SUBSTRING'
  | 'SPLIT'
  | 'REPLACE'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'CONTAINS'
  | 'FIND_FIRST'
  | 'FIND_LAST'
  | 'REGEX_MATCH'
  | 'REGEX_SPLIT';

/**
 * Array function types
 */
export type ArrayFunction =
  | 'UNION'
  | 'INTERSECTION'
  | 'MINUS'
  | 'UNIQUE'
  | 'FIRST'
  | 'LAST'
  | 'NTH'
  | 'REVERSE'
  | 'SORT'
  | 'GROUP_BY'
  | 'FLATTEN'
  | 'APPEND'
  | 'SLICE'
  | 'RANGE';

/**
 * Math function types
 */
export type MathFunction =
  | 'ROUND'
  | 'FLOOR'
  | 'CEIL'
  | 'ABS'
  | 'SQRT'
  | 'POW'
  | 'SIN'
  | 'COS'
  | 'TAN'
  | 'ASIN'
  | 'ACOS'
  | 'ATAN'
  | 'LOG'
  | 'LOG10'
  | 'LOG2'
  | 'EXP'
  | 'RAND';

/**
 * SEARCH clause for full-text search
 */
export interface AqlSearch {
  type: 'search';
  view: string;
  conditions: AqlExpression[];
  options?: Record<string, SafeUnknown>;
}

/**
 * TRAVERSE clause configuration
 */
export interface AqlTraverse {
  type: 'traverse';
  variable: string;
  path: string;
  maxDepth?: number;
  minDepth?: number;
}

/**
 * PRUNE clause configuration
 */
export interface AqlPrune {
  type: 'prune';
  condition: AqlExpression;
}

/**
 * LIKE operator configuration
 */
export interface AqlLike {
  type: 'like';
  expression: AqlExpression;
  pattern: string;
  caseInsensitive?: boolean;
}

/**
 * Regex operator configuration
 */
export interface AqlRegex {
  type: 'regex';
  expression: AqlExpression;
  pattern: string;
  flags?: string;
}

/**
 * IN operator for checking membership
 */
export interface AqlIn {
  type: 'in';
  expression: AqlExpression;
  values: AqlExpression[];
}

/**
 * Enhanced COLLECT with KEEP modifier
 */
export interface AqlCollectWithKeep {
  variables: Record<string, SafeUnknown>;
  into?: string;
  aggregate?: Record<string, SafeUnknown>;
  keep?: string[]; // Fields to keep from grouped documents
}

/**
 * Window function configuration
 */
export interface AqlWindow {
  type: 'window';
  preceding?: number;
  following?: number;
  aggregation: AqlExpression;
}



/**
 * CASE/SWITCH expression
 */
export interface AqlCase {
  type: 'case';
  expression: AqlExpression;
  branches: Array<{
    value: SafeUnknown;
    result: AqlExpression;
  }>;
  defaultResult?: AqlExpression;
}

/**
 * MERGE function
 */
export interface AqlMerge {
  type: 'merge';
  documents: AqlExpression[];
}

/**
 * UNSET function
 */
export interface AqlUnset {
  type: 'unset';
  object: AqlExpression;
  fields: string[];
}

/**
 * Represents a JSON-serializable AQL query request
 */
export interface AqlQueryRequest<Schema extends DatabaseSchema = any> {
  collection?: keyof Schema | string;
  variable?: string;
  source?: string | AqlRange | AqlGraph;
  filters?: AqlExpression[];
  operations?: AqlOperation[];
  collects?: AqlCollect[];
  sorts?: AqlSort[];
  returnValue?: unknown;
  limit?: number;
  offset?: number;
  lets?: AqlLet[];
  letsPreCollect?: AqlLet[];
  aggregations?: AqlAggregation[];
  upserts?: AqlUpsert[];
  updatesEnhanced?: AqlUpdateEnhanced[];
  multipleLoopVars?: AqlMultipleLoopVars;
  searches?: AqlSearch[];
  traversals?: AqlTraverse[];
  prunes?: AqlPrune[];
  windows?: AqlWindow[];
}
