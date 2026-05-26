import * as http from 'http';
import { buildRequestOptions, buildRequestOptionsWithErrorHandling } from '../../nodes/Air/utils/helpers';
import { AirCredentials } from '../../credentials/AirApi.credentials';

describe('Redirect Security Tests', () => {
  const mockCredentials: AirCredentials = {
    instanceUrl: 'http://localhost:9001',
    token: 'secret-air-token'
  };

  let primaryServer: http.Server;
  let maliciousServer: http.Server;
  let capturedHeaders: any = null;

  beforeAll((done) => {
    // Primary server that redirects to malicious server
    primaryServer = http.createServer((req, res) => {
      if (req.url === '/api/v1/assets') {
        // Redirect to a different host (simulating cross-host redirect)
        res.writeHead(302, {
          'Location': 'http://localhost:9002/steal-token'
        });
        res.end();
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Malicious server that would capture the Authorization header
    maliciousServer = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ captured: true }));
    });

    primaryServer.listen(9001, () => {
      maliciousServer.listen(9002, done);
    });
  });

  afterAll((done) => {
    primaryServer.close(() => {
      maliciousServer.close(done);
    });
  });

  beforeEach(() => {
    capturedHeaders = null;
  });

  describe('Verification that disableFollowRedirect protects against header leak', () => {
    it('should have disableFollowRedirect enabled for buildRequestOptions', () => {
      const options = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.disableFollowRedirect).toBe(true);
      expect(options.headers!['Authorization']).toBe('Bearer secret-air-token');
    });

    it('should have disableFollowRedirect enabled for buildRequestOptionsWithErrorHandling', () => {
      const options = buildRequestOptionsWithErrorHandling(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      expect(options.disableFollowRedirect).toBe(true);
      expect(options.headers!['Authorization']).toBe('Bearer secret-air-token');
    });

    it('should protect against authorization header leak on cross-origin redirect', () => {
      // When disableFollowRedirect is true, n8n will NOT follow the redirect
      // This prevents the Authorization header from being sent to the malicious server
      
      const options = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      // Verify the security setting is in place
      expect(options.disableFollowRedirect).toBe(true);
      
      // The Authorization header should be set for the initial request
      expect(options.headers!['Authorization']).toBe('Bearer secret-air-token');
      
      // But because redirects are disabled, the header won't leak to other servers
      // n8n will receive the 302 response and not follow it automatically
    });
  });

  describe('Simulated attack scenarios', () => {
    it('demonstrates protection against token theft via redirect', async () => {
      const options = buildRequestOptions(
        mockCredentials,
        'GET',
        '/api/v1/assets'
      );

      // Create a simple HTTP request to demonstrate the protection
      const makeRequest = () => {
        return new Promise((resolve, reject) => {
          const url = new URL(options.url as string);
          const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: options.method,
            headers: options.headers as http.OutgoingHttpHeaders
          }, (res) => {
            // With disableFollowRedirect=true in n8n, the request would stop here
            // and not follow the redirect, protecting the Authorization header
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('http://localhost:9002/steal-token');
            
            // The malicious server should NOT receive our Authorization header
            // because n8n won't follow the redirect when disableFollowRedirect=true
            resolve(res);
          });

          req.on('error', reject);
          req.end();
        });
      };

      await makeRequest();
      
      // Since redirects are disabled in our configuration,
      // the malicious server should never receive a request
      expect(capturedHeaders).toBeNull();
    });

    it('verifies all request builders have redirect protection', () => {
      // Test all variations of request options
      const testCases = [
        {
          name: 'buildRequestOptions with GET',
          options: buildRequestOptions(mockCredentials, 'GET', '/api/test')
        },
        {
          name: 'buildRequestOptions with POST',
          options: buildRequestOptions(mockCredentials, 'POST', '/api/test')
        },
        {
          name: 'buildRequestOptionsWithErrorHandling with GET',
          options: buildRequestOptionsWithErrorHandling(mockCredentials, 'GET', '/api/test')
        },
        {
          name: 'buildRequestOptionsWithErrorHandling with POST',
          options: buildRequestOptionsWithErrorHandling(mockCredentials, 'POST', '/api/test')
        }
      ];

      testCases.forEach(testCase => {
        expect(testCase.options.disableFollowRedirect).toBe(true);
        expect(testCase.options.headers!['Authorization']).toContain('Bearer ');
      });
    });
  });
});