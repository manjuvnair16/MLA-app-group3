import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { ActivityService } from '../../src/services/activity/datasource/activityService.js';
import axios from 'axios';

// Mock axios
mock.method(axios, 'get', async (url, config) => {
  throw new Error('Mock not set up');
});

mock.method(axios, 'post', async (url, data, config) => {
  throw new Error('Mock not set up');
});

mock.method(axios, 'put', async (url, data, config) => {
  throw new Error('Mock not set up');
});

mock.method(axios, 'delete', async (url, config) => {
  throw new Error('Mock not set up');
});

describe('ActivityService Tests', () => {
  let activityService;
  let originalGet;
  let originalPost;
  let originalPut;
  let originalDelete;

  beforeEach(() => {
    activityService = new ActivityService();
    originalGet = axios.get;
    originalPost = axios.post;
    originalPut = axios.put;
    originalDelete = axios.delete;
  });

  afterEach(() => {
    axios.get = originalGet;
    axios.post = originalPost;
    axios.put = originalPut;
    axios.delete = originalDelete;
  });

  describe('getAllExercises', () => {
    it('should return exercises array', async () => {
      const mockExercises = [
        { _id: '1', username: 'user1', exerciseType: 'Running', duration: 30 },
        { _id: '2', username: 'user2', exerciseType: 'Swimming', duration: 45 }
      ];

      axios.get = async (url, config) => {
        return { data: mockExercises };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.getAllExercises(context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 2, 'Should return 2 exercises');
      assert.strictEqual(result[0].id, '1', 'Should map _id to id');
      assert.strictEqual(result[0].username, 'user1', 'Should include other fields');
    });

    it('should return empty array when no data', async () => {
      axios.get = async (url, config) => {
        return { data: null };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.getAllExercises(context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 0, 'Should return empty array');
    });

    it('should return empty array when data is not an array', async () => {
      axios.get = async (url, config) => {
        return { data: {} };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.getAllExercises(context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 0, 'Should return empty array');
    });

    it('should throw error on network failure', async () => {
      axios.get = async (url, config) => {
        throw new Error('Network error');
      };

      const context = { authHeader: 'Bearer token' };
      await assert.rejects(
        () => activityService.getAllExercises(context),
        (err) => err.message === 'Network error',
        'Should throw network error'
      );
    });
  });

  describe('getExerciseById', () => {
    it('should return exercise by id', async () => {
      const mockExercise = { _id: '1', username: 'user1', exerciseType: 'Running', duration: 30 };

      axios.get = async (url, config) => {
        return { data: mockExercise };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.getExerciseById('1', context);

      assert.ok(result, 'Should return exercise');
      assert.strictEqual(result.id, '1', 'Should map _id to id');
      assert.strictEqual(result.username, 'user1', 'Should include fields');
    });

    it('should return null when exercise not found (404)', async () => {
      const error = new Error('Not found');
      error.response = { status: 404 };

      axios.get = async (url, config) => {
        throw error;
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.getExerciseById('nonexistent', context);

      assert.strictEqual(result, null, 'Should return null for 404');
    });

    it('should throw error for other HTTP errors', async () => {
      const error = new Error('Server error');
      error.response = { status: 500 };

      axios.get = async (url, config) => {
        throw error;
      };

      const context = { authHeader: 'Bearer token' };
      await assert.rejects(
        () => activityService.getExerciseById('1', context),
        (err) => err.response.status === 500,
        'Should throw non-404 errors'
      );
    });

    it('should return null when no data returned', async () => {
      axios.get = async (url, config) => {
        return { data: null };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.getExerciseById('1', context);

      assert.strictEqual(result, null, 'Should return null when no data');
    });
  });

  describe('addExercise', () => {
    it('should add exercise and return it', async () => {
      const newExercise = { _id: '3', username: 'user3', exerciseType: 'Cycling', duration: 60 };
      const allExercises = [
        { _id: '1', username: 'user1' },
        { _id: '2', username: 'user2' },
        newExercise
      ];

      let postCalled = false;
      axios.post = async (url, data, config) => {
        postCalled = true;
        return { data: { success: true } };
      };

      axios.get = async (url, config) => {
        if (postCalled) {
          return { data: allExercises };
        }
        return { data: [] };
      };

      const context = { authHeader: 'Bearer token' };
      const input = { username: 'user3', exerciseType: 'Cycling', duration: 60, date: '2024-01-01' };
      const result = await activityService.addExercise(input, context);

      assert.ok(result, 'Should return exercise');
      assert.strictEqual(result.id, '3', 'Should return last exercise');
    });
  });

  describe('updateExercise', () => {
    it('should update exercise and return updated one', async () => {
      const updatedExercise = { _id: '1', username: 'user1', exerciseType: 'Swimming', duration: 45 };

      axios.put = async (url, data, config) => {
        return { data: { success: true } };
      };

      axios.get = async (url, config) => {
        return { data: updatedExercise };
      };

      const context = { authHeader: 'Bearer token' };
      const input = { exerciseType: 'Swimming', duration: 45 };
      const result = await activityService.updateExercise('1', input, context);

      assert.ok(result, 'Should return updated exercise');
      assert.strictEqual(result.id, '1', 'Should return exercise with correct id');
      assert.strictEqual(result.exerciseType, 'Swimming', 'Should have updated fields');
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise and return message', async () => {
      axios.delete = async (url, config) => {
        return { data: { message: 'Exercise deleted successfully' } };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.deleteExercise('1', context);

      assert.strictEqual(result, 'Exercise deleted successfully', 'Should return deletion message');
    });

    it('should return default message when no message in response', async () => {
      axios.delete = async (url, config) => {
        return { data: {} };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await activityService.deleteExercise('1', context);

      assert.strictEqual(result, 'Exercise deleted successfully', 'Should return default message');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is available', async () => {
      axios.get = async (url, config) => {
        return { status: 200 };
      };

      const result = await activityService.healthCheck();

      assert.strictEqual(result.status, 'healthy', 'Should return healthy status');
      assert.strictEqual(result.activityService, 'connected', 'Should indicate connected');
    });

    it('should return degraded status when service is unavailable', async () => {
      axios.get = async (url, config) => {
        throw new Error('Connection refused');
      };

      const result = await activityService.healthCheck();

      assert.strictEqual(result.status, 'degraded', 'Should return degraded status');
      assert.strictEqual(result.activityService, 'disconnected', 'Should indicate disconnected');
      assert.ok(result.error, 'Should include error message');
    });
  });
});

