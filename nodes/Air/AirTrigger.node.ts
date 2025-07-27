import {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { getAirCredentials, buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from './utils/helpers';

export class AirTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AIR Trigger',
		name: 'airTrigger',
		icon: {
			light: 'file:b-logo-dark.svg',
			dark: 'file:b-logo-light.svg',
		} as const,
		group: ['trigger'],
		version: 1,
		description: 'Trigger workflows based on AIR events',
		defaults: {
			name: 'AIR Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'airApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event Names or IDs',
				name: 'eventTypes',
				type: 'multiOptions',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getEventTypes',
				},
				default: [],
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Bearer Token',
				name: 'bearerToken',
				type: 'string',
				required: true,
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The Bearer token that AIR will send in the Authorization header for webhook authentication',
			},
		],
	};

	methods = {
		loadOptions: {
			async getEventTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const credentials = await getAirCredentials(this);

					const requestOptions = buildRequestOptionsWithErrorHandling(
						credentials,
						'GET',
						'/api/public/event-subscription/event-names'
					);

					const response = await makeApiRequestWithErrorHandling<{
						success: boolean;
						result: string[];
						statusCode: number;
						errors: string[];
					}>(this, requestOptions, 'fetch event types');

					if (!response.success || !Array.isArray(response.result)) {
						throw new NodeOperationError(
							this.getNode(),
							'Failed to fetch event types from AIR'
						);
					}

					return response.result.map((eventName: string) => ({
						name: eventName,
						value: eventName,
						description: eventName,
					}));
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to load event types: ${error instanceof Error ? error.message : String(error)}`
					);
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const selectedEventTypes = this.getNodeParameter('eventTypes', []) as string[];
		const bearerToken = this.getNodeParameter('bearerToken', '') as string;

		// Verify authorization token
		const authHeader = req.headers.authorization as string;

		if (!authHeader) {
			resp.status(401).json({
				success: false,
				error: 'Missing authorization header'
			});
			return {
				noWebhookResponse: true,
			};
		}

		const providedToken = authHeader.replace('Bearer ', '');

		if (providedToken !== bearerToken) {
			resp.status(401).json({
				success: false,
				error: 'Invalid Bearer token'
			});
			return {
				noWebhookResponse: true,
			};
		}

		// Get the webhook data
		const body = this.getBodyData() as IDataObject;

		// Check if the event has the required structure
		if (!body.eventName || typeof body.eventName !== 'string') {
			resp.status(400).json({
				success: false,
				error: 'Invalid event structure: missing eventName'
			});
			return {
				noWebhookResponse: true,
			};
		}

		// Get workflow information
		const workflowId = this.getWorkflow().id;
		const workflowName = this.getWorkflow().name;

		// Filter events based on selected event types
		const eventName = body.eventName as string;
		if (selectedEventTypes.length > 0 && !selectedEventTypes.includes(eventName)) {
			// Event type not selected, ignore it
			resp.status(200).json({
				success: true,
				message: 'Event ignored - not in selected event types',
				workflowId: workflowId,
				workflowName: workflowName
			});
			return {
				noWebhookResponse: true,
			};
		}

		// Send success response
		resp.status(200).json({
			success: true,
			message: 'Event received and processed',
			workflowId: workflowId,
			workflowName: workflowName
		});

		// Return the event data to the workflow
		return {
			workflowData: [
				[
					{
						json: body,
						headers: req.headers as IDataObject,
					},
				],
			],
		};
	}
}
