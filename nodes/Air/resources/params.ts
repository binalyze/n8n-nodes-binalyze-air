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
	extractEntityId,
	isValidEntity,
	createListSearchResults,
	createLoadOptions,
	handleExecuteError,
	processApiResponseEntities,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { api as paramsApi } from '../api/params/params';

export const ParamsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['params'],
			},
		},
		options: [
			{
				name: 'Get Acquisition Artifacts List',
				value: 'getArtifacts',
				action: 'Get acquisition artifacts list',
			},
			{
				name: 'Get Acquisition Evidence List',
				value: 'getEvidence',
				action: 'Get acquisition evidence list',
			},
			{
				name: 'Get DRONE Analyzers List',
				value: 'getAnalyzers',
				action: 'Get drone analyzers list',
			},
			{
				name: 'Get E-Discovery Patterns List',
				value: 'getEDiscovery',
				action: 'Get ediscovery patterns list',
			},
			{
				name: 'Get MITRE ATT&CK Techniques List',
				value: 'getMitre',
				action: 'Get MITRE ATT&CK techniques list',
			},
		],
		default: 'getAnalyzers',
	},
];

// ===== UTILITY FUNCTIONS =====

export function extractDroneAnalyzerId(analyzer: any): string {
	return extractEntityId(analyzer, 'drone analyzer');
}

export function isValidDroneAnalyzer(analyzer: any): boolean {
	return isValidEntity(analyzer, ['name']);
}

export function extractAcquisitionArtifactId(artifact: any): string {
	return extractEntityId(artifact, 'acquisition artifact');
}

export function isValidAcquisitionArtifact(artifact: any): boolean {
	return isValidEntity(artifact, ['name']);
}

export function extractAcquisitionEvidenceId(evidence: any): string {
	return extractEntityId(evidence, 'acquisition evidence');
}

export function isValidAcquisitionEvidence(evidence: any): boolean {
	return isValidEntity(evidence, ['name']);
}

export function extractEDiscoveryPatternId(pattern: any): string {
	return extractEntityId(pattern, 'e-discovery pattern');
}

export function isValidEDiscoveryPattern(pattern: any): boolean {
	return isValidEntity(pattern, ['name']);
}

export function extractMitreAttackTechniqueId(technique: any): string {
	return extractEntityId(technique, 'MITRE ATT&CK technique');
}

export function isValidMitreAttackTechnique(technique: any): boolean {
	return isValidEntity(technique, ['name', 'techniqueId']);
}

// ===== FETCH FUNCTIONS =====

export async function fetchAllDroneAnalyzers(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string
): Promise<any[]> {
	try {
		const responseData = await paramsApi.getDroneAnalyzers(context, credentials);
		return responseData.result || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetch drone analyzers');
	}
}

export async function fetchAllAcquisitionArtifacts(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string
): Promise<any[]> {
	try {
		const responseData = await paramsApi.getAcquisitionArtifacts(context, credentials);
		return responseData.result || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetch acquisition artifacts');
	}
}

export async function fetchAllAcquisitionEvidence(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string
): Promise<any[]> {
	try {
		const responseData = await paramsApi.getAcquisitionEvidence(context, credentials);
		return responseData.result || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetch acquisition evidence');
	}
}

export async function fetchAllEDiscoveryPatterns(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string
): Promise<any[]> {
	try {
		const responseData = await paramsApi.getEDiscoveryPatterns(context, credentials);
		return responseData.result || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetch e-discovery patterns');
	}
}

export async function fetchAllMitreAttackTechniques(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string
): Promise<any[]> {
	try {
		const responseData = await paramsApi.getMitreAttackTechniques(context, credentials);
		return responseData.result || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetch MITRE ATT&CK techniques');
	}
}

// ===== LOAD OPTIONS FUNCTIONS =====

export async function getDroneAnalyzers(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllDroneAnalyzers(this, credentials, searchTerm);

		return createListSearchResults(
			entities,
			isValidDroneAnalyzer,
			entity => ({
				name: entity.name,
				value: extractDroneAnalyzerId(entity),
				url: `/api/public/params/analyzers`,
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load drone analyzers');
	}
}

export async function getAcquisitionArtifacts(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllAcquisitionArtifacts(this, credentials, searchTerm);

		return createListSearchResults(
			entities,
			isValidAcquisitionArtifact,
			entity => ({
				name: entity.name,
				value: extractAcquisitionArtifactId(entity),
				url: `/api/public/params/artifacts`,
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load acquisition artifacts');
	}
}

export async function getAcquisitionEvidence(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllAcquisitionEvidence(this, credentials, searchTerm);

		return createListSearchResults(
			entities,
			isValidAcquisitionEvidence,
			entity => ({
				name: entity.name,
				value: extractAcquisitionEvidenceId(entity),
				url: `/api/public/params/evidence`,
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load acquisition evidence');
	}
}

export async function getEDiscoveryPatterns(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllEDiscoveryPatterns(this, credentials, searchTerm);

		return createListSearchResults(
			entities,
			isValidEDiscoveryPattern,
			entity => ({
				name: entity.name,
				value: extractEDiscoveryPatternId(entity),
				url: `/api/public/params/ediscovery`,
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load e-discovery patterns');
	}
}

export async function getMitreAttackTechniques(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllMitreAttackTechniques(this, credentials, searchTerm);

		return createListSearchResults(
			entities,
			isValidMitreAttackTechnique,
			entity => ({
				name: `${entity.techniqueId} - ${entity.name}`,
				value: extractMitreAttackTechniqueId(entity),
				url: `/api/public/params/mitre`,
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load MITRE ATT&CK techniques');
	}
}

// ===== LOAD OPTIONS FOR DROPDOWNS =====

export async function getDroneAnalyzersOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllDroneAnalyzers(this, credentials);

		return createLoadOptions(
			entities,
			isValidDroneAnalyzer,
			entity => ({
				name: entity.name,
				value: extractDroneAnalyzerId(entity),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load drone analyzers options');
	}
}

export async function getAcquisitionArtifactsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllAcquisitionArtifacts(this, credentials);

		return createLoadOptions(
			entities,
			isValidAcquisitionArtifact,
			entity => ({
				name: entity.name,
				value: extractAcquisitionArtifactId(entity),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load acquisition artifacts options');
	}
}

export async function getAcquisitionEvidenceOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllAcquisitionEvidence(this, credentials);

		return createLoadOptions(
			entities,
			isValidAcquisitionEvidence,
			entity => ({
				name: entity.name,
				value: extractAcquisitionEvidenceId(entity),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load acquisition evidence options');
	}
}

export async function getEDiscoveryPatternsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllEDiscoveryPatterns(this, credentials);

		return createLoadOptions(
			entities,
			isValidEDiscoveryPattern,
			entity => ({
				name: entity.name,
				value: extractEDiscoveryPatternId(entity),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load e-discovery patterns options');
	}
}

export async function getMitreAttackTechniquesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const entities = await fetchAllMitreAttackTechniques(this, credentials);

		return createLoadOptions(
			entities,
			isValidMitreAttackTechnique,
			entity => ({
				name: `${entity.techniqueId} - ${entity.name}`,
				value: extractMitreAttackTechniqueId(entity),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load MITRE ATT&CK techniques options');
	}
}

// ===== EXECUTE FUNCTION =====

export async function executeParams(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			switch (operation) {
				case 'getAnalyzers': {
					const responseData = await paramsApi.getDroneAnalyzers(this, credentials);
					const entities = responseData.result || [];

					// Process entities
					processApiResponseEntities(entities, returnData, i);
					break;
				}

				case 'getArtifacts': {
					const responseData = await paramsApi.getAcquisitionArtifacts(this, credentials);
					const entities = responseData.result || [];

					// Process entities
					processApiResponseEntities(entities, returnData, i);
					break;
				}

				case 'getEvidence': {
					const responseData = await paramsApi.getAcquisitionEvidence(this, credentials);
					const entities = responseData.result || [];

					// Process entities
					processApiResponseEntities(entities, returnData, i);
					break;
				}

				case 'getEDiscovery': {
					const responseData = await paramsApi.getEDiscoveryPatterns(this, credentials);
					const entities = responseData.result || [];

					// Process entities
					processApiResponseEntities(entities, returnData, i);
					break;
				}

				case 'getMitre': {
					const responseData = await paramsApi.getMitreAttackTechniques(this, credentials);
					const entities = responseData.result || [];

					// Process entities
					processApiResponseEntities(entities, returnData, i);
					break;
				}

				default:
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
			}
		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
