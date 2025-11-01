import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateID,
  validateUsername,
  validateExerciseType,
  validateDescription,
  validateDuration,
  validateDate,
  validateDateRange,
  validateAddExerciseInput,
  validateUpdateExerciseInput,
  ValidationError
} from '../../src/utils/validation.js';
import {
  sanitizeString,
  sanitizeObject,
  sanitizeGraphQLInput
} from '../../src/utils/sanitization.js';

describe('Input Validation Tests', () => {
  describe('validateID', () => {
    it('should validate a valid ID', () => {
      const validIDs = ['abc123', 'user-123', 'test_id', '123', 'a'];
      validIDs.forEach(id => {
        const result = validateID(id);
        assert.strictEqual(result, id, `Should accept valid ID: ${id}`);
      });
    });

    it('should reject invalid IDs', () => {
      const invalidIDs = [
        null,
        undefined,
        '',
        ' ',
        'abc def', // spaces
        'abc@def', // special characters
        'abc<script>', // XSS attempt
        'abc\' OR 1=1--', // SQL injection
        'a'.repeat(101) // too long
      ];

      invalidIDs.forEach(id => {
        assert.throws(
          () => validateID(id),
          ValidationError,
          `Should reject invalid ID: ${id}`
        );
      });
    });

    it('should sanitize SQL injection patterns in IDs', () => {
      const maliciousID = "id'; DROP TABLE exercises; --";
      assert.throws(
        () => validateID(maliciousID),
        ValidationError,
        'Should reject SQL injection patterns'
      );
    });
  });

  describe('validateUsername', () => {
    it('should validate a valid username', () => {
      const validUsernames = ['user123', 'test_user', 'user-name', 'abc', 'a'.repeat(50)];
      validUsernames.forEach(username => {
        const result = validateUsername(username);
        assert.ok(result.length >= 3 && result.length <= 50);
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        null,
        undefined,
        '',
        'ab', // too short
        'a', // too short
        'a'.repeat(51), // too long
        'user name', // spaces
        'user@name', // special characters
        'user<script>alert(1)</script>', // XSS attempt
        'user\' OR \'1\'=\'1', // SQL injection
      ];

      invalidUsernames.forEach(username => {
        assert.throws(
          () => validateUsername(username),
          ValidationError,
          `Should reject invalid username: ${username}`
        );
      });
    });

    it('should trim whitespace from usernames', () => {
      const result = validateUsername('  user123  ');
      assert.strictEqual(result, 'user123');
    });
  });

  describe('validateExerciseType', () => {
    it('should validate a valid exercise type', () => {
      const validTypes = ['Running', 'Swimming', 'Cycling', 'Weight Training', 'Yoga'];
      validTypes.forEach(type => {
        const result = validateExerciseType(type);
        assert.ok(result.length >= 1 && result.length <= 100);
      });
    });

    it('should reject invalid exercise types', () => {
      const invalidTypes = [
        null,
        undefined,
        '',
        'a'.repeat(101), // too long
        'Running<script>', // XSS attempt
        'Exercise\' OR 1=1--', // SQL injection
        'Exercise@Type', // special characters not allowed
      ];

      invalidTypes.forEach(type => {
        assert.throws(
          () => validateExerciseType(type),
          ValidationError,
          `Should reject invalid exercise type: ${type}`
        );
      });
    });
  });

  describe('validateDescription', () => {
    it('should validate a valid description', () => {
      const validDescriptions = [
        'A good workout',
        'Long description ' + 'a'.repeat(500),
        null,
        undefined,
        ''
      ];
      validDescriptions.forEach(desc => {
        const result = validateDescription(desc);
        if (desc === null || desc === undefined || desc === '') {
          assert.strictEqual(result, null);
        } else {
          assert.ok(result.length <= 1000);
        }
      });
    });

    it('should reject descriptions that are too long', () => {
      const longDescription = 'a'.repeat(1001);
      assert.throws(
        () => validateDescription(longDescription),
        ValidationError,
        'Should reject descriptions over 1000 characters'
      );
    });

    it('should sanitize XSS attempts in descriptions', () => {
      const xssDescription = '<script>alert("XSS")</script>Workout';
      const result = validateDescription(xssDescription);
      // Should sanitize HTML/script tags
      assert.ok(!result.includes('<script>'));
      assert.ok(!result.includes('</script>'));
    });
  });

  describe('validateDuration', () => {
    it('should validate a valid duration', () => {
      const validDurations = [1, 30, 60, 120, 100000];
      validDurations.forEach(duration => {
        const result = validateDuration(duration);
        assert.strictEqual(result, duration);
      });
    });

    it('should accept string numbers and convert them', () => {
      const result = validateDuration('30');
      assert.strictEqual(result, 30);
    });

    it('should reject invalid durations', () => {
      const invalidDurations = [
        null,
        undefined,
        -1,
        0,
        100001, // too large
        'abc',
        'not a number',
        3.14, // not an integer
        NaN
      ];

      invalidDurations.forEach(duration => {
        assert.throws(
          () => validateDuration(duration),
          ValidationError,
          `Should reject invalid duration: ${duration}`
        );
      });
    });
  });

  describe('validateDate', () => {
    it('should validate a valid date', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31T10:30:00Z',
        '2024-01-01T00:00:00.000Z'
      ];
      validDates.forEach(date => {
        const result = validateDate(date);
        assert.ok(result);
      });
    });

    it('should reject invalid dates', () => {
      const invalidDates = [
        null,
        undefined,
        '',
        'not-a-date',
        '01-01-2024', // wrong format
        '2024-13-01', // invalid month
        '2024-01-32', // invalid day
        '2024/01/01', // wrong separator
        '2024-01-01T25:00:00Z' // invalid hour
      ];

      invalidDates.forEach(date => {
        assert.throws(
          () => validateDate(date),
          ValidationError,
          `Should reject invalid date: ${date}`
        );
      });
    });
  });

  describe('validateDateRange', () => {
    it('should validate a valid date range', () => {
      const result = validateDateRange('2024-01-01', '2024-01-31');
      assert.strictEqual(result.startDate, '2024-01-01');
      assert.strictEqual(result.endDate, '2024-01-31');
    });

    it('should reject invalid date ranges', () => {
      // End date before start date
      assert.throws(
        () => validateDateRange('2024-01-31', '2024-01-01'),
        ValidationError,
        'Should reject end date before start date'
      );

      // Date range too large
      assert.throws(
        () => validateDateRange('2024-01-01', '2025-02-01'),
        ValidationError,
        'Should reject date ranges over 365 days'
      );
    });
  });

  describe('validateAddExerciseInput', () => {
    it('should validate a valid exercise input', () => {
      const validInput = {
        username: 'testuser',
        exerciseType: 'Running',
        description: 'Morning run',
        duration: 30,
        date: '2024-01-01'
      };
      const result = validateAddExerciseInput(validInput);
      assert.strictEqual(result.username, 'testuser');
      assert.strictEqual(result.exerciseType, 'Running');
      assert.strictEqual(result.description, 'Morning run');
      assert.strictEqual(result.duration, 30);
      assert.strictEqual(result.date, '2024-01-01');
    });

    it('should reject invalid exercise inputs', () => {
      const invalidInputs = [
        null,
        undefined,
        {},
        { username: 'testuser' }, // missing required fields
        { username: 'ab', exerciseType: 'Running', duration: 30, date: '2024-01-01' }, // invalid username
        { username: 'testuser', exerciseType: '', duration: 30, date: '2024-01-01' }, // invalid exercise type
        { username: 'testuser', exerciseType: 'Running', duration: -1, date: '2024-01-01' }, // invalid duration
        { username: 'testuser', exerciseType: 'Running', duration: 30, date: 'invalid' } // invalid date
      ];

      invalidInputs.forEach(input => {
        assert.throws(
          () => validateAddExerciseInput(input),
          ValidationError,
          `Should reject invalid input: ${JSON.stringify(input)}`
        );
      });
    });

    it('should sanitize malicious input', () => {
      const maliciousInput = {
        username: "admin'; DROP TABLE users; --",
        exerciseType: 'Running',
        description: '<script>alert("XSS")</script>Workout',
        duration: 30,
        date: '2024-01-01'
      };
      
      const result = validateAddExerciseInput(maliciousInput);
      // Username should be sanitized and rejected or sanitized
      assert.ok(!result.username.includes('DROP'));
      // Description should be sanitized
      assert.ok(!result.description.includes('<script>'));
    });
  });

  describe('validateUpdateExerciseInput', () => {
    it('should validate a valid update input', () => {
      const validInput = {
        username: 'testuser',
        exerciseType: 'Swimming',
        description: 'Pool session',
        duration: 45,
        date: '2024-01-02'
      };
      const result = validateUpdateExerciseInput(validInput);
      assert.strictEqual(result.username, 'testuser');
      assert.strictEqual(result.exerciseType, 'Swimming');
      assert.strictEqual(result.duration, 45);
    });

    it('should reject invalid update inputs', () => {
      const invalidInput = {
        username: 'ab',
        exerciseType: 'Running',
        duration: 30,
        date: '2024-01-01'
      };
      assert.throws(
        () => validateUpdateExerciseInput(invalidInput),
        ValidationError,
        'Should reject invalid update input'
      );
    });
  });
});

describe('Input Sanitization Tests', () => {
  describe('sanitizeString', () => {
    it('should sanitize SQL injection patterns', () => {
      const malicious = "admin'; DROP TABLE users; --";
      const result = sanitizeString(malicious, { preventSQLInjection: true });
      assert.ok(!result.includes('DROP'));
      assert.ok(!result.includes('TABLE'));
    });

    it('should sanitize XSS attempts', () => {
      const xss = '<script>alert("XSS")</script>';
      const result = sanitizeString(xss, { preventXSS: true });
      assert.ok(!result.includes('<script>'));
      assert.ok(!result.includes('</script>'));
    });

    it('should remove HTML tags when specified', () => {
      const html = '<p>Test</p>';
      const result = sanitizeString(html, { removeHTML: true });
      assert.ok(!result.includes('<p>'));
      assert.ok(!result.includes('</p>'));
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(200);
      const result = sanitizeString(longString, { maxLength: 100 });
      assert.strictEqual(result.length, 100);
    });

    it('should handle null and undefined', () => {
      assert.strictEqual(sanitizeString(null), '');
      assert.strictEqual(sanitizeString(undefined), '');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string properties in an object', () => {
      const obj = {
        username: '<script>alert(1)</script>user',
        description: "Test'; DROP TABLE; --",
        count: 5
      };
      const result = sanitizeObject(obj);
      assert.ok(!result.username.includes('<script>'));
      assert.ok(!result.description.includes('DROP'));
      assert.strictEqual(result.count, 5); // Non-string values preserved
    });

    it('should sanitize nested objects', () => {
      const obj = {
        user: {
          name: '<script>alert(1)</script>',
          email: 'test@test.com'
        }
      };
      const result = sanitizeObject(obj);
      assert.ok(!result.user.name.includes('<script>'));
    });

    it('should sanitize arrays', () => {
      const arr = ['<script>alert(1)</script>', 'normal'];
      const result = sanitizeObject(arr);
      assert.ok(!result[0].includes('<script>'));
      assert.strictEqual(result[1], 'normal');
    });
  });

  describe('sanitizeGraphQLInput', () => {
    it('should sanitize GraphQL input with field-specific rules', () => {
      const input = {
        username: '<script>alert(1)</script>user',
        description: '<p>HTML description</p>',
        count: 5
      };
      const rules = {
        username: { preventXSS: true, maxLength: 50 },
        description: { removeHTML: true }
      };
      const result = sanitizeGraphQLInput(input, rules);
      assert.ok(!result.username.includes('<script>'));
      assert.ok(!result.description.includes('<p>'));
      assert.strictEqual(result.count, 5);
    });
  });
});

describe('Malformed Input Attack Tests', () => {
  describe('SQL Injection Attempts', () => {
    const sqlInjectionAttempts = [
      "'; DROP TABLE exercises; --",
      "' OR '1'='1",
      "' OR 1=1--",
      "admin'--",
      "' UNION SELECT * FROM users--",
      "'; DELETE FROM exercises; --"
    ];

    sqlInjectionAttempts.forEach((malicious, index) => {
      it(`should reject SQL injection attempt ${index + 1}`, () => {
        assert.throws(
          () => validateUsername(malicious),
          ValidationError,
          `Should reject SQL injection: ${malicious}`
        );
      });
    });
  });

  describe('XSS Attempts', () => {
    const xssAttempts = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload=alert(1)>'
    ];

    xssAttempts.forEach((malicious, index) => {
      it(`should sanitize XSS attempt ${index + 1} in descriptions`, () => {
        const result = validateDescription(malicious);
        // Should sanitize but not throw (descriptions can contain some HTML patterns)
        assert.ok(result !== null);
        // Should not contain dangerous patterns
        assert.ok(!result.includes('<script'));
        assert.ok(!result.includes('onerror='));
      });
    });
  });

  describe('Buffer Overflow / Length Attacks', () => {
    it('should reject extremely long inputs', () => {
      const longString = 'a'.repeat(10000);
      assert.throws(
        () => validateUsername(longString),
        ValidationError,
        'Should reject extremely long usernames'
      );
    });

    it('should reject empty strings where required', () => {
      assert.throws(
        () => validateUsername(''),
        ValidationError,
        'Should reject empty username'
      );
      assert.throws(
        () => validateID(''),
        ValidationError,
        'Should reject empty ID'
      );
    });
  });

  describe('Type Confusion Attacks', () => {
    it('should reject non-string types for string fields', () => {
      assert.throws(
        () => validateUsername(123),
        ValidationError,
        'Should reject number for username'
      );
      assert.throws(
        () => validateUsername({}),
        ValidationError,
        'Should reject object for username'
      );
      assert.throws(
        () => validateUsername([]),
        ValidationError,
        'Should reject array for username'
      );
    });

    it('should reject non-number types for number fields', () => {
      assert.throws(
        () => validateDuration('not a number'),
        ValidationError,
        'Should reject string for duration'
      );
      assert.throws(
        () => validateDuration(null),
        ValidationError,
        'Should reject null for duration'
      );
    });
  });

  describe('Special Character Attacks', () => {
    it('should handle null bytes', () => {
      const withNull = 'user\0name';
      assert.throws(
        () => validateUsername(withNull),
        ValidationError,
        'Should reject null bytes'
      );
    });

    it('should handle control characters', () => {
      const withControl = 'user\x00name';
      assert.throws(
        () => validateUsername(withControl),
        ValidationError,
        'Should reject control characters'
      );
    });
  });
});

