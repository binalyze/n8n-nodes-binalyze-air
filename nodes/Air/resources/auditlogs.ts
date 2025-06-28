import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	handleExecuteError,
	extractPaginationInfo,
	processApiResponseEntities,
	normalizeAndValidateId,
	catchAndFormatError,
} from '../utils/helpers';
import { api as auditLogsApi } from '../api/auditlogs/auditlogs';
import { findOrganizationByName } from './organizations';

export const AuditLogsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['auditlogs'],
			},
		},
		options: [
			{
				name: 'Export Audit Logs',
				value: 'export',
				description: 'Export audit logs to a file',
				action: 'Export audit logs',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many audit logs',
				action: 'Get many audit logs',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Export Format',
		name: 'exportFormat',
		type: 'options',
		default: 'csv',
		displayOptions: {
			show: {
				resource: ['auditlogs'],
				operation: ['export'],
			},
		},
		options: [
			{
				name: 'CSV',
				value: 'csv',
			},
			{
				name: 'JSON',
				value: 'json',
			},
		],
		required: true,
		description: 'Format for the exported file',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['auditlogs'],
				operation: ['getAll', 'export'],
			},
		},
		options: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'string',
				default: '',
				description: 'Filter audit logs by action',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'End date for filtering audit logs (ISO format)',
			},
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter audit logs by. Use "0" for all organizations.',
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
									errorMessage: 'Not a valid organization ID (must be a positive number or 0 for all organizations)',
								},
							},
						],
						placeholder: 'Enter Organization ID (0 for all organizations)',
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'Enter organization name',
					},
				],
			},
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'Which page of results to return',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						'/operation': ['getAll'],
					},
				},
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 100,
				description: 'How many results to return per page',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						'/operation': ['getAll'],
					},
				},
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'string',
				default: '',
				description: 'Filter audit logs by resource type',
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter audit logs',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Start date for filtering audit logs (ISO format)',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Filter audit logs by user ID',
			},
		],
	},
];

export function extractAuditLogId(auditLog: any): string {
	if (typeof auditLog === 'string') {
		return auditLog;
	}
	return auditLog?._id || '';
}

export function isValidAuditLog(auditLog: any): boolean {
	return auditLog && typeof auditLog === 'object' && auditLog._id;
}

export function buildAuditLogQueryParams(additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	if (additionalFields.organizationId) {
		queryParams['filter[organizationIds]'] = additionalFields.organizationId;
	}
	if (additionalFields.userId) {
		queryParams['filter[userId]'] = additionalFields.userId;
	}
	if (additionalFields.action) {
		queryParams['filter[action]'] = additionalFields.action;
	}
	if (additionalFields.resource) {
		queryParams['filter[resource]'] = additionalFields.resource;
	}
	if (additionalFields.startDate) {
		queryParams['filter[startDate]'] = additionalFields.startDate;
	}
	if (additionalFields.endDate) {
		queryParams['filter[endDate]'] = additionalFields.endDate;
	}
	if (additionalFields.searchTerm) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}
	if (additionalFields.pageNumber) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}
	if (additionalFields.pageSize) {
		queryParams.pageSize = additionalFields.pageSize;
	}

	return queryParams;
}

export async function executeAuditLogs(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	try {
		const credentials = await getAirCredentials(this);

		for (let i = 0; i < items.length; i++) {
			try {
				switch (operation) {
					case 'getAll':
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						// Handle organization resource locator
						let organizationId: string = '0'; // Default to all organizations
						if (additionalFields.organizationId) {
							const organizationResource = additionalFields.organizationId;

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
								organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						}

						// Set organization ID in additional fields for query building
						additionalFields.organizationId = organizationId;
						const queryParams = buildAuditLogQueryParams(additionalFields);

						const getAllResponse = await auditLogsApi.getAuditLogs(this, credentials, queryParams);

						const entities = getAllResponse.result?.entities || [];
						const paginationInfo = extractPaginationInfo(getAllResponse.result);

						// Process entities with pagination info
						processApiResponseEntities(entities, returnData, i, {
							includePagination: true,
							paginationData: paginationInfo,
							excludeFields: ['sortables', 'filters'],
						});
						break;

					case 'export':
						const exportFields = this.getNodeParameter('additionalFields', i) as any;
						const exportFormat = this.getNodeParameter('exportFormat', i) as string;

						// Handle organization resource locator for export
						let exportOrgId: string = '0';
						if (exportFields.organizationId) {
							const organizationResource = exportFields.organizationId;

							if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
								exportOrgId = organizationResource.value;
							} else if (organizationResource.mode === 'name') {
								try {
									exportOrgId = await findOrganizationByName(this, credentials, organizationResource.value);
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
								exportOrgId = normalizeAndValidateId(exportOrgId, 'Organization ID');
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						}

						// Build export request
						const exportRequest: any = {
							format: exportFormat,
							filter: {}
						};

						if (exportOrgId !== '0') {
							exportRequest.filter.organizationIds = [exportOrgId];
						}
						if (exportFields.userId) {
							exportRequest.filter.userId = exportFields.userId;
						}
						if (exportFields.action) {
							exportRequest.filter.action = exportFields.action;
						}
						if (exportFields.resource) {
							exportRequest.filter.resource = exportFields.resource;
						}
						if (exportFields.startDate) {
							exportRequest.filter.startDate = exportFields.startDate;
						}
						if (exportFields.endDate) {
							exportRequest.filter.endDate = exportFields.endDate;
						}
						if (exportFields.searchTerm) {
							exportRequest.filter.searchTerm = exportFields.searchTerm;
						}

						const exportResponse = await auditLogsApi.exportAuditLogs(this, credentials, exportRequest);

						returnData.push({
							json: exportResponse.result,
							pairedItem: { item: i },
						});
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
				}
			} catch (error) {
				handleExecuteError(this, error, i, returnData);
			}
		}

		return [returnData];
	} catch (error) {
		throw catchAndFormatError(error, 'execute audit logs operation');
	}
}
