/**
 * Input Validation Utilities
 * Provides functions to validate user inputs according to business rules
 */

import { sanitizeString, sanitizeGraphQLInput } from './sanitization.js';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

/**
 * Validate ID format
 * @param {string} id - The ID to validate
 * @returns {string} - Validated ID
 * @throws {ValidationError} - If ID is invalid
 */
export function validateID(id) {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('ID is required and must be a string', 'id', 'INVALID_ID');
  }

  // Validate format FIRST to reject malicious input before sanitization
  // ID should be alphanumeric with hyphens and underscores, typically 1-100 characters
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    throw new ValidationError(
      'ID must contain only alphanumeric characters, hyphens, and underscores (1-100 characters)',
      'id',
      'INVALID_ID_FORMAT'
    );
  }

  // Sanitize to remove any edge cases (should already be clean after format check)
  const sanitized = sanitizeString(id, { preventSQLInjection: true, preventXSS: false });
  
  // Double-check after sanitization (should pass, but ensures sanitization didn't break it)
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(sanitized)) {
    throw new ValidationError(
      'ID contains invalid characters after sanitization',
      'id',
      'INVALID_ID_FORMAT'
    );
  }

  return sanitized;
}

/**
 * Validate username format (must be a valid email address)
 * @param {string} username - The username to validate
 * @returns {string} - Validated username (email address)
 * @throws {ValidationError} - If username is invalid
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('Username is required and must be a string', 'username', 'INVALID_USERNAME');
  }

  const trimmed = username.trim().toLowerCase();

  // Validate format FIRST to reject malicious input before sanitization
  // Username must be a valid email address (RFC 5321 allows up to 254 characters total)
  if (trimmed.length < 5 || trimmed.length > 254) {
    throw new ValidationError(
      'Username must be a valid email address between 5 and 254 characters',
      'username',
      'INVALID_USERNAME_LENGTH'
    );
  }

  // Email validation regex (RFC 5322 compliant pattern)
  // Matches: local-part@domain
  // Local part: alphanumeric, dots, hyphens, underscores, plus signs
  // Domain: alphanumeric, dots, hyphens
  const emailPattern = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Check format before sanitization to reject malicious input
  if (!emailPattern.test(trimmed)) {
    throw new ValidationError(
      'Username must be a valid email address',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  // Additional validation: ensure local part is not empty and domain has valid TLD
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    throw new ValidationError(
      'Username must be a valid email address',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  const [localPart, domain] = parts;
  
  // Validate local part (before @)
  if (localPart.length < 1 || localPart.length > 64) {
    throw new ValidationError(
      'Email local part must be between 1 and 64 characters',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  // Local part cannot start or end with dot
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    throw new ValidationError(
      'Email local part cannot start or end with a dot',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  // Local part cannot have consecutive dots
  if (localPart.includes('..')) {
    throw new ValidationError(
      'Email local part cannot contain consecutive dots',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  // Validate domain (after @)
  if (domain.length < 4 || domain.length > 255) {
    throw new ValidationError(
      'Email domain must be between 4 and 255 characters',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  // Domain must have at least one dot and valid TLD
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    throw new ValidationError(
      'Email domain must be valid',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  // Domain cannot have consecutive dots
  if (domain.includes('..')) {
    throw new ValidationError(
      'Email domain cannot contain consecutive dots',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  // Sanitize to remove any edge cases (should already be clean after format check)
  const sanitized = sanitizeString(trimmed, { 
    preventSQLInjection: true, 
    preventXSS: true,
    maxLength: 254 
  });

  // Double-check after sanitization
  if (sanitized.length < 5 || sanitized.length > 254) {
    throw new ValidationError(
      'Username must be a valid email address between 5 and 254 characters after sanitization',
      'username',
      'INVALID_USERNAME_LENGTH'
    );
  }

  // Re-validate email format after sanitization
  if (!emailPattern.test(sanitized)) {
    throw new ValidationError(
      'Username contains invalid characters after sanitization',
      'username',
      'INVALID_USERNAME_FORMAT'
    );
  }

  return sanitized;
}

/**
 * Validate exercise type
 * @param {string} exerciseType - The exercise type to validate
 * @returns {string} - Validated exercise type
 * @throws {ValidationError} - If exercise type is invalid
 */
export function validateExerciseType(exerciseType) {
  if (!exerciseType || typeof exerciseType !== 'string') {
    throw new ValidationError('Exercise type is required and must be a string', 'exerciseType', 'INVALID_EXERCISE_TYPE');
  }

  const trimmed = exerciseType.trim();

  // Validate format FIRST to reject malicious input before sanitization
  // Exercise type should be 1-100 characters
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new ValidationError(
      'Exercise type must be between 1 and 100 characters',
      'exerciseType',
      'INVALID_EXERCISE_TYPE_LENGTH'
    );
  }

  // Check format before sanitization to reject malicious input
  // Exercise type should contain only letters, spaces, hyphens, and underscores
  if (!/^[a-zA-Z\s_-]+$/.test(trimmed)) {
    throw new ValidationError(
      'Exercise type must contain only letters, spaces, hyphens, and underscores',
      'exerciseType',
      'INVALID_EXERCISE_TYPE_FORMAT'
    );
  }

  // Sanitize to remove any edge cases (should already be clean after format check)
  const sanitized = sanitizeString(trimmed, { 
    preventSQLInjection: true, 
    preventXSS: true,
    maxLength: 100 
  });

  // Double-check after sanitization
  if (sanitized.length < 1 || sanitized.length > 100) {
    throw new ValidationError(
      'Exercise type must be between 1 and 100 characters after sanitization',
      'exerciseType',
      'INVALID_EXERCISE_TYPE_LENGTH'
    );
  }

  if (!/^[a-zA-Z\s_-]+$/.test(sanitized)) {
    throw new ValidationError(
      'Exercise type contains invalid characters after sanitization',
      'exerciseType',
      'INVALID_EXERCISE_TYPE_FORMAT'
    );
  }

  return sanitized;
}

/**
 * Validate description (optional field)
 * @param {string} description - The description to validate
 * @returns {string|null} - Validated description or null
 * @throws {ValidationError} - If description is invalid
 */
export function validateDescription(description) {
  if (description === null || description === undefined || description === '') {
    return null;
  }

  if (typeof description !== 'string') {
    throw new ValidationError('Description must be a string', 'description', 'INVALID_DESCRIPTION');
  }

  const trimmed = description.trim();

  // Validate length FIRST to reject long input before sanitization
  if (trimmed.length > 1000) {
    throw new ValidationError(
      'Description must not exceed 1000 characters',
      'description',
      'INVALID_DESCRIPTION_LENGTH'
    );
  }

  // Sanitize to remove XSS and SQL injection patterns
  const sanitized = sanitizeString(trimmed, { 
    preventSQLInjection: true, 
    preventXSS: true,
    removeHTML: true,
    maxLength: 1000 
  });

  // Double-check after sanitization (shouldn't be longer since we already checked)
  if (sanitized.length > 1000) {
    throw new ValidationError(
      'Description must not exceed 1000 characters after sanitization',
      'description',
      'INVALID_DESCRIPTION_LENGTH'
    );
  }

  return sanitized;
}

/**
 * Validate duration (positive integer)
 * @param {number} duration - The duration to validate
 * @returns {number} - Validated duration
 * @throws {ValidationError} - If duration is invalid
 */
export function validateDuration(duration) {
  if (duration === null || duration === undefined) {
    throw new ValidationError('Duration is required', 'duration', 'MISSING_DURATION');
  }

  // Convert string to number if needed
  const numDuration = typeof duration === 'string' ? parseInt(duration, 10) : Number(duration);

  if (isNaN(numDuration)) {
    throw new ValidationError('Duration must be a valid number', 'duration', 'INVALID_DURATION_TYPE');
  }

  if (!Number.isInteger(numDuration)) {
    throw new ValidationError('Duration must be an integer', 'duration', 'INVALID_DURATION_TYPE');
  }

  if (numDuration < 1) {
    throw new ValidationError('Duration must be a positive integer (at least 1)', 'duration', 'INVALID_DURATION_VALUE');
  }

  if (numDuration > 100000) {
    throw new ValidationError('Duration must not exceed 100000 minutes', 'duration', 'INVALID_DURATION_VALUE');
  }

  return numDuration;
}

/**
 * Validate date string format (ISO 8601 or YYYY-MM-DD)
 * @param {string} date - The date string to validate
 * @returns {string} - Validated date string
 * @throws {ValidationError} - If date is invalid
 */
export function validateDate(date) {
  if (!date || typeof date !== 'string') {
    throw new ValidationError('Date is required and must be a string', 'date', 'INVALID_DATE');
  }

  const sanitized = sanitizeString(date.trim(), { 
    preventSQLInjection: true, 
    preventXSS: false 
  });

  // Accept ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
  // Pattern breakdown:
  // - YYYY-MM-DD (required)
  // - (T followed by time) optional
  //   - T\d{2}:\d{2}:\d{2} (time required when time part present)
  //   - (\.\d{3})? (milliseconds optional)
  //   - (Z|[+-]\d{2}:\d{2})? (timezone optional)
  const datePattern = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  
  if (!datePattern.test(sanitized)) {
    throw new ValidationError(
      'Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)',
      'date',
      'INVALID_DATE_FORMAT'
    );
  }

  // Validate that it's a real date
  const dateObj = new Date(sanitized);
  if (isNaN(dateObj.getTime())) {
    throw new ValidationError('Date must be a valid date', 'date', 'INVALID_DATE_VALUE');
  }

  return sanitized;
}

/**
 * Validate date range (startDate and endDate)
 * @param {string} startDate - The start date
 * @param {string} endDate - The end date
 * @returns {{startDate: string, endDate: string}} - Validated date range
 * @throws {ValidationError} - If date range is invalid
 */
export function validateDateRange(startDate, endDate) {
  const validatedStart = validateDate(startDate);
  const validatedEnd = validateDate(endDate);

  const start = new Date(validatedStart);
  const end = new Date(validatedEnd);

  if (start > end) {
    throw new ValidationError(
      'Start date must be before or equal to end date',
      'dateRange',
      'INVALID_DATE_RANGE'
    );
  }

  // Check if date range is not too large (e.g., more than 1 year)
  const diffTime = Math.abs(end - start);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  if (diffDays > 365) {
    throw new ValidationError(
      'Date range must not exceed 365 days',
      'dateRange',
      'INVALID_DATE_RANGE_SIZE'
    );
  }

  return {
    startDate: validatedStart,
    endDate: validatedEnd
  };
}

/**
 * Validate AddExerciseInput
 * @param {object} input - The input object to validate
 * @returns {object} - Validated and sanitized input
 * @throws {ValidationError} - If input is invalid
 */
export function validateAddExerciseInput(input) {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Input is required and must be an object', 'input', 'INVALID_INPUT');
  }

  const sanitized = sanitizeGraphQLInput(input, {
    username: { preventSQLInjection: true, preventXSS: true, maxLength: 254 },
    exerciseType: { preventSQLInjection: true, preventXSS: true, maxLength: 100 },
    description: { preventSQLInjection: true, preventXSS: true, removeHTML: true, maxLength: 1000 }
  });

  return {
    username: validateUsername(sanitized.username),
    exerciseType: validateExerciseType(sanitized.exerciseType),
    description: validateDescription(sanitized.description),
    duration: validateDuration(sanitized.duration),
    date: validateDate(sanitized.date)
  };
}

/**
 * Validate UpdateExerciseInput
 * @param {object} input - The input object to validate
 * @returns {object} - Validated and sanitized input
 * @throws {ValidationError} - If input is invalid
 */
export function validateUpdateExerciseInput(input) {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Input is required and must be an object', 'input', 'INVALID_INPUT');
  }

  const sanitized = sanitizeGraphQLInput(input, {
    username: { preventSQLInjection: true, preventXSS: true, maxLength: 254 },
    exerciseType: { preventSQLInjection: true, preventXSS: true, maxLength: 100 },
    description: { preventSQLInjection: true, preventXSS: true, removeHTML: true, maxLength: 1000 }
  });

  return {
    username: validateUsername(sanitized.username),
    exerciseType: validateExerciseType(sanitized.exerciseType),
    description: validateDescription(sanitized.description),
    duration: validateDuration(sanitized.duration),
    date: validateDate(sanitized.date)
  };
}

/**
 * Format validation error for GraphQL response
 * @param {ValidationError} error - The validation error
 * @returns {object} - Formatted error object
 */
export function formatValidationError(error) {
  return {
    message: error.message,
    field: error.field,
    code: error.code,
    timestamp: new Date().toISOString()
  };
}

