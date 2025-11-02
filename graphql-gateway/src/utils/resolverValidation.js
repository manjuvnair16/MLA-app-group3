/**
 * Resolver Validation Helpers
 * Provides utilities to validate inputs in GraphQL resolvers
 */

import { ValidationError, formatValidationError } from './validation.js';

/**
 * Wrapper function to validate resolver inputs and handle validation errors
 * @param {Function} validator - Validation function to apply
 * @param {*} input - Input to validate
 * @param {string} fieldName - Name of the field being validated (for error context)
 * @returns {*} - Validated input
 * @throws {ValidationError} - If validation fails
 */
export function validateResolverInput(validator, input, fieldName = 'input') {
  try {
    return validator(input);
  } catch (error) {
    if (error instanceof ValidationError) {
      // Re-throw validation errors as-is
      throw error;
    }
    // Wrap unexpected errors
    throw new ValidationError(
      `Validation failed for ${fieldName}: ${error.message}`,
      fieldName,
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Create a validated resolver function that validates inputs before execution
 * @param {Function} resolver - The resolver function to wrap
 * @param {object} validationRules - Validation rules for each input parameter
 * @returns {Function} - Wrapped resolver with validation
 */
export function createValidatedResolver(resolver, validationRules = {}) {
  return async (parent, args, context, info) => {
    const validatedArgs = {};

    // Validate each argument according to its rule
    for (const [argName, validator] of Object.entries(validationRules)) {
      if (args[argName] !== undefined) {
        try {
          validatedArgs[argName] = validateResolverInput(validator, args[argName], argName);
        } catch (error) {
          // Format validation error for GraphQL response
          const formattedError = formatValidationError(error);
          throw new Error(JSON.stringify(formattedError));
        }
      }
    }

    // Merge validated args with original args (for args without validation rules)
    const finalArgs = { ...args, ...validatedArgs };

    // Call the original resolver with validated args
    try {
      return await resolver(parent, finalArgs, context, info);
    } catch (error) {
      // Re-throw validation errors as GraphQL errors
      if (error instanceof ValidationError) {
        const formattedError = formatValidationError(error);
        throw new Error(JSON.stringify(formattedError));
      }
      // Re-throw other errors as-is
      throw error;
    }
  };
}

/**
 * Error handler for validation errors in resolvers
 * @param {Error} error - The error to handle
 * @param {string} operation - Name of the operation (for logging)
 */
export function handleValidationError(error, operation) {
  try {
    // Try to parse as validation error
    const parsed = JSON.parse(error.message);
    if (parsed.code === 'VALIDATION_ERROR' || parsed.field) {
      console.warn(`[Validation Error] ${operation}:`, {
        field: parsed.field,
        message: parsed.message,
        code: parsed.code,
        timestamp: parsed.timestamp
      });
      return parsed;
    }
  } catch (e) {
    // Not a validation error, log as regular error
    console.error(`[Error] ${operation}:`, error.message);
  }

  return null;
}

