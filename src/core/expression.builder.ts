/**
 * Expression Builder for AQL
 * Provides a fluent API for building AQL expressions
 */

import {
  AqlAllOperator,
  AqlAnyOperator,
  AqlExpression,
  AqlFunctionCall,
  AqlLike,
  AqlLiteral,
  AqlRegex,
  AqlUnset,
  AqlValue
} from './core.types';

/**
 * Builder class for creating AQL expressions with chainable methods
 */
export class ExpressionBuilder<T = any> {
  constructor(private readonly expression: AqlExpression) { }

  /**
   * Get the underlying expression
   */
  getExpression(): AqlExpression {
    return this.expression;
  }

  /**
   * Custom JSON serialization
   */
  toJSON(): AqlExpression {
    return this.expression;
  }

  /**
   * Type-safe property access
   */
  get<K extends keyof T>(name: K): ExpressionBuilder<T[K]> {
    const current = this.expression;
    if (typeof current === 'string') {
      return new ExpressionBuilder<T[K]>(`${current}.${String(name)}` as any);
    }
    if (typeof current === 'object' && current !== null && (current as any).type === 'reference') {
      return new ExpressionBuilder<T[K]>(`${(current as any).name}.${String(name)}` as any);
    }
    throw new Error('Cannot access property on complex expression');
  }

  /**
   * Equals comparison (==)
   */
  eq(value: T | ExpressionBuilder<T>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '==',
      left: this.expression,
      right: toExpression(value as any)
    });
  }

  /**
   * Not equals comparison (!=)
   */
  neq(value: T | ExpressionBuilder<T>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '!=',
      left: this.expression,
      right: toExpression(value as any)
    });
  }

  /**
   * Less than comparison (<)
   */
  lt(value: T | ExpressionBuilder<T>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '<',
      left: this.expression,
      right: toExpression(value as any)
    });
  }

  /**
   * Less than or equal comparison (<=)
   */
  lte(value: T | ExpressionBuilder<T>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '<=',
      left: this.expression,
      right: toExpression(value as any)
    });
  }

  /**
   * Greater than comparison (>)
   */
  gt(value: T | ExpressionBuilder<T>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '>',
      left: this.expression,
      right: toExpression(value as any)
    });
  }

  /**
   * Greater than or equal comparison (>=)
   */
  gte(value: T | ExpressionBuilder<T>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '>=',
      left: this.expression,
      right: toExpression(value as any)
    });
  }



  /**
   * Logical AND (&&)
   */
  and(other: ExpressionBuilder | AqlExpression): ExpressionBuilder<boolean> {
    const rightExpr = other instanceof ExpressionBuilder ? other.expression : other;
    return new ExpressionBuilder({
      type: 'binary',
      operator: '&&',
      left: this.expression,
      right: rightExpr
    });
  }

  /**
   * Logical OR (||)
   */
  or(other: ExpressionBuilder | AqlExpression): ExpressionBuilder<boolean> {
    const rightExpr = other instanceof ExpressionBuilder ? other.expression : other;
    return new ExpressionBuilder({
      type: 'binary',
      operator: '||',
      left: this.expression,
      right: rightExpr
    });
  }

  /**
   * Addition (+)
   */
  add(value: AqlValue | ExpressionBuilder): ExpressionBuilder<number> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '+',
      left: this.expression,
      right: toExpression(value)
    });
  }

  /**
   * Subtraction (-)
   */
  sub(value: AqlValue | ExpressionBuilder): ExpressionBuilder<number> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '-',
      left: this.expression,
      right: toExpression(value)
    });
  }

  /**
   * Multiplication (*)
   */
  times(value: AqlValue | ExpressionBuilder): ExpressionBuilder<number> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '*',
      left: this.expression,
      right: toExpression(value)
    });
  }

  /**
   * Division (/)
   */
  div(value: AqlValue | ExpressionBuilder): ExpressionBuilder<number> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '/',
      left: this.expression,
      right: toExpression(value)
    });
  }

  /**
   * Modulo (%)
   */
  mod(value: AqlValue | ExpressionBuilder): ExpressionBuilder<number> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: '%',
      left: this.expression,
      right: toExpression(value)
    });
  }

  /**
   * IN operator
   */
  in(values: T[] | ExpressionBuilder<T[]>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: 'IN',
      left: this.expression,
      right: Array.isArray(values) ? { type: 'literal', value: values } : toExpression(values as any)
    });
  }

  /**
   * Ternary conditional - then branch
   */
  then(value: AqlValue | ExpressionBuilder): TernaryBuilder {
    return new TernaryBuilder(this.expression, toExpression(value));
  }

  all(condition: ExpressionBuilder): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'all',
      expression: this.expression,
      condition: condition.getExpression()
    } as AqlAllOperator);
  }

  any(condition: ExpressionBuilder): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'any',
      expression: this.expression,
      condition: condition.getExpression()
    } as AqlAnyOperator);
  }


  /**
  * NOT IN operator
  */
  notIn(values: T[] | ExpressionBuilder<T[]>): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'binary',
      operator: 'NOT IN',
      left: this.expression,
      right: Array.isArray(values) ? {
        type: 'literal',
        value: values
      } : toExpression(values as any)
    });
  }

  /**
  * LIKE operator for string patterns
  */
  like(pattern: string, caseInsensitive = false): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'like',
      expression: this.expression,
      pattern,
      caseInsensitive
    } as AqlLike);
  }

  /**
  * Regex operator for pattern matching
  */
  regex(pattern: string, flags?: string): ExpressionBuilder<boolean> {
    return new ExpressionBuilder({
      type: 'regex',
      expression: this.expression,
      pattern,
      flags
    } as AqlRegex);
  }

}

/**
 * Recursive Proxy type for deep property access
 */
export type RecursiveProxy<T> = ExpressionBuilder<T> & { [K in keyof T]: RecursiveProxy<T[K]> };

function createRecursiveProxy<T>(builder: ExpressionBuilder<T>): RecursiveProxy<T> {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      if (typeof prop === 'string') {
        const nextBuilder = target.get(prop as any);
        return createRecursiveProxy(nextBuilder);
      }

      return Reflect.get(target, prop, receiver);
    }
  }) as any;
}

export function ref<T = AqlValue>(name: string): RecursiveProxy<T> {
  const builder = new ExpressionBuilder<T>({
    type: 'reference',
    name: name as string
  });

  return createRecursiveProxy(builder);
}

/**
 * FLOOR function
 */
export function FLOOR(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'FLOOR',
    args: [toExpression(expr)]
  });
}

/**
 * RAND function
 */
export function RAND(): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'RAND',
    args: []
  });
}

/**
 * CONCAT function
 */
export function CONCAT(...args: (AqlValue | ExpressionBuilder)[]): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'CONCAT',
    args: args.map(toExpression)
  });
}

/**
 * TO_STRING function
 */
export function TO_STRING(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'TO_STRING',
    args: [toExpression(expr)]
  });
}

/**
 * Create a range for FOR loops
 */
export function range(start: number, end: number) {
  return {
    type: 'range' as const,
    start,
    end
  };
}

/**
 * COUNT aggregate function - counts documents/values
 * COUNT(1) counts all documents
 * COUNT(expr) counts non-null values
 */
export function COUNT(expr: AqlValue | ExpressionBuilder = 1): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'COUNT',
    args: [toExpression(expr)]
  });
}

/**
 * SUM aggregate function - sums numeric values
 * SUM(values[*].amount)
 */
export function SUM(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'SUM',
    args: [toExpression(expr)]
  });
}

/**
 * AVERAGE aggregate function - calculates average
 * Also works as AVG()
 */
export function AVERAGE(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'AVERAGE',
    args: [toExpression(expr)]
  });
}

/**
 * AVG - alias for AVERAGE
 */
export function AVG(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return AVERAGE(expr);
}

/**
 * MIN aggregate function - finds minimum value
 */
export function MIN(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'MIN',
    args: [toExpression(expr)]
  });
}

/**
 * MAX aggregate function - finds maximum value
 */
export function MAX(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'MAX',
    args: [toExpression(expr)]
  });
}

/**
 * SUBSTRING function - extracts substring
 * SUBSTRING(string, start, length)
 */
export function SUBSTRING(str: AqlValue | ExpressionBuilder, start: AqlValue | ExpressionBuilder, length?: AqlValue | ExpressionBuilder): ExpressionBuilder {
  const args = length ? [toExpression(str), toExpression(start), toExpression(length)]
    : [toExpression(str), toExpression(start)];
  return new ExpressionBuilder({
    type: 'function',
    name: 'SUBSTRING',
    args
  });
}

/**
 * LENGTH function - returns length of string/array
 */
export function LENGTH(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'LENGTH',
    args: [toExpression(expr)]
  });
}

/**
 * LOWER function - converts to lowercase
 */
export function LOWER(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'LOWER',
    args: [toExpression(expr)]
  });
}

/**
 * UPPER function - converts to uppercase
 */
export function UPPER(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'UPPER',
    args: [toExpression(expr)]
  });
}

/**
 * TRIM function - removes whitespace
 * TRIM(string, side) - side: 'LEFT', 'RIGHT', 'BOTH'
 */
export function TRIM(expr: AqlValue | ExpressionBuilder, side?: 'LEFT' | 'RIGHT' | 'BOTH'): ExpressionBuilder {
  const args = side ? [(toExpression(expr), { type: 'literal', value: side }) as AqlExpression]
    : [toExpression(expr)];
  return new ExpressionBuilder({
    type: 'function',
    name: 'TRIM',
    args
  });
}

/**
 * REVERSE function - reverses string or array
 */
export function REVERSE(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'REVERSE',
    args: [toExpression(expr)]
  });
}

/**
 * SPLIT function - splits string by delimiter
 */
export function SPLIT(str: AqlValue | ExpressionBuilder, delimiter: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'SPLIT',
    args: [toExpression(str), toExpression(delimiter)]
  });
}

/**
 * LIKE function - pattern matching (regex-like)
 */
export function LIKE(expr: AqlValue | ExpressionBuilder, pattern: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'LIKE',
    args: [toExpression(expr), toExpression(pattern)]
  });
}

/**
 * FIRST function - returns first element
 */
export function FIRST(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'FIRST',
    args: [toExpression(expr)]
  });
}

/**
 * LAST function - returns last element
 */
export function LAST(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'LAST',
    args: [toExpression(expr)]
  });
}

/**
 * NTH function - returns nth element
 */
export function NTH(expr: AqlValue | ExpressionBuilder, index: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'NTH',
    args: [toExpression(expr), toExpression(index)]
  });
}

/**
 * APPEND function - appends element to array
 */
export function APPEND(array: AqlValue | ExpressionBuilder, element: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'APPEND',
    args: [toExpression(array), toExpression(element)]
  });
}

/**
 * FLATTEN function - flattens nested arrays
 */
export function FLATTEN(expr: AqlValue | ExpressionBuilder, depth?: number): ExpressionBuilder {
  const args = depth ? [(toExpression(expr), { type: 'literal', value: depth }) as AqlExpression]
    : [toExpression(expr)];
  return new ExpressionBuilder({
    type: 'function',
    name: 'FLATTEN',
    args
  });
}

/**
 * UNIQUE function - removes duplicates
 */
export function UNIQUE(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'UNIQUE',
    args: [toExpression(expr)]
  });
}

/**
 * SORT function - sorts array
 */
export function SORT(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'SORT',
    args: [toExpression(expr)]
  });
}

/**
 * SQRT function - square root
 */
export function SQRT(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'SQRT',
    args: [toExpression(expr)]
  });
}

/**
 * POW function - power/exponent
 */
export function POW(base: AqlValue | ExpressionBuilder, exponent: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'POW',
    args: [toExpression(base), toExpression(exponent)]
  });
}

/**
 * CEIL function - ceiling (round up)
 */
export function CEIL(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'CEIL',
    args: [toExpression(expr)]
  });
}

/**
 * ROUND function - round to nearest integer
 */
export function ROUND(expr: AqlValue | ExpressionBuilder, decimals?: number): ExpressionBuilder {
  const args = decimals ? [(toExpression(expr), { type: 'literal', value: decimals }) as AqlExpression]
    : [toExpression(expr)];
  return new ExpressionBuilder({
    type: 'function',
    name: 'ROUND',
    args
  });
}

/**
 * ABS function - absolute value
 */
export function ABS(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'ABS',
    args: [toExpression(expr)]
  });
}

/**
 * LOG function - natural logarithm
 */
export function LOG(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'LOG',
    args: [toExpression(expr)]
  });
}

/**
 * TYPE_OF function - returns type of value
 */
export function TYPE_OF(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'TYPE_OF',
    args: [toExpression(expr)]
  });
}

/**
 * IS_NULL function - checks if null
 */
export function IS_NULL(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'IS_NULL',
    args: [toExpression(expr)]
  });
}

/**
 * IS_BOOL function - checks if boolean
 */
export function IS_BOOL(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'IS_BOOL',
    args: [toExpression(expr)]
  });
}

/**
 * IS_NUMBER function - checks if number
 */
export function IS_NUMBER(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'IS_NUMBER',
    args: [toExpression(expr)]
  });
}

/**
 * IS_STRING function - checks if string
 */
export function IS_STRING(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'IS_STRING',
    args: [toExpression(expr)]
  });
}

/**
 * IS_ARRAY function - checks if array
 */
export function IS_ARRAY(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'IS_ARRAY',
    args: [toExpression(expr)]
  });
}

/**
 * IS_OBJECT function - checks if object
 */
export function IS_OBJECT(expr: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'IS_OBJECT',
    args: [toExpression(expr)]
  });
}

/**
 * HAS function - checks if object has property
 */
export function HAS(obj: AqlValue | ExpressionBuilder, property: AqlValue | ExpressionBuilder): ExpressionBuilder {
  return new ExpressionBuilder({
    type: 'function',
    name: 'HAS',
    args: [toExpression(obj), toExpression(property)]
  });
}

/**
 * Convert a value to an AQL expression
 */
function toExpression(value: AqlValue | ExpressionBuilder): AqlExpression {
  if (value instanceof ExpressionBuilder) {
    return value.getExpression();
  }
  if (typeof value === 'object' && value !== null && 'type' in value) {
    return value as AqlExpression;
  }
  return { type: 'literal', value: value as any };
}

/**
 * Helper for ternary expressions
 */
class TernaryBuilder {
  constructor(private condition: AqlExpression, private thenExpr: any) { }

  else(elseExpr: any): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'ternary',
      condition: this.condition,
      thenValue: toExpression(this.thenExpr),
      elseValue: toExpression(elseExpr)
    });
  }
}

/**
 * Date/Time Functions
 */
export class DateFunctions {
  static now(): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'function',
      name: 'DATE_NOW',
      args: []
    } as AqlFunctionCall);
  }

  static format(date: ExpressionBuilder | string, format: string): ExpressionBuilder {
    const dateExpr = typeof date === 'string'
      ? { type: 'reference', name: date } as AqlExpression
      : (date instanceof ExpressionBuilder ? date.getExpression() : date);

    return new ExpressionBuilder({
      type: 'function',
      name: 'DATE_FORMAT',
      args: [dateExpr, { type: 'literal', value: format } as AqlLiteral]
    });
  }

  static parse(dateString: string, format: string): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'function',
      name: 'DATE_PARSE',
      args: [
        { type: 'literal', value: dateString },
        { type: 'literal', value: format }
      ]
    } as AqlFunctionCall);
  }

  static add(date: ExpressionBuilder | string, value: number, unit: string): ExpressionBuilder {
    const dateExpr = typeof date === 'string'
      ? ({ type: 'reference', name: date } as AqlExpression)
      : (date instanceof ExpressionBuilder ? date.getExpression() : date);

    return new ExpressionBuilder({
      type: 'function',
      name: 'DATE_ADD',
      args: [
        dateExpr,
        { type: 'literal', value: value } as AqlLiteral,
        { type: 'literal', value: unit } as AqlLiteral
      ]
    } as AqlFunctionCall);
  }

  static subtract(date: ExpressionBuilder | string, value: number, unit: string): ExpressionBuilder {
    const dateExpr = typeof date === 'string'
      ? ({ type: 'reference', name: date } as AqlExpression)
      : (date instanceof ExpressionBuilder ? date.getExpression() : date);

    return new ExpressionBuilder({
      type: 'function',
      name: 'DATE_SUBTRACT',
      args: [
        dateExpr,
        { type: 'literal', value: value } as AqlLiteral,
        { type: 'literal', value: unit } as AqlLiteral
      ]
    } as AqlFunctionCall);
  }

  static difference(date1: ExpressionBuilder | string, date2: ExpressionBuilder | string, unit: string): ExpressionBuilder {
    const expr1 = typeof date1 === 'string'
      ? ({ type: 'reference', name: date1 } as AqlExpression)
      : (date1 instanceof ExpressionBuilder ? date1.getExpression() : date1);

    const expr2 = typeof date2 === 'string'
      ? ({ type: 'reference', name: date2 } as AqlExpression)
      : (date2 instanceof ExpressionBuilder ? date2.getExpression() : date2);

    return new ExpressionBuilder({
      type: 'function',
      name: 'DATE_DIFFERENCE',
      args: [expr1, expr2, { type: 'literal', value: unit } as AqlLiteral]
    } as AqlFunctionCall);
  }

  static year(date: ExpressionBuilder | string): ExpressionBuilder {
    return this._dateComponent(date, 'DATE_YEAR');
  }

  static month(date: ExpressionBuilder | string): ExpressionBuilder {
    return this._dateComponent(date, 'DATE_MONTH');
  }

  static day(date: ExpressionBuilder | string): ExpressionBuilder {
    return this._dateComponent(date, 'DATE_DAY');
  }

  private static _dateComponent(date: ExpressionBuilder | string, fn: string): ExpressionBuilder {
    const dateExpr = typeof date === 'string'
      ? ({ type: 'reference', name: date } as AqlExpression)
      : (date instanceof ExpressionBuilder ? date.getExpression() : date);

    return new ExpressionBuilder({
      type: 'function',
      name: fn,
      args: [dateExpr]
    } as AqlFunctionCall);
  }
}

/**
 * String Functions
 */
export class StringFunctions {
  static concat(...args: (ExpressionBuilder | string)[]): ExpressionBuilder {
    const expressions = args.map(arg =>
      typeof arg === 'string'
        ? ({ type: 'reference', name: arg } as AqlExpression)
        : (arg instanceof ExpressionBuilder ? arg.getExpression() : arg)
    );

    return new ExpressionBuilder({
      type: 'function',
      name: 'CONCAT',
      args: expressions
    } as AqlFunctionCall);
  }

  static concatSeparator(separator: string, ...args: (ExpressionBuilder | string)[]): ExpressionBuilder {
    const expressions = [
      { type: 'literal', value: separator } as AqlLiteral,
      ...args.map(arg =>
        typeof arg === 'string'
          ? ({ type: 'reference', name: arg } as AqlExpression)
          : (arg instanceof ExpressionBuilder ? arg.getExpression() : arg)
      )
    ];

    return new ExpressionBuilder({
      type: 'function',
      name: 'CONCAT_SEPARATOR',
      args: expressions
    } as AqlFunctionCall);
  }

  static lower(str: ExpressionBuilder | string): ExpressionBuilder {
    return this._stringFn(str, 'LOWER');
  }

  static upper(str: ExpressionBuilder | string): ExpressionBuilder {
    return this._stringFn(str, 'UPPER');
  }

  static trim(str: ExpressionBuilder | string): ExpressionBuilder {
    return this._stringFn(str, 'TRIM');
  }

  static ltrim(str: ExpressionBuilder | string): ExpressionBuilder {
    return this._stringFn(str, 'LTRIM');
  }

  static rtrim(str: ExpressionBuilder | string): ExpressionBuilder {
    return this._stringFn(str, 'RTRIM');
  }

  static substring(str: ExpressionBuilder | string, start: number, length?: number): ExpressionBuilder {
    const strExpr = typeof str === 'string'
      ? ({ type: 'reference', name: str } as AqlExpression)
      : (str instanceof ExpressionBuilder ? str.getExpression() : str);

    const args = [
      strExpr,
      { type: 'literal', value: start } as AqlLiteral
    ];

    if (length !== undefined) {
      args.push({ type: 'literal', value: length } as AqlLiteral);
    }

    return new ExpressionBuilder({
      type: 'function',
      name: 'SUBSTRING',
      args
    } as AqlFunctionCall);
  }

  static split(str: ExpressionBuilder | string, separator: string): ExpressionBuilder {
    const strExpr = typeof str === 'string'
      ? ({ type: 'reference', name: str } as AqlExpression)
      : (str instanceof ExpressionBuilder ? str.getExpression() : str);

    return new ExpressionBuilder({
      type: 'function',
      name: 'SPLIT',
      args: [strExpr, { type: 'literal', value: separator } as AqlLiteral]
    } as AqlFunctionCall);
  }

  static replace(str: ExpressionBuilder | string, search: string, replacement: string): ExpressionBuilder {
    const strExpr = typeof str === 'string'
      ? ({ type: 'reference', name: str } as AqlExpression)
      : (str instanceof ExpressionBuilder ? str.getExpression() : str);

    return new ExpressionBuilder({
      type: 'function',
      name: 'REPLACE',
      args: [
        strExpr,
        { type: 'literal', value: search } as AqlLiteral,
        { type: 'literal', value: replacement } as AqlLiteral
      ]
    } as AqlFunctionCall);
  }

  static startsWith(str: ExpressionBuilder | string, prefix: string): ExpressionBuilder {
    const strExpr = typeof str === 'string'
      ? ({ type: 'reference', name: str } as AqlExpression)
      : (str instanceof ExpressionBuilder ? str.getExpression() : str);

    return new ExpressionBuilder({
      type: 'function',
      name: 'STARTS_WITH',
      args: [strExpr, { type: 'literal', value: prefix } as AqlLiteral]
    } as AqlFunctionCall);
  }

  static endsWith(str: ExpressionBuilder | string, suffix: string): ExpressionBuilder {
    const strExpr = typeof str === 'string'
      ? ({ type: 'reference', name: str } as AqlExpression)
      : (str instanceof ExpressionBuilder ? str.getExpression() : str);

    return new ExpressionBuilder({
      type: 'function',
      name: 'ENDS_WITH',
      args: [strExpr, { type: 'literal', value: suffix } as AqlLiteral]
    } as AqlFunctionCall);
  }

  private static _stringFn(str: ExpressionBuilder | string, fn: string): ExpressionBuilder {
    const strExpr = typeof str === 'string'
      ? ({ type: 'reference', name: str } as AqlExpression)
      : (str instanceof ExpressionBuilder ? str.getExpression() : str);

    return new ExpressionBuilder({
      type: 'function',
      name: fn,
      args: [strExpr]
    } as AqlFunctionCall);
  }
}

/**
 * Array Functions
 */
export class ArrayFunctions {
  static unique(arr: ExpressionBuilder | string): ExpressionBuilder {
    return this._arrayFn(arr, 'UNIQUE');
  }

  static reverse(arr: ExpressionBuilder | string): ExpressionBuilder {
    return this._arrayFn(arr, 'REVERSE');
  }

  static first(arr: ExpressionBuilder | string): ExpressionBuilder {
    return this._arrayFn(arr, 'FIRST');
  }

  static last(arr: ExpressionBuilder | string): ExpressionBuilder {
    return this._arrayFn(arr, 'LAST');
  }

  static flatten(arr: ExpressionBuilder | string, depth = 1): ExpressionBuilder {
    const arrExpr = typeof arr === 'string'
      ? ({ type: 'reference', name: arr } as AqlExpression)
      : (arr instanceof ExpressionBuilder ? arr.getExpression() : arr);

    return new ExpressionBuilder({
      type: 'function',
      name: 'FLATTEN',
      args: [arrExpr, { type: 'literal', value: depth } as AqlLiteral]
    } as AqlFunctionCall);
  }

  static union(...arrays: (ExpressionBuilder | string)[]): ExpressionBuilder {
    const expressions = arrays.map(arr =>
      typeof arr === 'string'
        ? ({ type: 'reference', name: arr } as AqlExpression)
        : (arr instanceof ExpressionBuilder ? arr.getExpression() : arr)
    );

    return new ExpressionBuilder({
      type: 'function',
      name: 'UNION',
      args: expressions
    } as AqlFunctionCall);
  }

  static intersection(...arrays: (ExpressionBuilder | string)[]): ExpressionBuilder {
    const expressions = arrays.map(arr =>
      typeof arr === 'string'
        ? ({ type: 'reference', name: arr } as AqlExpression)
        : (arr instanceof ExpressionBuilder ? arr.getExpression() : arr)
    );

    return new ExpressionBuilder({
      type: 'function',
      name: 'INTERSECTION',
      args: expressions
    } as AqlFunctionCall);
  }

  static minus(...arrays: (ExpressionBuilder | string)[]): ExpressionBuilder {
    const expressions = arrays.map(arr =>
      typeof arr === 'string'
        ? ({ type: 'reference', name: arr } as AqlExpression)
        : (arr instanceof ExpressionBuilder ? arr.getExpression() : arr)
    );

    return new ExpressionBuilder({
      type: 'function',
      name: 'MINUS',
      args: expressions
    } as AqlFunctionCall);
  }

  static nth(arr: ExpressionBuilder | string, n: number): ExpressionBuilder {
    const arrExpr = typeof arr === 'string'
      ? ({ type: 'reference', name: arr } as AqlExpression)
      : (arr instanceof ExpressionBuilder ? arr.getExpression() : arr);

    return new ExpressionBuilder({
      type: 'function',
      name: 'NTH',
      args: [arrExpr, { type: 'literal', value: n } as AqlLiteral]
    } as AqlFunctionCall);
  }

  static range(start: number, end: number, step = 1): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'function',
      name: 'RANGE',
      args: [
        { type: 'literal', value: start } as AqlLiteral,
        { type: 'literal', value: end } as AqlLiteral,
        { type: 'literal', value: step } as AqlLiteral
      ]
    } as AqlFunctionCall);
  }

  private static _arrayFn(arr: ExpressionBuilder | string, fn: string): ExpressionBuilder {
    const arrExpr = typeof arr === 'string'
      ? ({ type: 'reference', name: arr } as AqlExpression)
      : (arr instanceof ExpressionBuilder ? arr.getExpression() : arr);

    return new ExpressionBuilder({
      type: 'function',
      name: fn,
      args: [arrExpr]
    } as AqlFunctionCall);
  }
}

/**
 * Math Functions
 */
export class MathFunctions {
  static round(num: ExpressionBuilder | number, digits = 0): ExpressionBuilder {
    return this._mathFn(num, 'ROUND', digits);
  }

  static floor(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'FLOOR');
  }

  static ceil(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'CEIL');
  }

  static abs(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'ABS');
  }

  static sqrt(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'SQRT');
  }

  static pow(base: ExpressionBuilder | number, exponent: ExpressionBuilder | number): ExpressionBuilder {
    const baseExpr = this._toExpr(base);
    const expExpr = this._toExpr(exponent);

    return new ExpressionBuilder({
      type: 'function',
      name: 'POW',
      args: [baseExpr, expExpr]
    } as AqlFunctionCall);
  }

  static log(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'LOG');
  }

  static log10(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'LOG10');
  }

  static log2(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'LOG2');
  }

  static sin(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'SIN');
  }

  static cos(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'COS');
  }

  static tan(num: ExpressionBuilder | number): ExpressionBuilder {
    return this._mathSingleFn(num, 'TAN');
  }

  private static _mathFn(num: ExpressionBuilder | number, fn: string, extra?: number): ExpressionBuilder {
    const numExpr = this._toExpr(num);
    const args: AqlExpression[] = [numExpr];

    if (extra !== undefined) {
      args.push({ type: 'literal', value: extra } as AqlLiteral);
    }

    return new ExpressionBuilder({
      type: 'function',
      name: fn,
      args
    } as AqlFunctionCall);
  }

  private static _mathSingleFn(num: ExpressionBuilder | number, fn: string): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'function',
      name: fn,
      args: [this._toExpr(num)]
    } as AqlFunctionCall);
  }

  private static _toExpr(value: ExpressionBuilder | number): AqlExpression {
    if (typeof value === 'number') {
      return { type: 'literal', value } as AqlLiteral;
    }
    if (value instanceof ExpressionBuilder) {
      return value.getExpression();
    }
    return value as AqlExpression;
  }
}


/**
 * Search Functions for ArangoSearch
 */
export class SearchFunctions {
  static analyzer(expr: ExpressionBuilder | string, analyzer: string): ExpressionBuilder {
    const exprVal = typeof expr === 'string'
      ? ({ type: 'reference', name: expr } as AqlExpression)
      : (expr instanceof ExpressionBuilder ? expr.getExpression() : expr);

    return new ExpressionBuilder({
      type: 'function',
      name: 'ANALYZER',
      args: [exprVal, { type: 'literal', value: analyzer } as AqlLiteral]
    } as AqlFunctionCall);
  }

  static boost(expr: ExpressionBuilder | string, boost: number): ExpressionBuilder {
    const exprVal = typeof expr === 'string'
      ? ({ type: 'reference', name: expr } as AqlExpression)
      : (expr instanceof ExpressionBuilder ? expr.getExpression() : expr);

    return new ExpressionBuilder({
      type: 'function',
      name: 'BOOST',
      args: [exprVal, { type: 'literal', value: boost } as AqlLiteral]
    } as AqlFunctionCall);
  }

  static phrase(expr: ExpressionBuilder | string, input: string | string[], analyzer?: string): ExpressionBuilder {
    const exprVal = typeof expr === 'string'
      ? ({ type: 'reference', name: expr } as AqlExpression)
      : (expr instanceof ExpressionBuilder ? expr.getExpression() : expr);

    const args: AqlExpression[] = [
      exprVal,
      { type: 'literal', value: input } as AqlLiteral
    ];

    if (analyzer) {
      args.push({ type: 'literal', value: analyzer } as AqlLiteral);
    }

    return new ExpressionBuilder({
      type: 'function',
      name: 'PHRASE',
      args
    } as AqlFunctionCall);
  }

  static tokens(input: string, analyzer: string): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'function',
      name: 'TOKENS',
      args: [
        { type: 'literal', value: input } as AqlLiteral,
        { type: 'literal', value: analyzer } as AqlLiteral
      ]
    } as AqlFunctionCall);
  }

  static minMatch(expr: ExpressionBuilder | string, minMatch: string, ...matches: (ExpressionBuilder | string)[]): ExpressionBuilder {
    const exprVal = typeof expr === 'string'
      ? ({ type: 'reference', name: expr } as AqlExpression)
      : (expr instanceof ExpressionBuilder ? expr.getExpression() : expr);

    const matchExprs = matches.map(m =>
      typeof m === 'string'
        ? ({ type: 'reference', name: m } as AqlExpression)
        : (m instanceof ExpressionBuilder ? m.getExpression() : m)
    );

    return new ExpressionBuilder({
      type: 'function',
      name: 'MIN_MATCH',
      args: [exprVal, { type: 'literal', value: minMatch } as AqlLiteral, ...matchExprs]
    } as AqlFunctionCall);
  }
}

/**
 * Utility Functions
 */
export class UtilityFunctions {
  static merge(...docs: (ExpressionBuilder | object)[]): ExpressionBuilder {
    const expressions = docs.map(doc =>
      doc instanceof ExpressionBuilder
        ? doc.getExpression()
        : ({ type: 'literal', value: doc } as AqlLiteral)
    );

    return new ExpressionBuilder({
      type: 'function',
      name: 'MERGE',
      args: expressions
    } as AqlFunctionCall);
  }

  static unset(obj: ExpressionBuilder | string, ...fields: string[]): ExpressionBuilder {
    const objExpr = typeof obj === 'string'
      ? ({ type: 'reference', name: obj } as AqlExpression)
      : (obj instanceof ExpressionBuilder ? obj.getExpression() : obj);

    return new ExpressionBuilder({
      type: 'unset',
      object: objExpr,
      fields
    } as AqlUnset);
  }

  static uuid(): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'function',
      name: 'UUID',
      args: []
    } as AqlFunctionCall);
  }

  static rand(): ExpressionBuilder {
    return new ExpressionBuilder({
      type: 'function',
      name: 'RAND',
      args: []
    } as AqlFunctionCall);
  }

  static typeof(value: ExpressionBuilder | string): ExpressionBuilder {
    const valExpr = typeof value === 'string'
      ? ({ type: 'reference', name: value } as AqlExpression)
      : (value instanceof ExpressionBuilder ? value.getExpression() : value);

    return new ExpressionBuilder({
      type: 'function',
      name: 'TYPEOF',
      args: [valExpr]
    } as AqlFunctionCall);
  }

  static toNumber(value: ExpressionBuilder | string): ExpressionBuilder {
    const valExpr = typeof value === 'string'
      ? ({ type: 'reference', name: value } as AqlExpression)
      : (value instanceof ExpressionBuilder ? value.getExpression() : value);

    return new ExpressionBuilder({
      type: 'function',
      name: 'TO_NUMBER',
      args: [valExpr]
    } as AqlFunctionCall);
  }

  static toString(value: ExpressionBuilder | any): ExpressionBuilder {
    const valExpr = typeof value === 'string'
      ? ({ type: 'reference', name: value } as AqlExpression)
      : (value instanceof ExpressionBuilder ? value.getExpression() : ({ type: 'literal', value } as AqlLiteral));

    return new ExpressionBuilder({
      type: 'function',
      name: 'TO_STRING',
      args: [valExpr]
    } as AqlFunctionCall);
  }
}

/**
 * REGEX_MATCH function
 */
export function REGEX_MATCH(text: ExpressionBuilder | string, pattern: string, caseInsensitive = false): ExpressionBuilder {
  const textExpr = typeof text === 'string'
    ? ({ type: 'reference', name: text } as AqlExpression)
    : (text instanceof ExpressionBuilder ? text.getExpression() : text);

  const args: AqlExpression[] = [
    textExpr,
    { type: 'literal', value: pattern } as AqlLiteral
  ];

  if (caseInsensitive) {
    args.push({ type: 'literal', value: true } as AqlLiteral);
  }

  return new ExpressionBuilder({
    type: 'function',
    name: 'REGEX_MATCH',
    args
  } as AqlFunctionCall);
}

/**
 * WINDOW function helper
 */
export function WINDOW(preceding: number, following: number, aggregation: ExpressionBuilder): { preceding: number, following: number, aggregation: AqlValue } {
  return {
    preceding,
    following,
    aggregation: aggregation.getExpression()
  };
}