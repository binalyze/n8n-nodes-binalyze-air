import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';

export interface AirCredentials {
	instanceUrl: string;
	token: string;
}

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
 * Extract organization ID from organization object with comprehensive field checking
 */
export function extractOrganizationId(organization: any): string {
	const orgId = organization._id ?? organization.id ?? organization.organizationId ?? organization.Id;

	if (orgId === undefined || orgId === null || orgId === '' || orgId === 0) {
		throw new Error(
			`Organization has no valid ID. ID value: ${orgId}, ID type: ${typeof orgId}. ` +
			`Available fields: ${Object.keys(organization).join(', ')}`
		);
	}

	return String(orgId);
}

/**
 * Validate that an organization has a valid ID and name
 */
export function isValidOrganization(org: any): boolean {
	if (!org) return false;

	try {
		extractOrganizationId(org);
		return !!org.name;
	} catch {
		return false;
	}
}

/**
 * Fetch all organizations across multiple pages
 */
export async function fetchAllOrganizations(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	const allOrganizations: any[] = [];
	let currentPage = 1;
	let hasMorePages = true;

	while (hasMorePages) {
		const queryParams: Record<string, string | number> = {
			pageNumber: currentPage,
			pageSize,
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const options = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/organizations',
			queryParams
		);

		const responseData = await context.helpers.httpRequest(options);
		validateApiResponse(responseData, 'Failed to fetch organizations');

		const organizations = responseData.result?.entities || [];
		allOrganizations.push(...organizations);

		// Check if there are more pages
		const pagination = responseData.result?.pagination;
		if (pagination && pagination.pageNumber < pagination.totalPages) {
			currentPage++;
		} else {
			hasMorePages = false;
		}
	}

	return allOrganizations;
}

/**
 * Search for organization by exact name match across all pages
 */
export async function findOrganizationByName(
	context: IExecuteFunctions,
	credentials: AirCredentials,
	organizationName: string
): Promise<string> {
	const searchName = organizationName.trim();

	if (!searchName) {
		throw new Error('Organization name cannot be empty');
	}

	let currentPage = 1;
	let foundMatch = false;
	let organizationId: string | undefined;

	// Search through all pages until we find a match
	while (!foundMatch) {
		const queryParams = {
			pageNumber: currentPage,
			pageSize: 100,
			'filter[searchTerm]': searchName,
		};

		const options = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/organizations',
			queryParams
		);

		const searchResponse = await context.helpers.httpRequest(options);
		validateApiResponse(searchResponse, 'Failed to search for organization');

		const organizations = searchResponse.result?.entities || [];

		if (organizations.length === 0) {
			break; // No more results
		}

		// Look for exact match (case-insensitive)
		const exactMatch = organizations.find((org: any) =>
			org.name && org.name.toLowerCase() === searchName.toLowerCase()
		);

		if (exactMatch) {
			foundMatch = true;
			organizationId = extractOrganizationId(exactMatch);
			break;
		}

		// Check if there are more pages
		const pagination = searchResponse.result?.pagination;
		if (pagination && pagination.pageNumber < pagination.totalPages) {
			currentPage++;
		} else {
			break; // No more pages
		}
	}

	if (!foundMatch) {
		// Provide helpful error message with suggestions
		const suggestionOptions = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/organizations',
			{
				pageNumber: 1,
				pageSize: 10,
				'filter[searchTerm]': searchName,
			}
		);

		const suggestionResponse = await context.helpers.httpRequest(suggestionOptions);
		const suggestions = suggestionResponse.success && suggestionResponse.result?.entities
			? suggestionResponse.result.entities.map((org: any) => org.name).slice(0, 5)
			: [];

		let errorMessage = `Organization '${searchName}' not found.`;
		if (suggestions.length > 0) {
			errorMessage += ` Similar organizations: ${suggestions.join(', ')}`;
		}

		throw new Error(errorMessage);
	}

	return organizationId!;
}

/**
 * Build query parameters for organization list operations
 */
export function buildOrganizationQueryParams(additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	if (additionalFields.nameFilter) {
		queryParams['filter[name]'] = additionalFields.nameFilter;
	}
	if (additionalFields.pageNumber) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}
	if (additionalFields.pageSize) {
		queryParams.pageSize = additionalFields.pageSize;
	}
	if (additionalFields.searchTerm) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}
	if (additionalFields.sortBy) {
		queryParams.sortBy = additionalFields.sortBy;
	}
	if (additionalFields.sortType) {
		queryParams.sortType = additionalFields.sortType;
	}

	return queryParams;
}
