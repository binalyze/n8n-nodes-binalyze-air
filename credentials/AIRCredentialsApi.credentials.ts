import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AIRCredentialsApi implements ICredentialType {
	name = 'airCredentialsApi';
	displayName = 'Binalyze AIR Credentials API';
	documentationUrl = 'https://kb.binalyze.com'; //TODO: Add KB url once available
	icon = {
		light: 'file:air-logo-text-black.svg',
		dark: 'file:air-logo-text-white.svg',
	} as const;
	properties: INodeProperties[] = [
		{
			displayName: 'AIR Instance URL',
			name: 'instanceUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'The URL of the AIR instance that you want to connect to. Example: https://air-demo.binalyze.com.',
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
			description: 'The API token of the AIR instance that you want to connect to. You can create it from Integrations / API Tokens. Example: api_52b3d27fe33ddbc85890cfebda413a8d.',
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
			baseURL: '={{$credentials?.instanceUrl}}',
			// TODO: Add a test endpoint that only checks if the API Token is valid. Acquisition Profiles is an overkill.
			url: '/api/public/acquisitions/profiles?filter[organizationIds]=0',
		},
	};
}
