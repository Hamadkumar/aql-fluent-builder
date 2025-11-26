/**
 * AQL Builder - Main builder class for constructing AQL queries
 */

import {
  AqlQuery,
  AqlRange,
  AqlGraph,
  GeneratedAqlQuery,
  AqlExpression,
  AqlCollectAggregate,
  AqlCollectVariable,
  AqlValue,
  AqlCollect,
  AqlTraverse,
  AqlCollectWithKeep,
  AqlUpdateEnhanced,
  AqlUpsert,
  OldReference,
  AqlJoin
} from './core.types';
import { AqlQueryJson } from '../serialization/json.types';
import { serializeQuery, deserializeQuery } from '../serialization/serializer';
import { ExpressionBuilder, ref, variable } from './expression.builder';
import { DatabaseSchema, EdgeSchema } from '../schema/types';

/**
 * Main query builder class with fluent API
 */
export class AQLBuilder<Schema extends DatabaseSchema = any, Var = any> {
  public readonly query: AqlQuery<Schema>;
  private currentJoin?: AqlJoin;


  constructor(initialValue?: string | ExpressionBuilder | number) {
    this.query = {};

    if (typeof initialValue === 'string') {
      this.query.collection = initialValue;
    } else if (typeof initialValue === 'number') {
      this.query.returnValue = initialValue;
    } else if (initialValue instanceof ExpressionBuilder) {
      this.query.returnValue = initialValue.getExpression();
    }
  }

  /**
   * Join with another collection
   */
  join<V = any, K extends keyof Schema = any>(collection: K, variableName: string): AQLBuilder<Schema, V> {
    return this.for<V>(variableName).in(collection as any);
  }

  /**
   * Set the FOR loop variable
   */
  for<V = any>(variableName: string): AQLBuilder<Schema, V> {
    if (this.query.variable) {
      this.currentJoin = { variable: variableName, source: '' };
      this.query.joins ??= [];
      this.query.joins.push(this.currentJoin);
    } else {
      this.query.variable = variableName;
    }
    return this as any;
  }

  /**
   * Set the collection or source for FOR loop
   */
  in<K extends keyof Schema>(source: K | AqlRange | AqlGraph | `@${string}` | `@@${string}`): AQLBuilder<Schema, K extends keyof Schema ? Schema[K] : any> {
    const sourceValue = (typeof source === 'string' && !source.startsWith('@'))
      ? source as string
      : source as AqlValue as string | AqlRange | AqlGraph;

    if (this.currentJoin) {
      this.currentJoin.source = sourceValue;
    } else {
      if (typeof source === 'string') {
        if (source.startsWith('@@') || source.startsWith('@')) {
          this.query.source = source;
        } else {
          this.query.collection = source as string;
          this.query.source = source;
        }
      } else {
        this.query.source = sourceValue;
      }
    }
    return this as any;
  }

  /**
   * Set the edge collection for FOR loop (Strictly Typed)
   */
  inEdge<K extends keyof Schema>(collection: Schema[K] extends EdgeSchema ? K : never): AQLBuilder<Schema, K extends keyof Schema ? Schema[K] : any> {
    if (this.currentJoin) {
      this.currentJoin.source = collection as string;
    } else {
      this.query.collection = collection as string;
      this.query.source = collection as string;
    }
    return this as any;
  }

  /**
   * Graph traversal configuration
   */
  inGraph(options: {
    graph: string;
    direction: 'OUTBOUND' | 'INBOUND' | 'ANY';
    startVertex: string | ExpressionBuilder;
    minDepth?: number;
    maxDepth?: number;
  }): this {
    const startVertex = options.startVertex instanceof ExpressionBuilder
      ? this.expressionToString(options.startVertex.getExpression())
      : options.startVertex;

    const graphSource = {
      type: 'graph',
      graph: options.graph,
      direction: options.direction,
      startVertex,
      minDepth: options.minDepth || 1,
      maxDepth: options.maxDepth
    } as AqlGraph;

    if (this.currentJoin) {
      this.currentJoin.source = graphSource;
    } else {
      this.query.source = graphSource;
    }
    return this;
  }

  /**
   * Add a FILTER clause
   */
  filter(condition: ExpressionBuilder | AqlExpression): this {
    this.query.filters ??= [];

    const expr = condition instanceof ExpressionBuilder
      ? condition.getExpression()
      : condition;

    this.query.filters.push(expr);
    return this;
  }

  /**
   * Add an INSERT operation
   */
  insert(document: AqlValue): this {
    this.query.operations ??= [];
    this.query.operations.push({
      type: 'INSERT',
      document
    });
    return this;
  }

  /**
   * Specify the target collection for an operation
   */
  into(collection: string): this {
    if (this.query.operations && this.query.operations.length > 0) {
      this.query.operations[this.query.operations.length - 1]!.collection = collection;
    }
    return this;
  }

  /**
   * Add a REPLACE operation
   */
  replace(variable: string): this {
    this.query.operations ??= [];
    this.query.operations.push({
      type: 'REPLACE',
      document: variable,
      variable
    });
    return this;
  }

  /**
   * Add a REMOVE operation
   */
  remove(variable: string): this {
    this.query.operations ??= [];
    this.query.operations.push({
      type: 'REMOVE',
      document: variable,
      variable
    });
    return this;
  }

  /**
   * Add a COLLECT clause
   */
  collect(variables: Record<string, AqlValue>): CollectBuilder {
    return new CollectBuilder(this, variables);
  }

  _addCollectWithAggregation(collect: AqlCollect): this {
    this.query.collects ??= [];
    this.query.collects?.push(collect);
    return this;
  };

  /**
   * Add a SORT clause
   */
  sort(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query.sorts ??= [];
    this.query.sorts.push({ field, direction });
    return this;
  }

  /**
   * Set the RETURN clause
   */
  return(value: AqlValue): this {
    this.query.returnValue = value;
    return this;
  }

  /**
   * Set LIMIT clause
   */
  limit(count: number, offset?: number): this {
    if (count < 0) {
      throw new Error('LIMIT count must be non-negative');
    }
    if (offset !== undefined && offset < 0) {
      throw new Error('LIMIT offset must be non-negative');
    }
    this.query.limit = count;
    this.query.offset = offset ?? 0;
    return this;
  }

  /**
   * Set OFFSET clause
   */
  offset(offset: number): this {
    if (offset < 0) {
      throw new Error('OFFSET must be non-negative');
    }
    this.query.offset = offset;
    return this;
  }

  // ========================================================================
  // UPSERT Operation
  // ========================================================================

  /**
  * UPSERT operation: Insert or Update based on search condition
  */
  upsert(searchDoc: AqlValue): UpsertBuilder {
    return new UpsertBuilder(this, searchDoc);
  }

  _addUpsert(upsert: AqlUpsert): this {
    if (!this.query.upserts) {
      this.query.upserts = [];
    }
    this.query.upserts.push(upsert);
    return this;
  }

  /**
  * UPDATE with detailed field updates
  */
  updateWith(document: AqlValue, updates: Record<string, AqlValue>): this {
    if (!this.query.updatesEnhanced) {
      this.query.updatesEnhanced = [];
    }

    this.query.updatesEnhanced.push({
      type: 'UPDATE',
      document,
      updateFields: updates,
      collection: this.query.collection || '',
      variable: this.query.variable,
      oldReference: false
    } as AqlUpdateEnhanced);

    return this;
  }

  /**
  * UPDATE with OLD reference support
  */
  updateWithOld(document: AqlValue, updatesFn: (old: OldBuilder) => Record<string, AqlValue>): this {
    const oldBuilder = createOldBuilder();
    const updates = updatesFn(oldBuilder);

    if (!this.query.updatesEnhanced) {
      this.query.updatesEnhanced = [];
    }

    this.query.updatesEnhanced.push({
      type: 'UPDATE',
      document,
      updateFields: updates,
      collection: this.query.collection || '',
      variable: this.query.variable,
      oldReference: true
    } as AqlUpdateEnhanced);

    return this;
  }

  /**
  * FOR with multiple loop variables (vertex, edge, path)
  */
  forMultiple(vertex: string, edge: string, path: string): this {
    this.query.multipleLoopVars = {
      vertex,
      edge,
      path
    };
    return this;
  }

  /**
  * SEARCH clause for full-text search
  */
  search(view: string, ...conditions: ExpressionBuilder[]): this {
    if (!this.query.searches) {
      this.query.searches = [];
    }

    this.query.searches.push({
      type: 'search',
      view,
      conditions: conditions.map(c => c.getExpression())
    });

    return this;
  }

  /**
  * TRAVERSE clause for graph traversal
  */
  traverse(variable: string, path: string, maxDepth?: number): this {
    if (!this.query.traversals) {
      this.query.traversals = [];
    }

    this.query.traversals.push({
      type: 'traverse',
      variable,
      path,
      maxDepth
    } as AqlTraverse);

    return this;
  }

  /**
  * PRUNE clause to stop traversal at condition
  */
  prune(condition: ExpressionBuilder): this {
    if (!this.query.prunes) {
      this.query.prunes = [];
    }

    this.query.prunes.push({
      type: 'prune',
      condition: condition.getExpression()
    });

    return this;
  }

  /**
  * WINDOW clause for sliding window calculations
  */
  window(preceding: number, following: number, aggregation: ExpressionBuilder): this {
    if (!this.query.windows) {
      this.query.windows = [];
    }

    this.query.windows.push({
      type: 'window',
      preceding,
      following,
      aggregation: aggregation.getExpression()
    });

    return this;
  }

  /**
  * COLLECT with KEEP modifier to selectively keep fields
  */
  collectKeep(variables: Record<string, AqlValue>, keep: string[]): CollectKeepBuilder {
    return new CollectKeepBuilder(this, variables, keep);
  }

  _addCollectKeep(collect: AqlCollectWithKeep): this {
    if (!this.query.collects) {
      this.query.collects = [];
    }

    // Convert to regular collect with keep info
    this.query.collects.push(collect as AqlValue as AqlCollect);
    return this;
  }

  /**
     * Convert expression to AQL string representation
     */
  expressionToString(expr: AqlValue): string {
    // Extract expression from ExpressionBuilder wrapper
    if (expr instanceof ExpressionBuilder) {
      expr = expr.getExpression();
    }

    // Handle AqlExpression objects with proper conversion
    if (expr && typeof expr === 'object' && 'type' in expr) {
      // Use the proper AQL conversion function instead of wrong method
      const { aql } = expressionToAql(expr as AqlExpression, {}, 0);
      return aql;
    }

    // Handle built query results (already compiled)
    if (expr && typeof expr === 'object' && 'query' in expr) {
      return `(${(expr as GeneratedAqlQuery).query})`;
    }

    // Handle AQLBuilder instances (subqueries)
    if (expr instanceof AQLBuilder) {
      const subqueryResult = expr.build();
      return `(${subqueryResult.query})`;
    }

    // Primitives and references
    if (typeof expr === 'string') {
      if (expr.startsWith('@') || expr.startsWith('REF')) {
        return expr;
      }
      return expr;  // Variable names pass through as-is
    }

    if (typeof expr === 'number') {
      return String(expr);
    }

    if (typeof expr === 'boolean') {
      return expr ? 'true' : 'false';
    }

    if (expr === null) {
      return 'null';
    }

    return String(expr);
  }


  /**
   * Generate the AQL query string and bind variables
   */
  toAql(): string {
    const result = buildQuery(this.query);
    return result.query;
  }

  /**
   * Add a LET clause for variable assignment
   * Can assign subqueries, expressions, or values
   * 
   * Example:
   *   builder.let('purchases', AB.for('p').in('purchases').filter(...).return('p'))
   *   builder.let('total', SUM(ref('purchases[*].amount')))
   */
  let(variableName: string, expression: AqlExpression | string | number | GeneratedAqlQuery | AQLBuilder): this {
    if (expression instanceof AQLBuilder) {
      expression = expression.build();
    }
    const letClause = { variable: variableName, expression: expression as AqlValue };

    if (this.query.collects && this.query.collects.length > 0) {
      // If we have COLLECTs, this LET goes after them
      this.query.lets ??= [];
      this.query.lets.push(letClause);
    } else {
      // No COLLECTs yet, this LET goes before them
      this.query.letsPreCollect ??= [];
      this.query.letsPreCollect.push(letClause);
    }
    return this;
  }

  /**
   * Create a subquery builder
   * Can be used within LET clauses
   * 
   * Example:
   *   const subquery = createSubquery()
   *     .for('order')
   *     .in('orders')
   *     .filter(ref('order.userId').eq('@userId'))
   *     .return('order');
   */
  subquery(): AQLBuilder {
    return new AQLBuilder();
  }

  /**
   * Convert AQL expression to string
   */
  private aqlExpressionToString(expr: AqlExpression): string {
    if (expr.type === 'function') {
      const args = expr.args.map((arg: AqlExpression) => this.aqlExpressionToString(arg)).join(', ');
      return `${expr.name}(${args})`;
    }

    if (expr.type === 'reference') {
      return expr.name;
    }

    if (expr.type === 'literal') {
      if (typeof expr.value === 'string') {
        return `"${expr.value}"`;
      }
      return JSON.stringify(expr.value);
    }

    if (expr.type === 'binary') {
      const left = this.aqlExpressionToString(expr.left);
      const right = this.aqlExpressionToString(expr.right);
      return `(${left} ${expr.operator} ${right})`;
    }

    return JSON.stringify(expr);
  }

  /**
   * Build and return the complete query with bind variables
   */
  build() {
    if (this.query.variable && !this.query.source) {
      throw new Error(`FOR ${this.query.variable} requires an IN clause`);
    }

    if (this.query.operations && this.query.operations.some(op => !op.collection)) {
      throw new Error('All operations require a collection');
    }

    return buildQuery(this.query);
  }

  /**
   * Serialize query to JSON
   */
  toJSON(): AqlQueryJson {
    return serializeQuery(this);
  }

  /**
   * Create AQLBuilder from JSON
   */
  static fromJSON(json: AqlQueryJson): AQLBuilder {
    return deserializeQuery(json);
  }

}

/**
 * Factory function to create a subquery builder
 */
export function createSubquery(): AQLBuilder {
  return new AQLBuilder();
}

/**
 * Helper class for building COLLECT clauses with INTO
 */
class CollectBuilder {

  private readonly aggregations: Map<string, { function: string; expression: AqlValue }> = new Map();

  constructor(
    private readonly builder: AQLBuilder,
    private readonly variables: Record<string, AqlValue>
  ) { }

  sort(...args: string[]): AQLBuilder {
    // @ts-ignore
    return this.builder.sort(...args);
  }


  /**
     * Add COUNT aggregation
     */
  count(name: string, expression: AqlValue = 1): this {
    this.aggregations.set(name, { function: 'COUNT', expression });
    return this;
  }

  /**
   * Add SUM aggregation
   */
  sum(name: string, expression: AqlValue): this {
    this.aggregations.set(name, { function: 'SUM', expression });
    return this;
  }

  /**
   * Add AVERAGE aggregation
   */
  average(name: string, expression: AqlValue): this {
    this.aggregations.set(name, { function: 'AVERAGE', expression });
    return this;
  }

  /**
   * Add MIN aggregation
   */
  min(name: string, expression: AqlValue): this {
    this.aggregations.set(name, { function: 'MIN', expression });
    return this;
  }

  /**
   * Add MAX aggregation
   */
  max(name: string, expression: AqlValue): this {
    this.aggregations.set(name, { function: 'MAX', expression });
    return this;
  }

  /**
     * Finalize COLLECT without INTO
     */
  build(): AQLBuilder {
    // Create properly typed array for variables
    const variables: AqlCollectVariable[] = Object.entries(this.variables).map(
      ([key, value]) => {
        // Uses the fixed expressionToString() method
        const valueStr = this.builder.expressionToString(value);
        return {
          key,
          value: valueStr
        };
      }
    );

    // Create properly typed array for aggregates
    const aggregates: AqlCollectAggregate[] = Array.from(this.aggregations.entries()).map(
      ([name, { function: fn, expression }]) => {
        // Uses the fixed expressionToString() method
        const exprStr = this.builder.expressionToString(expression);
        return {
          name,
          expression: `${fn}(${exprStr})`
        };
      }
    );

    return this.builder._addCollectWithAggregation({
      variables,
      aggregate: aggregates
    });
  }

  /**
   * Add INTO clause to COLLECT
   */
  into(groupName: string): AQLBuilder {
    const variables: AqlCollectVariable[] = Object.entries(this.variables).map(
      ([key, value]) => {
        const valueStr = this.builder.expressionToString(value);
        return {
          key,
          value: valueStr
        };
      }
    );

    const aggregates: AqlCollectAggregate[] = Array.from(this.aggregations.entries()).map(
      ([name, { function: fn, expression }]) => {
        const exprStr = this.builder.expressionToString(expression);
        return {
          name,
          expression: `${fn}(${exprStr})`
        };
      }
    );

    return this.builder._addCollectWithAggregation({
      variables,
      into: groupName,
      aggregate: aggregates
    });
  }

}

/**
 * Build a complete AQL query from the query configuration
 */
export function buildQuery(query: AqlQuery): GeneratedAqlQuery {
  const parts: string[] = [];
  const bindVars: Record<string, AqlValue> = {};
  let paramCounter = 0;

  if (query.multipleLoopVars) {
    const { vertex, edge, path } = query.multipleLoopVars;
    let sourceStr = '';

    if (typeof query.source === 'string') {
      sourceStr = query.source;
    } else if (query.source && 'type' in query.source) {
      if (query.source.type === 'range') {
        sourceStr = `${query.source.start}..${query.source.end}`;
      } else if (query.source.type === 'graph') {
        sourceStr = buildGraphTraversal(query.source);
      }
    }

    // FOR clause
    parts.push(`FOR ${vertex}, ${edge}, ${path} IN ${sourceStr}`);
  } else if (query.variable && query.source) {
    let sourceStr: string;

    if (typeof query.source === 'string') {
      sourceStr = query.source;
    } else if ('type' in query.source && query.source.type === 'range') {
      sourceStr = `${query.source.start}..${query.source.end}`;
    } else if ('type' in query.source && query.source.type === 'graph') {
      const g = query.source;
      const depth = g.maxDepth !== undefined
        ? `${g.minDepth}..${g.maxDepth}`
        : String(g.minDepth);
      sourceStr = `${depth} ${g.direction} ${g.startVertex} GRAPH "${g.graph}"`;
    } else {
      sourceStr = String(query.source);
    }

    parts.push(`FOR ${query.variable} IN ${sourceStr}`);
  }

  if (query.joins && query.joins.length > 0) {
    for (const join of query.joins) {
      let sourceStr: string;
      if (typeof join.source === 'string') {
        sourceStr = join.source;
      } else if ('type' in join.source && join.source.type === 'range') {
        sourceStr = `${join.source.start}..${join.source.end}`;
      } else if ('type' in join.source && join.source.type === 'graph') {
        sourceStr = buildGraphTraversal(join.source);
      } else {
        sourceStr = String(join.source);
      }
      parts.push(`FOR ${join.variable} IN ${sourceStr}`);
    }
  }

  if (query.letsPreCollect && query.letsPreCollect.length > 0) {
    for (const let_ of query.letsPreCollect) {
      const exprStr = expressionToAql(let_.expression as AqlExpression, bindVars, paramCounter);
      paramCounter = exprStr.paramCounter;
      parts.push(`LET ${let_.variable} = ${exprStr.aql}`);
    }
  }

  if (query.searches && query.searches.length > 0) {
    for (const search of query.searches) {
      const conditions = search.conditions
        .map(c => expressionToAql(c, bindVars, paramCounter).aql)
        .join(' AND ');
      parts.push(`SEARCH ${search.view} ${conditions}`);
    }
  }

  if (query.collects && query.collects.length > 0) {
    for (const collect of query.collects) {
      const collectParts: string[] = [];

      if (collect.variables && collect.variables.length > 0) {
        const varStrings = collect.variables.map((v: AqlCollectVariable) => {
          return `${v.key} = ${v.value}`;
        });

        collectParts.push(`COLLECT ${varStrings.join(', ')}`);
      }
      if (collect.into) {
        collectParts.push(`  INTO ${collect.into}`);  // Indent continuation
      }
      if (collect.aggregate && collect.aggregate.length > 0) {
        const aggregateStrings = collect.aggregate.map((agg: AqlCollectAggregate) => {
          return `${agg.name} = ${agg.expression}`;
        });
        collectParts.push(`  AGGREGATE ${aggregateStrings.join(', ')}`);
      }
      parts.push(collectParts.join('\n'));
    }
  }

  if (query.traversals && query.traversals.length > 0) {
    for (const traverse of query.traversals) {
      let traverseStr = `TRAVERSE ${traverse.variable} IN ${traverse.path}`;
      if (traverse.maxDepth) {
        traverseStr += ` MAXDEPTH ${traverse.maxDepth}`;
      }
      parts.push(traverseStr);
    }
  }

  if (query.prunes && query.prunes.length > 0) {
    for (const prune of query.prunes) {
      const pruneCondition = expressionToAql(prune.condition, bindVars, paramCounter).aql;
      parts.push(`PRUNE ${pruneCondition}`);
    }
  }

  if (query.lets && query.lets.length > 0) {
    for (const let_ of query.lets) {
      const exprStr = expressionToAql(let_.expression as AqlExpression, bindVars, paramCounter);
      paramCounter = exprStr.paramCounter;
      parts.push(`LET ${let_.variable} = ${exprStr.aql}`);
    }
  }

  // FILTER clauses
  if (query.filters) {
    for (const filter of query.filters) {
      const filterStr = expressionToAql(filter, bindVars, paramCounter);
      paramCounter = filterStr.paramCounter;
      parts.push(`FILTER ${filterStr.aql}`);
    }
  }

  // SORT clauses
  if (query.sorts) {
    const sortParts = query.sorts.map(s => `${s.field} ${s.direction}`).join(', ');
    parts.push(`SORT ${sortParts}`);
  }

  if (query.windows && query.windows.length > 0) {
    for (const window of query.windows) {
      let windowStr = 'WINDOW {\n';
      if (window.preceding !== undefined) {
        windowStr += ` preceding: ${window.preceding},\n`;
      }
      if (window.following !== undefined) {
        windowStr += ` following: ${window.following}\n`;
      }
      windowStr += '}\n';
      const aggStr = expressionToAql(window.aggregation, bindVars, paramCounter).aql;
      parts.push(`${windowStr}AGGREGATE ${aggStr}`);
    }
  }

  // LIMIT clause
  if (query.limit !== undefined && query.offset !== undefined) {
    parts.push(`LIMIT ${query.offset}, ${query.limit}`);
  } else if (query.limit !== undefined) {
    parts.push(`LIMIT ${query.limit}`);
  }

  // Operations (INSERT, REPLACE, REMOVE, UPDATE)
  if (query.operations) {
    for (const op of query.operations) {
      if (op.type === 'INSERT') {
        const docStr = documentToAql(op.document, bindVars, paramCounter);
        paramCounter = docStr.paramCounter;
        let opStr = `${op.type} ${docStr.aql}`;
        if (op.collection) {
          opStr += ` INTO ${op.collection}`;
        }
        parts.push(opStr);
      } else if (op.type === 'REPLACE' || op.type === 'REMOVE') {
        let opStr = `${op.type} ${op.variable}`;
        if (op.collection) {
          opStr += ` IN ${op.collection}`;
        }
        parts.push(opStr);
      }
    }
  }

  // UPSERT operations
  if (query.upserts && query.upserts.length > 0) {
    for (const upsert of query.upserts) {
      // Convert search document
      const search = documentToAql(upsert.searchDoc, bindVars, paramCounter);
      paramCounter = search.paramCounter;

      // Convert insert document
      const insert = documentToAql(upsert.insertDoc, bindVars, paramCounter);
      paramCounter = insert.paramCounter;

      // Convert update document
      const update = documentToAql(upsert.updateDoc, bindVars, paramCounter);
      paramCounter = update.paramCounter;

      parts.push(`UPSERT ${search.aql}`);
      parts.push(`INSERT ${insert.aql}`);
      parts.push(`UPDATE ${update.aql}`);
      parts.push(`IN ${upsert.collection}`);
    }
  }


  // UPDATE
  if (query.updatesEnhanced && query.updatesEnhanced.length > 0) {
    for (const update of query.updatesEnhanced) {
      const updateFields = documentToAql(update.updateFields, bindVars, paramCounter);
      paramCounter = updateFields.paramCounter;

      parts.push(`UPDATE ${update.document}`);
      parts.push(`WITH ${updateFields.aql}`);
      parts.push(`IN ${update.collection}`);

      if (update.oldReference) {
        // Return OLD and NEW references
        parts.push(`RETURN { old: OLD, new: NEW }`);
      }
    }
  }

  // RETURN clause
  if (query.returnValue !== undefined) {
    const returnStr = expressionToAql(query.returnValue as AqlExpression, bindVars, paramCounter);
    parts.push(`RETURN ${returnStr.aql}`);
  }

  return {
    query: parts.join('\n'),
    bindVars
  };
}

function buildGraphTraversal(graph: AqlGraph): string {
  let traversal = `${graph.minDepth || 1}..${graph.maxDepth || graph.minDepth || 1}`;

  const vertex = graph.startVertex.startsWith('@')
    ? graph.startVertex
    : graph.startVertex.startsWith('"')
      ? graph.startVertex
      : `"${graph.startVertex}"`;

  traversal += ` ${graph.direction} ${vertex} GRAPH "${graph.graph}"`;
  return traversal;
}

function expressionToAql(
  expr: AqlValue,
  bindVars: Record<string, AqlValue>,
  paramCounter: number
): { aql: string; paramCounter: number } {
  if (expr instanceof ExpressionBuilder) {
    expr = expr.getExpression();
  }

  if (typeof expr === 'string') {
    if (expr.startsWith('@')) {
      return { aql: expr, paramCounter };
    }
    return { aql: expr, paramCounter };
  }

  if (typeof expr === 'number' || typeof expr === 'boolean') {
    return { aql: String(expr), paramCounter };
  }

  if (expr === null) {
    return { aql: 'null', paramCounter };
  }

  if (expr && typeof expr === 'object' && 'query' in expr && 'bindVars' in expr) {
    const subquery = expr as GeneratedAqlQuery;
    Object.assign(bindVars, subquery.bindVars);
    return { aql: `(${subquery.query})`, paramCounter };
  }

  if (expr && typeof expr === 'object' && 'type' in expr) {
    const typedExpr = expr as AqlExpression;
    switch (typedExpr.type) {
      case 'literal':
        if (typeof typedExpr.value === 'string') {
          return { aql: `"${typedExpr.value}"`, paramCounter };
        }
        if (typeof typedExpr.value === 'boolean') {
          return { aql: typedExpr.value ? 'true' : 'false', paramCounter };
        }
        if (typeof typedExpr.value === 'number') {
          return { aql: String(typedExpr.value), paramCounter };
        }
        if (typedExpr.value === null) {
          return { aql: 'null', paramCounter };
        }
        if (Array.isArray(typedExpr.value)) {
          const paramName = `array${paramCounter++}`;
          bindVars[paramName] = typedExpr.value;
          return { aql: `@${paramName}`, paramCounter };
        }
        return { aql: JSON.stringify(typedExpr.value), paramCounter };

      case 'reference':
        return { aql: typedExpr.name, paramCounter };

      case 'parameter':
        return {
          aql: typedExpr.isCollection ? `@@${typedExpr.name}` : `@${typedExpr.name}`,
          paramCounter
        };

      case 'binary': {
        if (typedExpr.operator === 'IN' || typedExpr.operator === 'NOT IN') {
          const left = expressionToAql(typedExpr.left, bindVars, paramCounter);
          paramCounter = left.paramCounter;

          let rightAql: string;
          if (typedExpr.right.type === 'literal' && Array.isArray(typedExpr.right.value)) {
            const paramName = `inValues${paramCounter++}`;
            bindVars[paramName] = typedExpr.right.value;
            rightAql = `@${paramName}`;
          } else {
            const right = expressionToAql(typedExpr.right, bindVars, paramCounter);
            paramCounter = right.paramCounter;
            rightAql = right.aql;
          }

          return {
            aql: `(${left.aql} ${typedExpr.operator} ${rightAql})`,
            paramCounter
          };
        }

        const left = expressionToAql(typedExpr.left, bindVars, paramCounter);
        paramCounter = left.paramCounter;
        const right = expressionToAql(typedExpr.right, bindVars, paramCounter);
        paramCounter = right.paramCounter;
        return {
          aql: `(${left.aql} ${typedExpr.operator} ${right.aql})`,
          paramCounter
        };
      }

      case 'unary': {
        const operand = expressionToAql(typedExpr.operand, bindVars, paramCounter);
        paramCounter = operand.paramCounter;
        return { aql: `${typedExpr.operator}${operand.aql}`, paramCounter };
      }

      case 'function': {
        const args = typedExpr.args.map((arg: AqlExpression) => {
          const result = expressionToAql(arg, bindVars, paramCounter);
          paramCounter = result.paramCounter;
          return result.aql;
        });
        return { aql: `${typedExpr.name}(${args.join(', ')})`, paramCounter };
      }

      case 'ternary':
        {
          const cond = expressionToAql(typedExpr.condition, bindVars, paramCounter);
          paramCounter = cond.paramCounter;
          const thenVal = expressionToAql(typedExpr.thenValue, bindVars, paramCounter);
          paramCounter = thenVal.paramCounter;
          const elseVal = expressionToAql(typedExpr.elseValue, bindVars, paramCounter);
          paramCounter = elseVal.paramCounter;
          return {
            aql: `(${cond.aql} ? ${thenVal.aql} : ${elseVal.aql})`,
            paramCounter
          };
        }

      case 'like': {
        const exprResult = expressionToAql(typedExpr.expression, bindVars, paramCounter);
        paramCounter = exprResult.paramCounter;

        const patternParam = `likePattern${paramCounter++}`;
        bindVars[patternParam] = typedExpr.pattern;

        if (typedExpr.caseInsensitive) {
          return {
            aql: `LIKE(${exprResult.aql}, @${patternParam}, 'i')`,
            paramCounter
          };
        }

        return {
          aql: `(${exprResult.aql} LIKE @${patternParam})`,
          paramCounter
        };
      }

      case 'regex': {
        const exprResult = expressionToAql(typedExpr.expression, bindVars, paramCounter);
        paramCounter = exprResult.paramCounter;

        const patternParam = `regexPattern${paramCounter++}`;
        bindVars[patternParam] = typedExpr.pattern;

        const args = [exprResult.aql, `@${patternParam}`];
        if (typedExpr.flags) {
          args.push(`"${typedExpr.flags}"`);
        }

        return {
          aql: `REGEX_MATCH(${args.join(', ')})`,
          paramCounter
        };
      }

    }
  }

  if (typeof expr === 'object') {
    return documentToAql(expr, bindVars, paramCounter);
  }

  return { aql: JSON.stringify(expr), paramCounter };
}

/**
 * Convert a document object to AQL
 */
function documentToAql(
  doc: AqlValue,
  bindVars: Record<string, AqlValue>,
  paramCounter: number
): { aql: string; paramCounter: number } {
  if (typeof doc !== 'object' || doc === null) {
    return expressionToAql(doc, bindVars, paramCounter);
  }

  const entries: string[] = [];
  for (const [key, value] of Object.entries(doc)) {
    let valueStr: { aql: string; paramCounter: number };

    if (typeof value === 'string' && !value.startsWith('@')) {
      valueStr = { aql: JSON.stringify(value), paramCounter };
    } else {
      valueStr = expressionToAql(value, bindVars, paramCounter);
    }

    paramCounter = valueStr.paramCounter;
    entries.push(`"${key}": ${valueStr.aql}`);
  }

  return {
    aql: `{${entries.join(', ')}}`,
    paramCounter
  };
}

/**
 * Builder for UPSERT operation
 */
class UpsertBuilder {
  constructor(private readonly builder: AQLBuilder, private readonly searchDoc: AqlValue) { }

  insert(insertDoc: AqlValue): UpsertUpdateBuilder {
    return new UpsertUpdateBuilder(this.builder, this.searchDoc, insertDoc);
  }
}

/**
 * Builder for UPSERT UPDATE clause
 */
class UpsertUpdateBuilder {
  constructor(
    private readonly builder: AQLBuilder,
    private readonly searchDoc: AqlValue,
    private readonly insertDoc: AqlValue
  ) { }

  update(updateDoc: AqlValue): UpsertIntoBuilder {
    return new UpsertIntoBuilder(this.builder, this.searchDoc, this.insertDoc, updateDoc);
  }
}

/**
 * Builder for UPSERT INTO clause
 */
class UpsertIntoBuilder {
  constructor(
    private readonly builder: AQLBuilder,
    private readonly searchDoc: AqlValue,
    private readonly insertDoc: AqlValue,
    private readonly updateDoc: AqlValue
  ) { }

  into(collection: string): AQLBuilder {
    return this.builder._addUpsert({
      type: 'UPSERT',
      searchDoc: this.searchDoc,
      insertDoc: this.insertDoc,
      updateDoc: this.updateDoc,
      collection
    });
  }
}

/**
 * Builder for OLD reference in UPDATE
 */
class OldBuilder {
  /**
  * Reference OLD field value
  */
  field(fieldName: string): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'old',
      path: `OLD.${fieldName}`
    } as OldReference);
  }
}

function createOldBuilder(): OldBuilder {
  const builder = new OldBuilder();
  return new Proxy(builder, {
    get(target, prop: string) {
      if (prop in target) {
        return target[prop as keyof OldBuilder];
      }
      // Dynamic field access: old.visits -> OLD.visits
      return target.field(prop);
    }
  });
}

/**
 * Builder for COLLECT with KEEP
 */
class CollectKeepBuilder {
  constructor(
    private readonly builder: AQLBuilder,
    private readonly variables: Record<string, AqlValue>,
    private readonly fields: string[]
  ) { }

  sort(...args: string[]): AQLBuilder {
    // @ts-ignore
    return this.builder.sort(...args);
  }

  into(groupName: string): AQLBuilder {
    return this.builder._addCollectKeep({
      variables: this.variables,
      into: groupName,
      keep: this.fields
    });
  }

  aggregate(aggregations: Record<string, ExpressionBuilder>): AQLBuilder {
    const aggs = Object.entries(aggregations).reduce((acc, [name, expr]) => {
      acc[name] = expr.getExpression();
      return acc;
    }, {} as Record<string, AqlValue>);

    return this.builder._addCollectKeep({
      variables: this.variables,
      aggregate: aggs,
      keep: this.fields
    });
  }
}

// Static factory methods for convenience
export const AB = {
  for: (variable: string): AQLBuilder => {
    return new AQLBuilder().for(variable);
  },
  ref,
  var: variable,
  value: (val: AqlValue): AqlValue => val,
  range: (start: number, end: number) => ({ type: 'range' as const, start, end }),
  str: (value: string) => value,
};
