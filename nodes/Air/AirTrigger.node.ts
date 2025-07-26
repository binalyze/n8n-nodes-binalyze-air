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
				displayName: 'Event Types Names or IDs',
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
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Verify Authorization Token',
						name: 'verifyToken',
						type: 'boolean',
						default: true,
						description: 'Whether to verify the authorization token sent by AIR',
					},
					{
						displayName: 'Expected Token',
						name: 'expectedToken',
						type: 'string',
						typeOptions: {
							password: true,
						},
						default: '',
						description: 'The expected Bearer token that AIR will send in the Authorization header',
						displayOptions: {
							show: {
								verifyToken: [true],
							},
						},
					},
				],
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
		const options = this.getNodeParameter('options', {}) as IDataObject;

		// Verify authorization token if enabled
		if (options.verifyToken === true) {
			const authHeader = req.headers.authorization as string;
			const expectedToken = options.expectedToken as string;

			if (!authHeader) {
				resp.status(401).json({ error: 'Missing authorization header' });
				return {
					noWebhookResponse: true,
				};
			}

			const providedToken = authHeader.replace('Bearer ', '');
			if (providedToken !== expectedToken) {
				resp.status(401).json({ error: 'Invalid authorization token' });
				return {
					noWebhookResponse: true,
				};
			}
		}

		// Get the webhook data
		const body = this.getBodyData() as IDataObject;

		// Check if the event has the required structure
		if (!body.eventName || typeof body.eventName !== 'string') {
			resp.status(400).json({ error: 'Invalid event structure: missing eventName' });
			return {
				noWebhookResponse: true,
			};
		}

		// Filter events based on selected event types
		const eventName = body.eventName as string;
		if (selectedEventTypes.length > 0 && !selectedEventTypes.includes(eventName)) {
			// Event type not selected, ignore it
			resp.status(200).json({ message: 'Event ignored' });
			return {
				noWebhookResponse: true,
			};
		}

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
