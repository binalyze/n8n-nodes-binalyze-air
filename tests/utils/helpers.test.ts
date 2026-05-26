import { buildRequestOptions, buildRequestOptionsWithErrorHandling } from '../../nodes/Air/utils/helpers';
import { AirCredentials } from '../../credentials/AirApi.credentials';

describe('Authorization Header Security', () => {
  const mockCredentials: AirCredentials = {
    instanceUrl: 'https://air.example.com',
    token: 'secret-token-123'
  };

  describe('buildRequestOptions', () => {
    it('should include Authorization header in request options', () => {
      const options = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.headers).toBeDefined();
      expect(options.headers!['Authorization']).toBe('Bearer secret-token-123');
    });

    it('should disable redirect following to prevent header leak', () => {
      const options = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.disableFollowRedirect).toBe(true);
    });

    it('should construct proper URL with instance URL', () => {
      const options = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.url).toBe('https://air.example.com/api/v1/assets');
    });

    it('should handle query parameters properly', () => {
      const queryParams = {
        limit: 10,
        offset: 0,
        organizationId: '123'
      };

      const options = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets',
        queryParams
      );

      expect(options.qs).toEqual(queryParams);
    });
  });

  describe('buildRequestOptionsWithErrorHandling', () => {
    it('should include Authorization header in request options', () => {
      const options = buildRequestOptionsWithErrorHandling(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.headers).toBeDefined();
      expect(options.headers!['Authorization']).toBe('Bearer secret-token-123');
    });

    it('should disable redirect following to prevent header leak', () => {
      const options = buildRequestOptionsWithErrorHandling(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.disableFollowRedirect).toBe(true);
    });

    it('should set ignoreHttpStatusErrors to true', () => {
      const options = buildRequestOptionsWithErrorHandling(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.ignoreHttpStatusErrors).toBe(true);
    });

    it('should construct proper URL with instance URL', () => {
      const options = buildRequestOptionsWithErrorHandling(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.url).toBe('https://air.example.com/api/v1/assets');
    });

    it('should handle query parameters properly', () => {
      const queryParams = {
        limit: 10,
        offset: 0,
        organizationId: '123'
      };

      const options = buildRequestOptionsWithErrorHandling(
        mockCredentials,
        'GET',
        '/api/v1/assets',
        queryParams
      );

      expect(options.qs).toEqual(queryParams);
    });
  });

  describe('Security Scenarios', () => {
    it('should prevent authorization header from being sent to different hosts on redirect', () => {
      // Both functions should have disableFollowRedirect set to true
      const options1 = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      const options2 = buildRequestOptionsWithErrorHandling(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      // This ensures n8n won't automatically follow redirects with the Authorization header
      expect(options1.disableFollowRedirect).toBe(true);
      expect(options2.disableFollowRedirect).toBe(true);
    });

    it('should include proper security headers', () => {
      const options = buildRequestOptions(
        mockCredentials,
        'POST',
        '/api/v1/assets'
      );

      expect(options.headers).toMatchObject({
        'Authorization': 'Bearer secret-token-123',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      });
      expect(options.json).toBe(true);
    });

    it('should handle trailing slashes in instance URL correctly', () => {
      const credentialsWithTrailingSlash = {
        instanceUrl: 'https://air.example.com/',
        token: 'secret-token-123'
      };

      const options = buildRequestOptions(
        credentialsWithTrailingSlash,
        'GET',
        '/api/v1/assets'
      );

      // Should not have double slashes
      expect(options.url).toBe('https://air.example.com/api/v1/assets');
    });
  });
});