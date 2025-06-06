import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	validateApiResponse,
	extractEntityId,
	isValidEntity,
	createListSearchResults,
	createLoadOptions,
	handleExecuteError,
	extractSimplifiedPaginationInfo,
	processApiResponseEntitiesWithSimplifiedPagination,
	requireValidId,
	catchAndFormatError,
	processOrganizationEntity,
	processOrganizationEntities,
} from './helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';
import { api as organizationsApi, Organization, CreateOrganizationRequest } from '../api/organizations/organizations';
import { api as organizationUsersApi } from '../api/organizations/users/users';

export const OrganizationsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organizations'],
			},
		},
		options: [
			{
				name: 'Add Tags',
				value: 'addTags',
				description: 'Add tags to an organization',
				action: 'Add tags to an organization',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new organization',
				action: 'Create an organization',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many organizations',
				action: 'Get many organizations',
			},
			{
				name: 'Get Organization',
				value: 'get',
				description: 'Retrieve a specific organization',
				action: 'Get an organization',
			},
			{
				name: 'Get Users',
				value: 'getUsers',
				description: 'Retrieve users assigned to an organization',
				action: 'Get users of an organization',
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				description: 'Remove tags from an organization',
				action: 'Remove tags from an organization',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['get', 'getUsers', 'addTags', 'removeTags'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an organization...',
				typeOptions: {
					searchListMethod: 'getOrganizations',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[a-zA-Z0-9-_]+$',
							errorMessage: 'Not a valid organization ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter organization ID (numeric or GUID)',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization to retrieve',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		placeholder: 'tag1, tag2, tag3',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['addTags', 'removeTags'],
			},
		},
		required: true,
		description: 'Comma-separated list of tags to add or remove',
	},
	{
		displayName: 'Organization Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'Enter organization name',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Name of the organization (1-50 characters)',
		typeOptions: {
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^(?!\\s*$).{1,50}$',
						errorMessage: 'Organization name must be 1-50 characters and cannot be empty or only whitespace',
					},
				},
			],
		},
	},
	{
		displayName: 'Shareable Deployment Enabled',
		name: 'shareableDeploymentEnabled',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Whether shareable deployment is enabled for this organization',
	},
	{
		displayName: 'Contact Name',
		name: 'contactName',
		type: 'string',
		default: '',
		placeholder: 'Enter contact name',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Name of the contact person for this organization',
		typeOptions: {
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^(?!\\s*$).+$',
						errorMessage: 'Contact name cannot be empty or only whitespace',
					},
				},
			],
		},
	},
	{
		displayName: 'Contact Email',
		name: 'contactEmail',
		type: 'string',
		default: '',
		placeholder: 'Enter contact email',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Email address of the contact person',
		typeOptions: {
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
						errorMessage: 'Please enter a valid email address',
					},
				},
			],
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['getAll', 'getUsers', 'create'],
			},
		},
		options: [
			{
				displayName: 'Contact Mobile',
				name: 'contactMobile',
				type: 'string',
				default: '',
				placeholder: 'Enter contact mobile',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
				description: 'Mobile number of the contact person',
			},
			{
				displayName: 'Contact Phone',
				name: 'contactPhone',
				type: 'string',
				default: '',
				placeholder: 'Enter contact phone',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
				description: 'Phone number of the contact person',
			},
			{
				displayName: 'Contact Title',
				name: 'contactTitle',
				type: 'string',
				default: '',
				placeholder: 'Enter contact title',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
				description: 'Title of the contact person',
			},
			{
				displayName: 'Name Filter',
				name: 'nameFilter',
				type: 'string',
				default: '',
				description: 'Filter organizations by exact name match',
				displayOptions: {
					show: {
						'/operation': ['getAll'],
					},
				},
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				placeholder: 'Enter a note about this organization',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
				description: 'Additional notes about the organization',
			},
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'Which page of results to return',
				displayOptions: {
					show: {
						'/operation': ['getAll', 'getUsers'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 10,
				description: 'How many results to return per page',
				displayOptions: {
					show: {
						'/operation': ['getAll', 'getUsers'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search organizations by name (supports partial matches)',
				displayOptions: {
					show: {
						'/operation': ['getAll'],
					},
				},
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'createdAt',
				description: 'Attribute name to order the responses by',
				displayOptions: {
					show: {
						'/operation': ['getAll', 'getUsers'],
					},
				},
				options: [
					{
						name: 'Created At',
						value: 'createdAt',
					},
					{
						name: 'Name',
						value: 'name',
						displayOptions: {
							show: {
								'/operation': ['getAll'],
							},
						},
					},
					{
						name: 'Username',
						value: 'username',
						displayOptions: {
							show: {
								'/operation': ['getUsers'],
							},
						},
					},
				],
			},
			{
				displayName: 'Sort Type',
				name: 'sortType',
				type: 'options',
				default: 'ASC',
				description: 'Sort order',
				displayOptions: {
					show: {
						'/operation': ['getAll', 'getUsers'],
					},
				},
				options: [
					{
						name: 'Ascending',
						value: 'ASC',
					},
					{
						name: 'Descending',
						value: 'DESC',
					},
				],
			},
		],
	},
];

/**
 * Extract organization ID from organization object with comprehensive field checking
 */
export function extractOrganizationId(organization: any): string {
	return extractEntityId(organization, 'organization');
}

/**
 * Validate that an organization has a valid ID and name
 */
export function isValidOrganization(org: any): boolean {
	return isValidEntity(org, ['name']);
}

/**
 * Search for organization by exact name match across all pages using API
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

	try {
		// Use the API to get all organizations with search and pagination support
		const organizations = await organizationsApi.getAllOrganizations(context, credentials, searchName);

		// Look for exact match (case-insensitive)
		const exactMatch = organizations.find((org: Organization) =>
			org.name && org.name.toLowerCase() === searchName.toLowerCase()
		);

		if (!exactMatch) {
			// If no exact match with search term, try getting all organizations and search manually
			const allOrganizations = await organizationsApi.getAllOrganizations(context, credentials);

			const exactMatchInAll = allOrganizations.find((org: Organization) =>
				org.name && org.name.toLowerCase() === searchName.toLowerCase()
			);

			if (exactMatchInAll) {
				return extractOrganizationId(exactMatchInAll);
			}

			// Provide helpful error message with suggestions
			const suggestions = allOrganizations
				.filter((org: Organization) =>
					org.name && org.name.toLowerCase().includes(searchName.toLowerCase())
				)
				.map((org: Organization) => org.name)
				.slice(0, 5);

			let errorMessage = `Organization '${searchName}' not found.`;
			if (suggestions.length > 0) {
				errorMessage += ` Similar organizations: ${suggestions.join(', ')}`;
			}

			throw new Error(errorMessage);
		}

		return extractOrganizationId(exactMatch);
	} catch (error) {
		throw new Error(`Failed to find organization by name: ${error instanceof Error ? error.message : String(error)}`);
	}
}

// List search method for resource locator
export async function getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const allOrganizations = await organizationsApi.getAllOrganizations(this, credentials, filter);

		return createListSearchResults(
			allOrganizations,
			isValidOrganization,
			(organization: Organization) => ({
				name: organization.name,
				value: extractOrganizationId(organization),
				url: organization.deploymentToken || '',
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load organizations');
	}
}

// Load options method for dropdowns (legacy support)
export async function getOrganizationsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const allOrganizations = await organizationsApi.getAllOrganizations(this, credentials);

		return createLoadOptions(
			allOrganizations,
			isValidOrganization,
			(organization: Organization) => {
				const orgId = extractOrganizationId(organization);
				const name = organization.name || `Organization ${orgId || 'Unknown'}`;

				return {
					name,
					value: orgId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load organizations');
	}
}

// Execute function for organizations
export async function executeOrganizations(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'getAll') {
				const response = await organizationsApi.getOrganizations(this, credentials);
				validateApiResponse(response);

				const entities = response.result?.entities || [];
				const paginationInfo = extractSimplifiedPaginationInfo(response.result);

				// Process organizations to add computed properties
				const processedEntities = processOrganizationEntities(entities, credentials.instanceUrl);

				// Process entities with simplified pagination attached to each entity
				processApiResponseEntitiesWithSimplifiedPagination(processedEntities, paginationInfo, returnData, i);

			} else if (operation === 'get') {
				const organizationResource = this.getNodeParameter('organizationId', i) as any;
				let organizationId: string;

				if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'name') {
					try {
						organizationId = await findOrganizationByName(this, credentials, organizationResource.value);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
						itemIndex: i,
					});
				}

				// Validate organization ID
				try {
					organizationId = requireValidId(organizationId, 'Organization ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				const response = await organizationsApi.getOrganizationById(this, credentials, parseInt(organizationId));

				// Custom validation for single entity response
				if (!response.success) {
					const errorMessage = response.errors?.join(', ') || 'API request failed';
					throw new NodeOperationError(this.getNode(), `Failed to get organization: ${errorMessage}`, {
						itemIndex: i,
					});
				}

				if (!response.result) {
					throw new NodeOperationError(this.getNode(), 'Organization not found', {
						itemIndex: i,
					});
				}

				// Process organization to add computed properties
				const processedOrganization = processOrganizationEntity(response.result, credentials.instanceUrl);

				returnData.push({
					json: processedOrganization,
					pairedItem: i,
				});

			} else if (operation === 'getUsers') {
				const organizationResource = this.getNodeParameter('organizationId', i) as any;
				let organizationId: string;

				if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'name') {
					try {
						organizationId = await findOrganizationByName(this, credentials, organizationResource.value);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
						itemIndex: i,
					});
				}

				// Validate organization ID
				try {
					organizationId = requireValidId(organizationId, 'Organization ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				const response = await organizationUsersApi.getOrganizationUsers(this, credentials, parseInt(organizationId));
				validateApiResponse(response);

				const entities = response.result?.entities || [];
				const paginationInfo = extractSimplifiedPaginationInfo(response.result);

				// Process entities with simplified pagination attached to each entity
				processApiResponseEntitiesWithSimplifiedPagination(entities, paginationInfo, returnData, i);

			} else if (operation === 'addTags') {
				const organizationResource = this.getNodeParameter('organizationId', i) as any;
				const tags = this.getNodeParameter('tags', i) as string;

				let organizationId: string;

				if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'name') {
					try {
						organizationId = await findOrganizationByName(this, credentials, organizationResource.value);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
						itemIndex: i,
					});
				}

				// Validate organization ID
				try {
					organizationId = requireValidId(organizationId, 'Organization ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				// Parse and validate tags
				const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
				if (tagList.length === 0) {
					throw new NodeOperationError(this.getNode(), 'At least one tag must be provided', {
						itemIndex: i,
					});
				}

				const response = await organizationsApi.addTagsToOrganization(this, credentials, parseInt(organizationId), tagList);

				// Custom validation for single entity response
				if (!response.success) {
					const errorMessage = response.errors?.join(', ') || 'API request failed';
					throw new NodeOperationError(this.getNode(), `Failed to add tags to organization: ${errorMessage}`, {
						itemIndex: i,
					});
				}

				// Process organization result to add computed properties
				const processedResult = response.result ? processOrganizationEntity(response.result, credentials.instanceUrl) : response.result;

				returnData.push({
					json: processedResult,
					pairedItem: i,
				});

			} else if (operation === 'removeTags') {
				const organizationResource = this.getNodeParameter('organizationId', i) as any;
				const tags = this.getNodeParameter('tags', i) as string;

				let organizationId: string;

				if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'name') {
					try {
						organizationId = await findOrganizationByName(this, credentials, organizationResource.value);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
						itemIndex: i,
					});
				}

				// Validate organization ID
				try {
					organizationId = requireValidId(organizationId, 'Organization ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				// Parse and validate tags
				const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
				if (tagList.length === 0) {
					throw new NodeOperationError(this.getNode(), 'At least one tag must be provided', {
						itemIndex: i,
					});
				}

				const response = await organizationsApi.deleteTagsFromOrganization(this, credentials, parseInt(organizationId), tagList);

				// Custom validation for single entity response
				if (!response.success) {
					const errorMessage = response.errors?.join(', ') || 'API request failed';
					throw new NodeOperationError(this.getNode(), `Failed to remove tags from organization: ${errorMessage}`, {
						itemIndex: i,
					});
				}

				// Process organization result to add computed properties
				const processedResult = response.result ? processOrganizationEntity(response.result, credentials.instanceUrl) : response.result;

				returnData.push({
					json: processedResult,
					pairedItem: i,
				});

			} else if (operation === 'create') {
				const name = this.getNodeParameter('name', i) as string;
				const shareableDeploymentEnabled = this.getNodeParameter('shareableDeploymentEnabled', i) as boolean;
				const contactName = this.getNodeParameter('contactName', i) as string;
				const contactEmail = this.getNodeParameter('contactEmail', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				// Validate required fields
				const trimmedName = name.trim();
				if (!trimmedName) {
					throw new NodeOperationError(this.getNode(), 'Organization name cannot be empty or whitespace', {
						itemIndex: i,
					});
				}

				const trimmedContactName = contactName.trim();
				if (!trimmedContactName) {
					throw new NodeOperationError(this.getNode(), 'Contact name cannot be empty or whitespace', {
						itemIndex: i,
					});
				}

				const trimmedContactEmail = contactEmail.trim();
				if (!trimmedContactEmail) {
					throw new NodeOperationError(this.getNode(), 'Contact email cannot be empty or whitespace', {
						itemIndex: i,
					});
				}

				// Basic email validation
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(trimmedContactEmail)) {
					throw new NodeOperationError(this.getNode(), 'Contact email must be a valid email address', {
						itemIndex: i,
					});
				}

				// Build the request data
				const createData: CreateOrganizationRequest = {
					name: trimmedName,
					shareableDeploymentEnabled,
					contact: {
						name: trimmedContactName,
						title: additionalFields.contactTitle?.trim() || '',
						phone: additionalFields.contactPhone?.trim() || '',
						mobile: additionalFields.contactMobile?.trim() || '',
						email: trimmedContactEmail,
					},
					note: additionalFields.note?.trim() || '',
				};

				const response = await organizationsApi.createOrganization(this, credentials, createData);

				// Custom validation for single entity response
				if (!response.success) {
					const errorMessage = response.errors?.join(', ') || 'API request failed';
					throw new NodeOperationError(this.getNode(), `Failed to create organization: ${errorMessage}`, {
						itemIndex: i,
					});
				}

				// Process organization result to add computed properties
				const processedResult = response.result ? processOrganizationEntity(response.result, credentials.instanceUrl) : response.result;

				returnData.push({
					json: processedResult,
					pairedItem: i,
				});
			}

		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
