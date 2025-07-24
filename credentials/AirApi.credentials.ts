import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export interface AirCredentials {
	instanceUrl: string;
	token: string;
}

export class AirApi implements ICredentialType {
	name = 'airApi';
	displayName = 'Binalyze AIR API';
	documentationUrl = 'https://github.com/binalyze/n8n-nodes-binalyze-air?tab=readme-ov-file#configuration';
	icon = {
		light: 'file:b-logo-dark.svg',
		dark: 'file:b-logo-light.svg',
	} as const;
	properties: INodeProperties[] = [
		{
			displayName: 'AIR Instance URL',
			name: 'instanceUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'The URL of the AIR instance that you want to connect to. Example: https://my-air.binalyze.io.',
			validateType: 'url',
		},
		{
			displayName: 'AIR API Token',
			name: 'token',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
			placeholder: '',
			description: 'The API token of the AIR instance that you want to connect to. You can create it from Integrations / API Tokens. Example: api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
			validateType: 'string',
		},
	];

	// This allows the credential to be used by other parts of n8n
	// stating how this credential is injected as part of the request
	// An example is the Http Request node that can make generic calls
	// reusing this credential
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.token}}',
			},
		},
	};

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.instanceUrl.trimEnd("/")}}',
			url: '/api/public/auth/check',
		},
	};
}
