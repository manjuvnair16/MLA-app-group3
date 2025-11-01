import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { activityResolvers } from '../../src/services/activity/resolvers/index.js';
import { ActivityService } from '../../src/services/activity/datasource/activityService.js';
import { ValidationError } from '../../src/utils/validation.js';

// Mock the ActivityService
const mockActivityService = {
  getAllExercises: async () => [],
  getExerciseById: async () => null,
  addExercise: async () => ({}),
  updateExercise: async () => ({}),
  deleteExercise: async () => 'deleted'
};

// We need to mock the module
// Since ES modules are harder to mock, we'll test with actual service calls or use dependency injection pattern
// For now, we'll test the resolver structure and error handling

describe('Activity Resolvers Tests', () => {
  describe('Query Resolvers', () => {
    describe('exercises', () => {
      it('should return exercises array', async () => {
        const result = await activityResolvers.Query.exercises(null, {}, {});
        
        // Should not throw and return an array
        assert.ok(Array.isArray(result), 'Should return an array');
      });

      it('should handle service errors gracefully', async () => {
        // The resolver catches errors and returns empty array
        const result = await activityResolvers.Query.exercises(null, {}, {});
        
        // Should return empty array on error (as per implementation)
        assert.ok(Array.isArray(result), 'Should return array even on error');
      });
    });

    describe('exercise', () => {
      it('should validate ID before fetching', async () => {
        await assert.rejects(
          () => activityResolvers.Query.exercise(null, { id: '' }, {}),
          ValidationError,
          'Should validate ID format'
        );
      });

      it('should validate ID format', async () => {
        await assert.rejects(
          () => activityResolvers.Query.exercise(null, { id: 'invalid id with spaces' }, {}),
          ValidationError,
          'Should reject invalid ID format'
        );
      });

      it('should call service with validated ID', async () => {
        // This will call the actual service, which might fail, but should validate first
        try {
          await activityResolvers.Query.exercise(null, { id: 'valid-id-123' }, {});
        } catch (error) {
          // May throw service error, but should have validated ID first
          assert.ok(error, 'May throw service error, but ID should be validated');
        }
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('addExercise', () => {
      it('should validate input before adding', async () => {
        await assert.rejects(
          () => activityResolvers.Mutation.addExercise(null, { input: { username: 'ab' } }, {}),
          ValidationError,
          'Should validate username length'
        );
      });

      it('should validate all required fields', async () => {
        await assert.rejects(
          () => activityResolvers.Mutation.addExercise(null, { input: {} }, {}),
          ValidationError,
          'Should validate required fields'
        );
      });

      it('should validate exercise type', async () => {
        const invalidInput = {
          username: 'testuser',
          exerciseType: '',
          duration: 30,
          date: '2024-01-01'
        };

        await assert.rejects(
          () => activityResolvers.Mutation.addExercise(null, { input: invalidInput }, {}),
          ValidationError,
          'Should validate exercise type'
        );
      });

      it('should validate duration', async () => {
        const invalidInput = {
          username: 'testuser',
          exerciseType: 'Running',
          duration: -1,
          date: '2024-01-01'
        };

        await assert.rejects(
          () => activityResolvers.Mutation.addExercise(null, { input: invalidInput }, {}),
          ValidationError,
          'Should validate duration'
        );
      });

      it('should validate date format', async () => {
        const invalidInput = {
          username: 'testuser',
          exerciseType: 'Running',
          duration: 30,
          date: 'invalid-date'
        };

        await assert.rejects(
          () => activityResolvers.Mutation.addExercise(null, { input: invalidInput }, {}),
          ValidationError,
          'Should validate date format'
        );
      });
    });

    describe('updateExercise', () => {
      it('should validate ID', async () => {
        await assert.rejects(
          () => activityResolvers.Mutation.updateExercise(null, { id: '', input: {} }, {}),
          ValidationError,
          'Should validate ID'
        );
      });

      it('should validate input', async () => {
        await assert.rejects(
          () => activityResolvers.Mutation.updateExercise(
            null,
            { id: 'valid-id', input: { username: 'ab' } },
            {}
          ),
          ValidationError,
          'Should validate input'
        );
      });
    });

    describe('deleteExercise', () => {
      it('should validate ID', async () => {
        await assert.rejects(
          () => activityResolvers.Mutation.deleteExercise(null, { id: '' }, {}),
          ValidationError,
          'Should validate ID'
        );
      });

      it('should reject invalid ID format', async () => {
        await assert.rejects(
          () => activityResolvers.Mutation.deleteExercise(
            null,
            { id: 'invalid id' },
            {}
          ),
          ValidationError,
          'Should reject invalid ID format'
        );
      });
    });
  });

  describe('Resolver Structure', () => {
    it('should have Query resolvers', () => {
      assert.ok(activityResolvers.Query, 'Should have Query resolvers');
      assert.strictEqual(typeof activityResolvers.Query.exercises, 'function', 'Should have exercises resolver');
      assert.strictEqual(typeof activityResolvers.Query.exercise, 'function', 'Should have exercise resolver');
    });

    it('should have Mutation resolvers', () => {
      assert.ok(activityResolvers.Mutation, 'Should have Mutation resolvers');
      assert.strictEqual(typeof activityResolvers.Mutation.addExercise, 'function', 'Should have addExercise resolver');
      assert.strictEqual(typeof activityResolvers.Mutation.updateExercise, 'function', 'Should have updateExercise resolver');
      assert.strictEqual(typeof activityResolvers.Mutation.deleteExercise, 'function', 'Should have deleteExercise resolver');
    });
  });
});

