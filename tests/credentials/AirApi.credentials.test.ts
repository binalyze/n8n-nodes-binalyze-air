import { AirApi } from '../../credentials/AirApi.credentials';

describe('AirApi Credentials', () => {
  let credentials: AirApi;

  beforeEach(() => {
    credentials = new AirApi();
  });

  it('should have correct name and display name', () => {
    expect(credentials.name).toBe('airApi');
    expect(credentials.displayName).toBe('AIR API');
  });

  it('should have correct documentation URL', () => {
    expect(credentials.documentationUrl).toBe('https://github.com/binalyze/n8n-nodes-binalyze-air?tab=readme-ov-file#configuration');
  });

  it('should have icon defined', () => {
    expect(credentials.icon).toBeDefined();
    expect(credentials.icon).toEqual({
      light: 'file:b-logo-dark.svg',
      dark: 'file:b-logo-light.svg'
    });
  });

  it('should have correct properties structure', () => {
    expect(credentials.properties).toHaveLength(2);
    
    const instanceUrlProp = credentials.properties.find(p => p.name === 'instanceUrl');
    const tokenProp = credentials.properties.find(p => p.name === 'token');

    expect(instanceUrlProp).toBeDefined();
    expect(tokenProp).toBeDefined();

    expect(instanceUrlProp!.type).toBe('string');
    expect(instanceUrlProp!.required).toBe(true);
    
    expect(tokenProp!.type).toBe('string');
    expect(tokenProp!.required).toBe(true);
    expect(tokenProp!.typeOptions?.password).toBe(true);
  });

  it('should have test configuration with disableFollowRedirect', () => {
    expect(credentials.test).toBeDefined();
    expect(credentials.test!.request).toBeDefined();
    expect(credentials.test!.request!.url).toBe('/api/public/auth/check');
    expect(credentials.test!.request!.disableFollowRedirect).toBe(true);
  });

  it('should use correct baseURL in test configuration', () => {
    expect(credentials.test!.request!.baseURL).toBe('={{$credentials?.instanceUrl.trimEnd("/")}}');
  });

  describe('Security', () => {
    it('should prevent authorization header leak on credential test', () => {
      // The disableFollowRedirect option prevents n8n from following redirects
      // during credential testing, which could leak the authorization header
      expect(credentials.test!.request!.disableFollowRedirect).toBe(true);
    });
  });
});