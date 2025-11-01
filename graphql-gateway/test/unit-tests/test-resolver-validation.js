import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  validateResolverInput,
  createValidatedResolver,
  handleValidationError
} from '../../src/utils/resolverValidation.js';
import { ValidationError, validateUsername, validateID } from '../../src/utils/validation.js';

describe('Resolver Validation Tests', () => {
  describe('validateResolverInput', () => {
    it('should return validated input when validation succeeds', () => {
      const validator = validateUsername;
      const input = 'testuser@example.com';
      const result = validateResolverInput(validator, input, 'username');
      
      assert.strictEqual(result, 'testuser@example.com');
    });

    it('should re-throw ValidationError as-is', () => {
      const validator = validateUsername;
      const invalidInput = 'notanemail'; // Invalid email format
      
      assert.throws(
        () => validateResolverInput(validator, invalidInput, 'username'),
        ValidationError,
        'Should re-throw ValidationError'
      );
    });

    it('should wrap non-ValidationError errors', () => {
      const validator = () => {
        throw new Error('Unexpected error');
      };
      const input = 'test';
      
      assert.throws(
        () => validateResolverInput(validator, input, 'fieldName'),
        ValidationError,
        'Should wrap unexpected errors in ValidationError'
      );
    });

    it('should use default fieldName when not provided', () => {
      const validator = validateID;
      const invalidInput = null;
      
      assert.throws(
        () => validateResolverInput(validator, invalidInput),
        ValidationError,
        'Should throw ValidationError with default fieldName'
      );
    });
  });

  describe('createValidatedResolver', () => {
    it('should call resolver with validated args', async () => {
      const resolver = async (parent, args, context, info) => {
        return { username: args.username, id: args.id };
      };
      
      const validationRules = {
        username: validateUsername,
        id: validateID
      };
      
      const validatedResolver = createValidatedResolver(resolver, validationRules);
      const parent = null;
      const args = { username: 'testuser@example.com', id: 'test123', extra: 'field' };
      const context = {};
      const info = {};
      
      const result = await validatedResolver(parent, args, context, info);
      
      assert.strictEqual(result.username, 'testuser@example.com');
      assert.strictEqual(result.id, 'test123');
    });

    it('should validate only specified args', async () => {
      const resolver = async (parent, args, context, info) => {
        return { username: args.username, unvalidated: args.unvalidated };
      };
      
      const validationRules = {
        username: validateUsername
      };
      
      const validatedResolver = createValidatedResolver(resolver, validationRules);
      const args = { username: 'testuser@example.com', unvalidated: 'some value' };
      
      const result = await validatedResolver(null, args, {}, {});
      
      assert.strictEqual(result.username, 'testuser@example.com');
      assert.strictEqual(result.unvalidated, 'some value');
    });

    it('should merge validated args with original args', async () => {
      const resolver = async (parent, args, context, info) => {
        return args;
      };
      
      const validationRules = {
        username: validateUsername
      };
      
      const validatedResolver = createValidatedResolver(resolver, validationRules);
      const args = { username: 'testuser@example.com', otherField: 'value' };
      
      const result = await validatedResolver(null, args, {}, {});
      
      assert.strictEqual(result.username, 'testuser@example.com');
      assert.strictEqual(result.otherField, 'value');
    });

    it('should throw ValidationError when validation fails', async () => {
      const resolver = async (parent, args, context, info) => {
        return args.username;
      };
      
      const validationRules = {
        username: validateUsername
      };
      
      const validatedResolver = createValidatedResolver(resolver, validationRules);
      const args = { username: 'notanemail' }; // Invalid (not an email)
      
      await assert.rejects(
        () => validatedResolver(null, args, {}, {}),
        (err) => err.message.includes('username'),
        'Should throw error for invalid username'
      );
    });

    it('should handle resolver that throws ValidationError', async () => {
      const resolver = async (parent, args, context, info) => {
        throw new ValidationError('Resolver error', 'field', 'ERROR');
      };
      
      const validationRules = {};
      const validatedResolver = createValidatedResolver(resolver, validationRules);
      
      await assert.rejects(
        () => validatedResolver(null, {}, {}, {}),
        (err) => err.message.includes('Resolver error'),
        'Should re-throw ValidationError from resolver'
      );
    });

    it('should handle resolver that throws generic error', async () => {
      const resolver = async (parent, args, context, info) => {
        throw new Error('Generic error');
      };
      
      const validationRules = {};
      const validatedResolver = createValidatedResolver(resolver, validationRules);
      
      await assert.rejects(
        () => validatedResolver(null, {}, {}, {}),
        (err) => err.message === 'Generic error',
        'Should re-throw generic errors'
      );
    });

    it('should skip validation for undefined args', async () => {
      const resolver = async (parent, args, context, info) => {
        return { username: args.username };
      };
      
      const validationRules = {
        username: validateUsername,
        id: validateID // This should be skipped
      };
      
      const validatedResolver = createValidatedResolver(resolver, validationRules);
      const args = { username: 'testuser@example.com' }; // id is undefined
      
      const result = await validatedResolver(null, args, {}, {});
      
      assert.strictEqual(result.username, 'testuser@example.com');
    });

    it('should work with empty validationRules', async () => {
      const resolver = async (parent, args, context, info) => {
        return { value: args.value };
      };
      
      const validatedResolver = createValidatedResolver(resolver, {});
      const args = { value: 'test' };
      
      const result = await validatedResolver(null, args, {}, {});
      
      assert.strictEqual(result.value, 'test');
    });
  });

  describe('handleValidationError', () => {
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

    it('should parse and return validation error from JSON string', () => {
      const error = new Error(JSON.stringify({
        message: 'Validation failed',
        field: 'username',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      }));
      
      const result = handleValidationError(error, 'test operation');
      
      assert.ok(result, 'Should return parsed validation error');
      assert.strictEqual(result.code, 'VALIDATION_ERROR');
      assert.strictEqual(result.field, 'username');
      assert.strictEqual(consoleWarnCalls.length, 1, 'Should log warning');
    });

    it('should parse and return error with field property', () => {
      const error = new Error(JSON.stringify({
        message: 'Invalid input',
        field: 'email',
        timestamp: new Date().toISOString()
      }));
      
      const result = handleValidationError(error, 'test operation');
      
      assert.ok(result, 'Should return parsed error with field');
      assert.strictEqual(result.field, 'email');
    });

    it('should return null for non-validation errors', () => {
      const error = new Error('Not a validation error');
      
      const result = handleValidationError(error, 'test operation');
      
      assert.strictEqual(result, null, 'Should return null for non-validation errors');
      assert.strictEqual(consoleErrorCalls.length, 1, 'Should log error');
    });

    it('should return null for invalid JSON', () => {
      const error = new Error('Not JSON at all');
      
      const result = handleValidationError(error, 'test operation');
      
      assert.strictEqual(result, null, 'Should return null for invalid JSON');
    });

    it('should return null for JSON without code or field', () => {
      const error = new Error(JSON.stringify({
        message: 'Some error',
        timestamp: new Date().toISOString()
      }));
      
      const result = handleValidationError(error, 'test operation');
      
      assert.strictEqual(result, null, 'Should return null for JSON without code or field');
    });

    it('should handle errors without code but with field', () => {
      const error = new Error(JSON.stringify({
        message: 'Validation failed',
        field: 'username'
      }));
      
      const result = handleValidationError(error, 'test operation');
      
      assert.ok(result, 'Should return result when field is present');
      assert.strictEqual(result.field, 'username');
    });
  });
});

