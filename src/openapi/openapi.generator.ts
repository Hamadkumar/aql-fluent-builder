import { AQLBuilder } from '../core/aql.builder';
import { AqlQueryJson } from '../serialization/json.types';
import { serializeQuery } from '../serialization/serializer';

export interface OpenApiOptions {
    title: string;
    version: string;
    description?: string;
    path: string;
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    tags?: string[];
}

export interface OpenApiOperation {
    openapi: '3.0.0';
    info: {
        title: string;
        version: string;
        description?: string;
    };
    paths: {
        [path: string]: {
            [method: string]: {
                summary?: string;
                description?: string;
                tags?: string[];
                parameters?: OpenApiParameter[];
                requestBody?: OpenApiRequestBody;
                responses: {
                    [statusCode: string]: OpenApiResponse;
                };
            };
        };
    };
}

export interface OpenApiParameter {
    name: string;
    in: 'query' | 'path' | 'header' | 'cookie';
    required?: boolean;
    schema: {
        type: string;
        format?: string;
    };
    description?: string;
}

export interface OpenApiRequestBody {
    required: boolean;
    content: {
        'application/json': {
            schema: object;
        };
    };
}

export interface OpenApiResponse {
    description: string;
    content?: {
        'application/json': {
            schema: object;
        };
    };
}

/**
 * Generate an OpenAPI specification from an AQL query
 */
export function generateOpenApiSpec(
    query: AQLBuilder | AqlQueryJson,
    options: OpenApiOptions
): OpenApiOperation {
    const json = query instanceof AQLBuilder ? serializeQuery(query) : query;

    const parameters: OpenApiParameter[] = extractParameters(json);

    return {
        openapi: '3.0.0',
        info: {
            title: options.title,
            version: options.version,
            description: options.description
        },
        paths: {
            [options.path]: {
                [options.method]: {
                    summary: options.title,
                    description: options.description,
                    tags: options.tags,
                    parameters: parameters.length > 0 ? parameters : undefined,
                    responses: {
                        '200': {
                            description: 'Successful operation',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            result: {
                                                type: 'array',
                                                items: {
                                                    type: 'object'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
}

/**
 * Extract parameters from the query JSON
 * Looks for strings starting with @ (bind vars)
 */
function extractParameters(json: any): OpenApiParameter[] {
    const params = new Set<string>();

    function traverse(obj: any) {
        if (!obj) return;

        if (typeof obj === 'string') {
            if (obj.startsWith('@') && !obj.startsWith('@@')) {
                params.add(obj.substring(1));
            }
            return;
        }

        if (typeof obj === 'object') {
            for (const key in obj) {
                traverse(obj[key]);
            }
        }
    }

    traverse(json);

    return Array.from(params).map(name => ({
        name,
        in: 'query', // Default to query param
        schema: {
            type: 'string' // Default to string
        }
    }));
}
