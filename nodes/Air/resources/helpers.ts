import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
	INodePropertyOptions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';

export interface PaginationInfo {
	pageNumber: number;
	totalPages: number;
}

export interface ApiResponse {
	success: boolean;
	result?: {
		entities?: any[];
		pagination?: PaginationInfo;
	};
	errors?: string[];
}

/**
 * Get and validate AIR credentials
 */
export async function getAirCredentials(
	context: IExecuteFunctions | ILoadOptionsFunctions
): Promise<AirCredentials> {
	const credentials = await context.getCredentials('airCredentialsApi');

	if (!credentials) {
		throw new Error('No credentials provided for Binalyze AIR');
	}

	const instanceUrl = credentials.instanceUrl as string;
	const token = credentials.token as string;

	if (!instanceUrl || !token) {
		throw new Error('Missing instanceUrl or token in Binalyze AIR credentials');
	}

	// Normalize instanceUrl by removing trailing slashes
	const normalizedInstanceUrl = instanceUrl.replace(/\/+$/, '');

	return {
		instanceUrl: normalizedInstanceUrl,
		token,
	};
}

/**
 * Build standard HTTP request options for AIR API
 */
export function buildRequestOptions(
	credentials: AirCredentials,
	method: IHttpRequestMethods,
	endpoint: string,
	queryParams?: Record<string, string | number>
): IHttpRequestOptions {
	let url = `${credentials.instanceUrl}${endpoint}`;

	if (queryParams && Object.keys(queryParams).length > 0) {
		const queryString = Object.entries(queryParams)
			.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
			.join('&');
		url += `?${queryString}`;
	}

	return {
		method,
		url,
		headers: {
			'Authorization': `Bearer ${credentials.token}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		json: true,
	};
}

/**
 * Handle API response and throw appropriate errors
 */
export function validateApiResponse(responseData: ApiResponse, context?: string): void {
	if (!responseData.success) {
		const errorMessage = responseData.errors?.join(', ') || 'API request failed';
		const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
		throw new Error(fullMessage);
	}
}

/**
 * Generic function to extract entity ID from entity object with comprehensive field checking
 */
export function extractEntityId(entity: any, entityType: string = 'entity'): string {
	const entityId = entity._id ?? entity.id ?? entity[`${entityType}Id`] ?? entity.Id;

	if (entityId === undefined || entityId === null || entityId === '' || entityId === 0) {
		throw new Error(
			`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} has no valid ID. ID value: ${entityId}, ID type: ${typeof entityId}. ` +
			`Available fields: ${Object.keys(entity).join(', ')}`
		);
	}

	return String(entityId);
}

/**
 * Generic function to validate that an entity has a valid ID and required fields
 */
export function isValidEntity(entity: any, requiredFields: string[] = ['name']): boolean {
	if (!entity) return false;

	try {
		extractEntityId(entity);
		return requiredFields.every(field => !!entity[field]);
	} catch {
		return false;
	}
}

/**
 * Generic function to create list search results for n8n resource locators
 */
export function createListSearchResults(
	entities: any[],
	validationFn: (entity: any) => boolean,
	mapFn: (entity: any) => INodeListSearchItems,
	filter?: string
): INodeListSearchResult {
	const results: INodeListSearchItems[] = entities
		.filter(validationFn)
		.map(mapFn)
		// Apply client-side filtering for better search results
		.filter((item: any) =>
			!filter ||
			item.name.toLowerCase().includes(filter.toLowerCase()) ||
			item.value === filter
		)
		.sort((a: any, b: any) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	return { results };
}

/**
 * Generic function to create load options for n8n dropdowns
 */
export function createLoadOptions(
	entities: any[],
	validationFn: (entity: any) => boolean,
	mapFn: (entity: any) => INodePropertyOptions
): INodePropertyOptions[] {
	return entities
		.filter(validationFn)
		.map(mapFn);
}

/**
 * Generic function to handle execute operation errors with consistent error handling
 */
export function handleExecuteError(
	context: IExecuteFunctions,
	error: any,
	itemIndex: number,
	returnData: INodeExecutionData[]
): void {
	if (context.continueOnFail()) {
		returnData.push({
			json: {
				error: error instanceof Error ? error.message : 'Unknown error occurred',
				errorDetails: error instanceof NodeOperationError ? {
					type: 'NodeOperationError',
					cause: error.cause,
				} : undefined,
			},
			pairedItem: itemIndex,
		});
	} else {
		throw error instanceof NodeOperationError ? error : new NodeOperationError(context.getNode(), error as Error, {
			itemIndex,
		});
	}
}

/**
 * Generic function to process API response entities with pagination
 */
export function processApiResponseEntities(
	entities: any[],
	pagination: any,
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	entities.forEach((entity: any) => {
		returnData.push({
			json: {
				...entity,
				...(pagination && { _pagination: pagination }),
			},
			pairedItem: itemIndex,
		});
	});
}

/**
 * Process API response entities without adding pagination to each entity
 * This is the preferred method for most cases where pagination shouldn't pollute individual entities
 */
export function processApiResponseEntitiesClean(
	entities: any[],
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	entities.forEach((entity: any) => {
		returnData.push({
			json: entity,
			pairedItem: itemIndex,
		});
	});
}

/**
 * Create a single pagination info item that can be added to the response
 * This allows pagination information to be available without attaching it to each entity
 */
export function createPaginationInfoItem(
	paginationData: any,
	itemIndex: number
): INodeExecutionData {
	return {
		json: {
			_paginationInfo: {
				...paginationData,
				_meta: {
					type: 'pagination',
					description: 'Pagination information for this request'
				}
			}
		},
		pairedItem: itemIndex,
	};
}

/**
 * Generic function to catch and format errors for load/search functions
 */
export function catchAndFormatError(error: any, operation: string): Error {
	const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
	return new Error(`Failed to ${operation}: ${errorMessage}`);
}
