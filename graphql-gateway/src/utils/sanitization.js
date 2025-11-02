/**
 * Input Sanitization Utilities
 * Provides functions to sanitize and clean user inputs to prevent XSS, SQL injection, and other attacks
 */

/**
 * Sanitize a string input by removing potentially dangerous characters and patterns
 * @param {string} input - The input string to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input, options = {}) {
  if (input === null || input === undefined) {
    return '';
  }

  // Convert to string if not already
  let sanitized = String(input);

  // Remove null bytes (common in injection attacks)
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs (for description fields)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove SQL injection patterns (basic prevention)
  if (options.preventSQLInjection !== false) {
    const sqlPatterns = [
      // Remove SQL keywords (including TABLE, FROM, WHERE, etc.)
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|TABLE|FROM|WHERE|INTO|VALUES|SET|DATABASE|SCHEMA|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION)\b)/gi,
      // Remove SQL operators and special characters
      /('|\\'|--|;|\*|\\|%)/g,
      // Remove SQL injection patterns like "OR 1=1" or "AND '1'='1'"
      /(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi
    ];
    
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
  }

  // Remove JavaScript/HTML injection patterns (XSS prevention)
  if (options.preventXSS !== false) {
    // Remove script tags and event handlers
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove HTML tags if specified
    if (options.removeHTML) {
      sanitized = sanitized.replace(/<[^>]+>/g, '');
    }
    
    // Escape special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitize an object by recursively sanitizing all string properties
 * @param {object} obj - The object to sanitize
 * @param {object} options - Sanitization options
 * @returns {object} - Sanitized object
 */
export function sanitizeObject(obj, options = {}) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key], options);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize input for GraphQL inputs (preserves structure while cleaning values)
 * @param {object} input - GraphQL input object
 * @param {object} fieldRules - Rules for specific fields
 * @returns {object} - Sanitized input
 */
export function sanitizeGraphQLInput(input, fieldRules = {}) {
  if (!input || typeof input !== 'object') {
    return input;
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(item => {
      if (typeof item === 'string') {
        return sanitizeString(item, {
          preventSQLInjection: fieldRules.preventSQLInjection !== false,
          preventXSS: fieldRules.preventXSS !== false,
          removeHTML: fieldRules.removeHTML || false,
          maxLength: fieldRules.maxLength
        });
      } else if (typeof item === 'object' && item !== null) {
        return sanitizeGraphQLInput(item, fieldRules);
      }
      return item;
    });
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(input)) {
    const fieldRule = fieldRules[key] || {};
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, {
        preventSQLInjection: fieldRule.preventSQLInjection !== false,
        preventXSS: fieldRule.preventXSS !== false,
        removeHTML: fieldRule.removeHTML || false,
        maxLength: fieldRule.maxLength
      });
    } else if (Array.isArray(value)) {
      // Handle array values with field-specific rules
      sanitized[key] = value.map(item => {
        if (typeof item === 'string') {
          return sanitizeString(item, {
            preventSQLInjection: fieldRule.preventSQLInjection !== false,
            preventXSS: fieldRule.preventXSS !== false,
            removeHTML: fieldRule.removeHTML || false,
            maxLength: fieldRule.maxLength
          });
        } else if (typeof item === 'object' && item !== null) {
          return sanitizeGraphQLInput(item, fieldRules);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeGraphQLInput(value, fieldRules);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

