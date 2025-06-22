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
	createListSearchResults,
	createLoadOptions,
	handleExecuteError,
	extractPaginationInfo,
	processApiResponseEntities,
	requireValidId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
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
				name: 'Assign Users',
				value: 'assignUsers',
				description: 'Assign users to an organization',
				action: 'Assign users to an organization',
			},
			{
				name: 'Check Name Exists',
				value: 'checkNameExists',
				description: 'Check if an organization name already exists',
				action: 'Check if organization name exists',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new organization',
				action: 'Create an organization',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an organization',
				action: 'Delete an organization',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific organization',
				action: 'Get an organization',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many organizations',
				action: 'Get many organizations',
			},
			{
				name: 'Get Shareable Deployment Info',
				value: 'getShareableDeploymentInfo',
				description: 'Get shareable deployment information',
				action: 'Get shareable deployment info',
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
			{
				name: 'Remove User',
				value: 'removeUser',
				description: 'Remove a user from an organization',
				action: 'Remove user from an organization',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an organization',
				action: 'Update an organization',
			},
			{
				name: 'Update Deployment Token',
				value: 'updateDeploymentToken',
				description: 'Update organization deployment token',
				action: 'Update organization deployment token',
			},
			{
				name: 'Update Shareable Deployment',
				value: 'updateShareableDeployment',
				description: 'Update organization shareable deployment status',
				action: 'Update shareable deployment status',
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
				operation: ['get', 'getUsers', 'addTags', 'removeTags', 'delete', 'assignUsers', 'removeUser', 'update', 'updateShareableDeployment', 'updateDeploymentToken'],
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
							regex: '^[0-9]+$',
							errorMessage: 'Not a valid organization ID (must be a positive number or 0 for default organization)',
						},
					},
				],
				placeholder: 'Enter Organization ID (0 for default organization)',
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
		displayName: 'Organization Name to Check',
		name: 'nameToCheck',
		type: 'string',
		default: '',
		placeholder: 'Enter organization name to check',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['checkNameExists'],
			},
		},
		required: true,
		description: 'Name of the organization to check for existence',
	},
	{
		displayName: 'Deployment Token',
		name: 'deploymentToken',
		type: 'string',
		default: '',
		placeholder: 'Enter deployment token',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['getShareableDeploymentInfo', 'updateDeploymentToken'],
			},
		},
		required: true,
		description: 'Deployment token for the organization',
		typeOptions: {
			password: true,
		},
	},
	{
		displayName: 'User IDs',
		name: 'userIds',
		type: 'string',
		default: '',
		placeholder: 'user1, user2, user3',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['assignUsers'],
			},
		},
		required: true,
		description: 'Comma-separated list of user IDs to assign to the organization',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		placeholder: 'Enter user ID',
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['removeUser'],
			},
		},
		required: true,
		description: 'ID of the user to remove from the organization',
	},
	{
		displayName: 'Shareable Deployment Status',
		name: 'shareableDeploymentStatus',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['updateShareableDeployment'],
			},
		},
		required: true,
		description: 'Whether to enable or disable shareable deployment for the organization',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['organizations'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Contact Email',
				name: 'contactEmail',
				type: 'string',
				default: '',
				placeholder: 'Enter contact email',
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
				displayName: 'Contact Mobile',
				name: 'contactMobile',
				type: 'string',
				default: '',
				placeholder: 'Enter contact mobile',
				description: 'Mobile number of the contact person',
			},
			{
				displayName: 'Contact Name',
				name: 'contactName',
				type: 'string',
				default: '',
				placeholder: 'Enter contact name',
				description: 'Name of the contact person for this organization',
			},
			{
				displayName: 'Contact Phone',
				name: 'contactPhone',
				type: 'string',
				default: '',
				placeholder: 'Enter contact phone',
				description: 'Phone number of the contact person',
			},
			{
				displayName: 'Contact Title',
				name: 'contactTitle',
				type: 'string',
				default: '',
				placeholder: 'Enter contact title',
				description: 'Title of the contact person',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				placeholder: 'Enter a note about this organization',
				description: 'Additional notes about the organization',
			},
			{
				displayName: 'Organization Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Enter organization name',
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
				description: 'Whether shareable deployment is enabled for this organization',
			},
		],
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
				description: 'Mobile number of the contact person',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
			},
			{
				displayName: 'Contact Phone',
				name: 'contactPhone',
				type: 'string',
				default: '',
				placeholder: 'Enter contact phone',
				description: 'Phone number of the contact person',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
			},
			{
				displayName: 'Contact Title',
				name: 'contactTitle',
				type: 'string',
				default: '',
				placeholder: 'Enter contact title',
				description: 'Title of the contact person',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
			},
			{
				displayName: 'Filter By Name',
				name: 'name',
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
				description: 'Additional notes about the organization',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
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
				default: 100,
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
		],
	},
];

/**
 * Extract organization ID from organization object with comprehensive field checking
 */
export function extractOrganizationId(organization: any): string {
	// Organizations typically use _id field, so check it first
	// Handle all valid ID cases including 0
	if (organization._id !== undefined && organization._id !== null && organization._id !== '') {
		return String(organization._id);
	}

	// Explicitly handle the edge case where _id is 0 (which is a valid ID but falsy)
	if (organization._id === 0) {
		return '0';
	}

	// Fall back to generic extraction for other possible ID fields
	return extractEntityId(organization, 'organization');
}

/**
 * Validate that an organization has a valid ID and name
 */
export function isValidOrganization(org: any): boolean {
	if (!org) return false;

	try {
		// Check if we can extract a valid ID
		extractOrganizationId(org);
		// For resource locator, we don't strictly require a name since we can show "Organization {id}"
		return true;
	} catch {
		return false;
	}
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

		// Use API with appropriate parameters - show first 50 organizations by default, or use name filter
		const options = filter ? { name: filter, pageSize: 50, pageNumber: 1 } : { pageSize: 50, pageNumber: 1 };
		const response = await organizationsApi.getOrganizations(this, credentials, options);
		const organizations = response.result?.entities || [];

		return createListSearchResults(
			organizations,
			isValidOrganization,
			(organization: Organization) => {
				const orgId = extractOrganizationId(organization);
				const name = organization.name || `Organization ${orgId}`;

				// Ensure ID 0 is properly handled in resource locator
				const resourceValue = orgId === '0' ? '0' : orgId;

				return {
					name: name,
					value: resourceValue,
					url: organization.deploymentToken || '',
				};
			},
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
				const name = organization.name || `Organization ${orgId}`;

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

			switch (operation) {
				case 'getAll': {
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Build options object from additionalFields
					const options: any = {};

					if (additionalFields.pageNumber) {
						options.pageNumber = additionalFields.pageNumber;
					}

					if (additionalFields.pageSize) {
						options.pageSize = additionalFields.pageSize;
					}

					if (additionalFields.searchTerm) {
						options.searchTerm = additionalFields.searchTerm;
					}

					if (additionalFields.name) {
						options.nameFilter = additionalFields.name;
					}

					const response = await organizationsApi.getOrganizations(this, credentials, Object.keys(options).length > 0 ? options : undefined);
					validateApiResponse(response);

					const entities = response.result?.entities || [];
					const paginationInfo = extractPaginationInfo(response.result);

					// Process organizations to add computed properties
					const processedEntities = processOrganizationEntities(entities, credentials.instanceUrl);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntities(processedEntities, returnData, i, {
						includePagination: true,
						paginationData: paginationInfo,
						excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
					});
					break;
				}

				case 'get': {
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
					const enrichedOrganization = enrichOrganizationEntity(response.result, credentials.instanceUrl);

					returnData.push({
						json: enrichedOrganization,
						pairedItem: i,
					});
					break;
				}

				case 'getUsers': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;
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

					// Build options object from additionalFields
					const options: any = {};

					if (additionalFields.pageNumber) {
						options.pageNumber = additionalFields.pageNumber;
					}

					if (additionalFields.pageSize) {
						options.pageSize = additionalFields.pageSize;
					}

					const response = await organizationUsersApi.getOrganizationUsers(this, credentials, parseInt(organizationId), Object.keys(options).length > 0 ? options : undefined);
					validateApiResponse(response);

					const entities = response.result?.entities || [];
					const paginationInfo = extractPaginationInfo(response.result);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntities(entities, returnData, i, {
						includePagination: true,
						paginationData: paginationInfo,
						excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
					});
					break;
				}

				case 'addTags': {
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
					const processedResult = response.result ? enrichOrganizationEntity(response.result, credentials.instanceUrl) : response.result;

					returnData.push({
						json: processedResult,
						pairedItem: i,
					});
					break;
				}

				case 'removeTags': {
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
					const processedResult = response.result ? enrichOrganizationEntity(response.result, credentials.instanceUrl) : response.result;

					returnData.push({
						json: processedResult,
						pairedItem: i,
					});
					break;
				}

				case 'create': {
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
					const processedResult = response.result ? enrichOrganizationEntity(response.result, credentials.instanceUrl) : response.result;

					returnData.push({
						json: processedResult,
						pairedItem: i,
					});
					break;
				}

				case 'checkNameExists': {
					const nameToCheck = this.getNodeParameter('nameToCheck', i) as string;

					const trimmedName = nameToCheck.trim();
					if (!trimmedName) {
						throw new NodeOperationError(this.getNode(), 'Organization name cannot be empty', {
							itemIndex: i,
						});
					}

					const response = await organizationsApi.checkOrganizationNameExists(this, credentials, trimmedName);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to check organization name: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							name: trimmedName,
							exists: response.result,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'delete': {
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

					try {
						organizationId = requireValidId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await organizationsApi.deleteOrganization(this, credentials, parseInt(organizationId));

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to delete organization: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							organizationId: parseInt(organizationId),
							deleted: true,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'update': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const updateFields = this.getNodeParameter('updateFields', i) as any;

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

					try {
						organizationId = requireValidId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Build update data based on provided fields
					const updateData: Partial<CreateOrganizationRequest> = {};

					if (updateFields.name) {
						updateData.name = updateFields.name.trim();
					}

					if (updateFields.shareableDeploymentEnabled !== undefined) {
						updateData.shareableDeploymentEnabled = updateFields.shareableDeploymentEnabled;
					}

					if (updateFields.note) {
						updateData.note = updateFields.note.trim();
					}

					// Handle contact updates
					if (updateFields.contactName || updateFields.contactEmail || updateFields.contactTitle || updateFields.contactPhone || updateFields.contactMobile) {
						updateData.contact = {
							name: updateFields.contactName?.trim() || '',
							email: updateFields.contactEmail?.trim() || '',
						};

						if (updateFields.contactName) {
							updateData.contact.name = updateFields.contactName.trim();
						}

						if (updateFields.contactEmail) {
							updateData.contact.email = updateFields.contactEmail.trim();
							// Validate email format
							const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
							if (!emailRegex.test(updateData.contact.email)) {
								throw new NodeOperationError(this.getNode(), 'Contact email must be a valid email address', {
									itemIndex: i,
								});
							}
						}

						if (updateFields.contactTitle) {
							updateData.contact.title = updateFields.contactTitle.trim();
						}

						if (updateFields.contactPhone) {
							updateData.contact.phone = updateFields.contactPhone.trim();
						}

						if (updateFields.contactMobile) {
							updateData.contact.mobile = updateFields.contactMobile.trim();
						}
					}

					if (Object.keys(updateData).length === 0) {
						throw new NodeOperationError(this.getNode(), 'At least one field must be provided for update', {
							itemIndex: i,
						});
					}

					const response = await organizationsApi.updateOrganization(this, credentials, parseInt(organizationId), updateData);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to update organization: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					const processedResult = response.result ? enrichOrganizationEntity(response.result, credentials.instanceUrl) : response.result;

					returnData.push({
						json: processedResult,
						pairedItem: i,
					});
					break;
				}

				case 'getShareableDeploymentInfo': {
					const deploymentToken = this.getNodeParameter('deploymentToken', i) as string;

					const trimmedToken = deploymentToken.trim();
					if (!trimmedToken) {
						throw new NodeOperationError(this.getNode(), 'Deployment token cannot be empty', {
							itemIndex: i,
						});
					}

					const response = await organizationsApi.getShareableDeploymentInfo(this, credentials, trimmedToken);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to get shareable deployment info: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: response.result,
						pairedItem: i,
					});
					break;
				}

				case 'updateShareableDeployment': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const shareableDeploymentStatus = this.getNodeParameter('shareableDeploymentStatus', i) as boolean;

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

					try {
						organizationId = requireValidId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await organizationsApi.updateOrganizationShareableDeployment(this, credentials, parseInt(organizationId), shareableDeploymentStatus);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to update shareable deployment: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							organizationId: parseInt(organizationId),
							shareableDeploymentEnabled: shareableDeploymentStatus,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'updateDeploymentToken': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const deploymentToken = this.getNodeParameter('deploymentToken', i) as string;

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

					try {
						organizationId = requireValidId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const trimmedToken = deploymentToken.trim();
					if (!trimmedToken) {
						throw new NodeOperationError(this.getNode(), 'Deployment token cannot be empty', {
							itemIndex: i,
						});
					}

					const response = await organizationsApi.updateOrganizationDeploymentToken(this, credentials, parseInt(organizationId), trimmedToken);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to update deployment token: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							organizationId: parseInt(organizationId),
							deploymentToken: trimmedToken,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'assignUsers': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const userIds = this.getNodeParameter('userIds', i) as string;

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

					try {
						organizationId = requireValidId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Parse and validate user IDs
					const userIdList = userIds.split(',').map(userId => userId.trim()).filter(userId => userId.length > 0);
					if (userIdList.length === 0) {
						throw new NodeOperationError(this.getNode(), 'At least one user ID must be provided', {
							itemIndex: i,
						});
					}

					const response = await organizationUsersApi.assignUsersToOrganization(this, credentials, parseInt(organizationId), userIdList);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to assign users to organization: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							organizationId: parseInt(organizationId),
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'removeUser': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const userId = this.getNodeParameter('userId', i) as string;

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

					try {
						organizationId = requireValidId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const trimmedUserId = userId.trim();
					if (!trimmedUserId) {
						throw new NodeOperationError(this.getNode(), 'User ID cannot be empty', {
							itemIndex: i,
						});
					}

					const response = await organizationUsersApi.removeUserFromOrganization(this, credentials, parseInt(organizationId), trimmedUserId);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to remove user from organization: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							organizationId: parseInt(organizationId),
							removedUserId: trimmedUserId,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				default: {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
						itemIndex: i,
					});
				}
			}

		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}

/**
 * Platform enum for deployment packages
 */
enum Platform {
	Windows = 'windows',
	Linux = 'linux',
	Darwin = 'darwin',
}

/**
 * Package extension enum for deployment packages
 */
enum PackageExtension {
	msi = 'msi', // Only available for windows platform
	deb = 'deb', // Only available for linux platform
	rpm = 'rpm', // Only available for linux platform
	pkg = 'pkg', // Only available for darwin platform (macOS)
}

/**
 * Architecture enum for deployment packages
 */
enum Architecture {
	i386 = '386', // Only available for windows and linux. Not supported for darwin (macOS)
	amd64 = 'amd64',
	arm64 = 'arm64',
}

/**
 * Generate deployment package download links for an organization
 */
function generateDeploymentPackages(
	organizationId: string,
	deploymentToken: string,
	instanceUrl: string
): any {
	// Generate a random value for ckey parameter
	const generateRandomKey = () => Math.random().toString(36).substring(2, 15);

	const baseUrl = `${instanceUrl}/api/endpoints/download/${organizationId}`;

	const deploymentPackages: any = {};

	// Helper function to convert architecture ID to user-friendly name
	const getArchLabel = (arch: string): string => {
		switch (arch) {
			case Architecture.i386:
				return '32bit';
			case Architecture.amd64:
				return '64bit';
			case Architecture.arm64:
				return 'arm64';
			default:
				return arch;
		}
	};

	// Windows platform (supports i386, amd64 with msi)
	[Architecture.i386, Architecture.amd64].forEach(arch => {
		const archLabel = getArchLabel(arch);
		const key = `windows-${archLabel}-msi`;
		deploymentPackages[key] = `${baseUrl}/${Platform.Windows}/${PackageExtension.msi}/${arch}?deployment-token=${deploymentToken}&ckey=${generateRandomKey()}`;
	});

	// Linux platform (supports i386, amd64, arm64 with deb and rpm)
	[Architecture.i386, Architecture.amd64, Architecture.arm64].forEach(arch => {
		const archLabel = getArchLabel(arch);

		// DEB package
		const debKey = `linux-${archLabel}-deb`;
		deploymentPackages[debKey] = `${baseUrl}/${Platform.Linux}/${PackageExtension.deb}/${arch}?deployment-token=${deploymentToken}&ckey=${generateRandomKey()}`;

		// RPM package
		const rpmKey = `linux-${archLabel}-rpm`;
		deploymentPackages[rpmKey] = `${baseUrl}/${Platform.Linux}/${PackageExtension.rpm}/${arch}?deployment-token=${deploymentToken}&ckey=${generateRandomKey()}`;
	});

	// Darwin platform (supports amd64, arm64 with pkg - no i386 support)
	[Architecture.amd64, Architecture.arm64].forEach(arch => {
		const archLabel = getArchLabel(arch);
		const key = `macos-${archLabel}-pkg`;
		deploymentPackages[key] = `${baseUrl}/${Platform.Darwin}/${PackageExtension.pkg}/${arch}?deployment-token=${deploymentToken}&ckey=${generateRandomKey()}`;
	});

	return deploymentPackages;
}

/**
 * Process organization entity to add computed shareableDeploymentPage and deploymentPackages properties
 */
function enrichOrganizationEntity(organization: any, instanceUrl: string): any {
	const processedOrg = { ...organization };

	// Add shareableDeploymentPage property based on shareableDeploymentEnabled and deploymentToken
	if (organization.shareableDeploymentEnabled && organization.deploymentToken) {
		processedOrg.shareableDeploymentPage = `${instanceUrl}/#/shareable-deploy?token=${organization.deploymentToken}`;
	} else {
		processedOrg.shareableDeploymentPage = '';
	}

	// Add deploymentPackages property with download links for all platforms and architectures
	if (organization.deploymentToken) {
		try {
			const organizationId = extractEntityId(organization, 'organization');
			processedOrg.deploymentPackages = generateDeploymentPackages(
				organizationId,
				organization.deploymentToken,
				instanceUrl
			);
		} catch (error) {
			// If we can't extract organization ID, set deploymentPackages to empty object
			processedOrg.deploymentPackages = {};
		}
	} else {
		processedOrg.deploymentPackages = {};
	}

	return processedOrg;
}

/**
 * Process multiple organization entities to add computed properties
 */
function processOrganizationEntities(organizations: any[], instanceUrl: string): any[] {
	return organizations.map(org => enrichOrganizationEntity(org, instanceUrl));
}
