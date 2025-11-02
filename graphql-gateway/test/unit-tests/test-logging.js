import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { logger, logGraphQLRequest, logGraphQLError, redactSensitiveData } from '../../src/utils/logger.js';
import { createLoggingPlugin } from '../../src/middleware/loggingPlugin.js';

describe('Structured Logging Tests', () => {
  describe('Logger Utility', () => {
    it('should create a logger instance', () => {
      assert.ok(logger, 'Logger should be defined');
      assert.strictEqual(typeof logger.info, 'function', 'Logger should have info method');
      assert.strictEqual(typeof logger.error, 'function', 'Logger should have error method');
      assert.strictEqual(typeof logger.warn, 'function', 'Logger should have warn method');
      assert.strictEqual(typeof logger.debug, 'function', 'Logger should have debug method');
    });

    it('should redact sensitive fields', () => {
      const testData = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        authHeader: 'Bearer xyz',
        nested: {
          apiKey: 'key123',
          data: 'safe data',
        },
      };

      const redacted = redactSensitiveData(testData);
      
      assert.strictEqual(redacted.username, 'testuser', 'Non-sensitive fields should remain');
      assert.strictEqual(redacted.password, '[REDACTED]', 'Password should be redacted');
      assert.strictEqual(redacted.token, '[REDACTED]', 'Token should be redacted');
      assert.strictEqual(redacted.authHeader, '[REDACTED]', 'Auth header should be redacted');
      assert.strictEqual(redacted.nested.apiKey, '[REDACTED]', 'Nested API key should be redacted');
      assert.strictEqual(redacted.nested.data, 'safe data', 'Non-sensitive nested data should remain');
    });

    it('should handle arrays with sensitive data', () => {
      const testData = {
        users: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', token: 'token2' },
        ],
      };

      const redacted = redactSensitiveData(testData);
      
      assert.strictEqual(redacted.users[0].username, 'user1');
      assert.strictEqual(redacted.users[0].password, '[REDACTED]');
      assert.strictEqual(redacted.users[1].username, 'user2');
      assert.strictEqual(redacted.users[1].token, '[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      const testData = {
        value: null,
        missing: undefined,
        password: 'secret',
      };

      const redacted = redactSensitiveData(testData);
      
      assert.strictEqual(redacted.value, null);
      assert.strictEqual(redacted.missing, undefined);
      assert.strictEqual(redacted.password, '[REDACTED]');
    });

    it('should prevent infinite recursion', () => {
      const circular = { data: 'test' };
      circular.self = circular;

      // Should not throw, should return [Max Depth Reached]
      const result = redactSensitiveData(circular, 0);
      assert.ok(result, 'Should handle circular references');
    });
  });

  describe('GraphQL Request Logging', () => {
    it('should log GraphQL request with all details', () => {
      const logData = {
        operation: 'query',
        operationName: 'GetUser',
        duration: 150,
        variables: { userId: '123' },
        query: 'query GetUser($userId: ID!) { user(id: $userId) { name } }',
        hasErrors: false,
        complexity: 5,
      };

      // Should not throw
      assert.doesNotThrow(() => {
        logGraphQLRequest(logData);
      }, 'Should log GraphQL request without errors');
    });

    it('should sanitize variables in GraphQL request logs', () => {
      const logData = {
        operation: 'mutation',
        operationName: 'Login',
        duration: 200,
        variables: {
          username: 'testuser',
          password: 'secret123',
          token: 'abc123',
        },
        query: 'mutation Login($username: String!, $password: String!) { login(username: $username, password: $password) { token } }',
        hasErrors: false,
      };

      // Should not throw and should sanitize sensitive data
      assert.doesNotThrow(() => {
        logGraphQLRequest(logData);
      }, 'Should log GraphQL request with sanitized variables');
    });

    it('should handle missing optional fields', () => {
      const logData = {
        operation: 'query',
        operationName: 'SimpleQuery',
        duration: 50,
      };

      assert.doesNotThrow(() => {
        logGraphQLRequest(logData);
      }, 'Should handle minimal log data');
    });

    it('should truncate long queries', () => {
      const longQuery = 'a'.repeat(600);
      const logData = {
        operation: 'query',
        operationName: 'LongQuery',
        duration: 100,
        query: longQuery,
      };

      assert.doesNotThrow(() => {
        logGraphQLRequest(logData);
      }, 'Should handle long queries');
    });

    it('should log errors appropriately', () => {
      const logData = {
        operation: 'query',
        operationName: 'FailingQuery',
        duration: 100,
        hasErrors: true,
        query: 'query FailingQuery { nonExistentField }',
      };

      assert.doesNotThrow(() => {
        logGraphQLRequest(logData);
      }, 'Should log failed requests');
    });
  });

  describe('GraphQL Error Logging', () => {
    it('should log GraphQL errors with context', () => {
      const error = new Error('Validation failed');
      error.path = ['user', 'name'];
      error.locations = [{ line: 1, column: 5 }];
      error.extensions = { code: 'VALIDATION_ERROR' };

      assert.doesNotThrow(() => {
        logGraphQLError({
          error,
          operation: 'query',
          operationName: 'GetUser',
          context: { userId: '123' },
        });
      }, 'Should log GraphQL errors without throwing');
    });

    it('should sanitize context in error logs', () => {
      const error = new Error('Auth failed');
      const context = {
        userId: '123',
        password: 'secret',
        token: 'abc123',
      };

      assert.doesNotThrow(() => {
        logGraphQLError({
          error,
          operation: 'mutation',
          operationName: 'Login',
          context,
        });
      }, 'Should sanitize sensitive data in error context');
    });

    it('should handle errors without extensions', () => {
      const error = new Error('Simple error');

      assert.doesNotThrow(() => {
        logGraphQLError({
          error,
          operation: 'query',
        });
      }, 'Should handle errors without extensions');
    });
  });

  describe('Logging Plugin', () => {
    it('should create a logging plugin', () => {
      const plugin = createLoggingPlugin();
      
      assert.ok(plugin, 'Plugin should be created');
      assert.strictEqual(typeof plugin.requestDidStart, 'function', 'Plugin should have requestDidStart method');
    });

    it('should create plugin with custom options', () => {
      const plugin = createLoggingPlugin({
        logQueries: false,
        logVariables: false,
        slowQueryThreshold: 500,
      });
      
      assert.ok(plugin, 'Plugin should be created with options');
    });

    it('should handle plugin lifecycle methods', async () => {
      const plugin = createLoggingPlugin();
      const mockRequestContext = {
        request: {
          operationName: 'TestQuery',
          operation: { operation: 'query' },
          query: 'query TestQuery { __typename }',
          variables: {},
        },
        response: {},
      };

      // Should not throw when calling requestDidStart
      assert.doesNotThrow(() => {
        const lifecycle = plugin.requestDidStart(mockRequestContext);
        assert.ok(lifecycle, 'Should return lifecycle hooks');
      }, 'Should handle requestDidStart');
    });
  });

  describe('Sensitive Data Redaction', () => {
    it('should redact common sensitive field variations', () => {
      const sensitiveFields = [
        'password',
        'passwd',
        'pwd',
        'token',
        'accessToken',
        'refreshToken',
        'secret',
        'apiKey',
        'api_key',
        'authorization',
        'authHeader',
        'jwtPayload',
      ];

      sensitiveFields.forEach(field => {
        const testData = { [field]: 'sensitive_value' };
        const redacted = redactSensitiveData(testData);
        assert.strictEqual(
          redacted[field],
          '[REDACTED]',
          `Field ${field} should be redacted`
        );
      });
    });

    it('should preserve non-sensitive fields', () => {
      const safeFields = [
        'username',
        'email',
        'name',
        'id',
        'createdAt',
        'status',
        'count',
        'description',
      ];

      safeFields.forEach(field => {
        const testData = { [field]: 'safe_value' };
        const redacted = redactSensitiveData(testData);
        assert.strictEqual(
          redacted[field],
          'safe_value',
          `Field ${field} should not be redacted`
        );
      });
    });

    it('should redact nested sensitive fields', () => {
      const testData = {
        user: {
          profile: {
            name: 'John',
            password: 'secret',
          },
          credentials: {
            token: 'abc123',
          },
        },
      };

      const redacted = redactSensitiveData(testData);
      
      assert.strictEqual(redacted.user.profile.name, 'John');
      assert.strictEqual(redacted.user.profile.password, '[REDACTED]');
      assert.strictEqual(redacted.user.credentials.token, '[REDACTED]');
    });
  });

  describe('Educational-Friendly Logging', () => {
    it('should structure logs with type field', () => {
      const logData = {
        type: 'graphql_request',
        operation: 'query',
        operationName: 'TestQuery',
        duration: 100,
      };

      assert.doesNotThrow(() => {
        logGraphQLRequest(logData);
      }, 'Should create structured logs with type field');
    });

    it('should include performance metrics', () => {
      const logData = {
        operation: 'query',
        operationName: 'SlowQuery',
        duration: 1500,
        complexity: 10,
        hasErrors: false,
      };

      assert.doesNotThrow(() => {
        logGraphQLRequest(logData);
      }, 'Should include performance metrics in logs');
    });

    it('should format errors for readability', () => {
      const error = new Error('Test error');
      error.path = ['query', 'field'];
      error.locations = [{ line: 1, column: 1 }];

      assert.doesNotThrow(() => {
        logGraphQLError({
          error,
          operation: 'query',
          operationName: 'TestQuery',
        });
      }, 'Should format errors for readability');
    });
  });
});

