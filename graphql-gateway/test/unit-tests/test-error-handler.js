import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { handleServiceError, retryWithFallback } from '../../src/utils/errorHandler.js';
import { ValidationError } from '../../src/utils/validation.js';

describe('Error Handler Tests', () => {
  describe('handleServiceError', () => {
    let consoleWarnCalls;
    let consoleErrorCalls;
    let originalWarn;
    let originalError;

    beforeEach(() => {
      consoleWarnCalls = [];
      consoleErrorCalls = [];
      // Store original functions
      originalWarn = console.warn;
      originalError = console.error;
      // Capture console.warn and console.error
      console.warn = (...args) => {
        consoleWarnCalls.push(args);
        originalWarn.apply(console, args);
      };
      console.error = (...args) => {
        consoleErrorCalls.push(args);
        originalError.apply(console, args);
      };
    });

    afterEach(() => {
      // Restore original functions
      console.warn = originalWarn;
      console.error = originalError;
    });

    it('should re-throw ValidationError as-is', () => {
      const validationError = new ValidationError('Invalid input', 'username', 'INVALID_USERNAME');
      
      assert.throws(
        () => handleServiceError(validationError, 'test operation'),
        ValidationError,
        'Should re-throw ValidationError'
      );
      
      assert.strictEqual(consoleWarnCalls.length, 1, 'Should log validation error warning');
    });

    it('should handle ECONNREFUSED error', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      assert.throws(
        () => handleServiceError(error, 'test operation'),
        (err) => err.message.includes('currently unavailable'),
        'Should throw service unavailable error for ECONNREFUSED'
      );
    });

    it('should handle ENOTFOUND error', () => {
      const error = new Error('Host not found');
      error.code = 'ENOTFOUND';
      
      assert.throws(
        () => handleServiceError(error, 'test operation'),
        (err) => err.message.includes('currently unavailable'),
        'Should throw service unavailable error for ENOTFOUND'
      );
    });

    it('should handle 404 errors', () => {
      const error = new Error('Not found');
      error.response = { status: 404 };
      
      assert.throws(
        () => handleServiceError(error, 'test operation'),
        (err) => err.message.includes('not found'),
        'Should throw not found error for 404'
      );
    });

    it('should handle 500+ errors', () => {
      const error = new Error('Server error');
      error.response = { status: 500 };
      
      assert.throws(
        () => handleServiceError(error, 'test operation'),
        (err) => err.message.includes('service error'),
        'Should throw service error for 500+ status'
      );
    });

    it('should handle 502 errors', () => {
      const error = new Error('Bad gateway');
      error.response = { status: 502 };
      
      assert.throws(
        () => handleServiceError(error, 'test operation'),
        (err) => err.message.includes('service error'),
        'Should throw service error for 502'
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      
      assert.throws(
        () => handleServiceError(error, 'test operation'),
        (err) => err.message.includes('Failed to test operation'),
        'Should throw generic error message'
      );
    });

    it('should log error details with response status', () => {
      // Reset arrays to ensure clean state for this test
      consoleErrorCalls.length = 0;
      const error = new Error('Test error');
      error.response = { status: 500 };
      error.config = { url: 'http://test.com' };
      
      try {
        handleServiceError(error, 'test operation');
      } catch (e) {
        // Expected to throw
      }
      
      // Should have logged exactly one error
      assert.strictEqual(consoleErrorCalls.length, 1, 'Should log error once');
    });
  });

  describe('retryWithFallback', () => {
    it('should return result on first attempt', async () => {
      const operation = async () => 'success';
      const result = await retryWithFallback(operation, 2);
      assert.strictEqual(result, 'success');
    });

    it('should retry on failure and succeed on second attempt', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('First attempt failed');
        }
        return 'success';
      };
      
      const result = await retryWithFallback(operation, 2);
      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 2);
    });

    it('should throw after max retries', async () => {
      const operation = async () => {
        throw new Error('Always fails');
      };
      
      await assert.rejects(
        () => retryWithFallback(operation, 2),
        (err) => err.message === 'Always fails',
        'Should throw after max retries'
      );
    });

    it('should use exponential backoff', async () => {
      let attempt = 0;
      const startTimes = [];
      
      const operation = async () => {
        startTimes.push(Date.now());
        attempt++;
        if (attempt < 3) {
          throw new Error('Retry');
        }
        return 'success';
      };
      
      const start = Date.now();
      await retryWithFallback(operation, 3);
      const totalTime = Date.now() - start;
      
      // Should have at least some delay (at least 1 second for first retry)
      assert.ok(totalTime >= 1000, 'Should have exponential backoff delay');
    });

    it('should use default maxRetries when not specified', async () => {
      const operation = async () => {
        throw new Error('Fail');
      };
      
      await assert.rejects(
        () => retryWithFallback(operation),
        'Should use default maxRetries of 2'
      );
    });

    it('should handle success after multiple retries', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry needed');
        }
        return 'success after retries';
      };
      
      const result = await retryWithFallback(operation, 3);
      assert.strictEqual(result, 'success after retries');
      assert.strictEqual(attempts, 3);
    });
  });
});

