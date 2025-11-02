import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { AnalyticsService } from '../../src/services/analytics/datasource/analyticsService.js';
import axios from 'axios';

describe('AnalyticsService Tests', () => {
  let analyticsService;
  let originalGet;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    originalGet = axios.get;
  });

  afterEach(() => {
    axios.get = originalGet;
  });

  describe('getAllStats', () => {
    it('should return stats array', async () => {
      const mockStats = [
        { username: 'user1', totalExercises: 10, totalDuration: 300 },
        { username: 'user2', totalExercises: 5, totalDuration: 150 }
      ];

      axios.get = async (url, config) => {
        return { data: { stats: mockStats } };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await analyticsService.getAllStats(context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 2, 'Should return 2 stats');
      assert.strictEqual(result[0].username, 'user1', 'Should include stats data');
    });

    it('should return empty array when no stats', async () => {
      axios.get = async (url, config) => {
        return { data: {} };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await analyticsService.getAllStats(context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 0, 'Should return empty array');
    });

    it('should return empty array when stats is null', async () => {
      axios.get = async (url, config) => {
        return { data: { stats: null } };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await analyticsService.getAllStats(context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 0, 'Should return empty array');
    });

    it('should throw error on network failure', async () => {
      axios.get = async (url, config) => {
        throw new Error('Network error');
      };

      const context = { authHeader: 'Bearer token' };
      await assert.rejects(
        () => analyticsService.getAllStats(context),
        (err) => err.message === 'Network error',
        'Should throw network error'
      );
    });
  });

  describe('getUserStats', () => {
    it('should return user stats', async () => {
      const mockStats = [
        { date: '2024-01-01', exercises: 5, duration: 150 },
        { date: '2024-01-02', exercises: 3, duration: 90 }
      ];

      axios.get = async (url, config) => {
        return { data: { stats: mockStats } };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await analyticsService.getUserStats('user1', context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 2, 'Should return 2 stats');
    });

    it('should return empty array when no stats', async () => {
      axios.get = async (url, config) => {
        return { data: {} };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await analyticsService.getUserStats('user1', context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 0, 'Should return empty array');
    });
  });

  describe('getWeeklyStats', () => {
    it('should return weekly stats with date range', async () => {
      const mockStats = [
        { week: '2024-W01', exercises: 10, duration: 300 }
      ];

      axios.get = async (url, config) => {
        assert.ok(config.params, 'Should include params');
        assert.strictEqual(config.params.user, 'user1', 'Should include user param');
        assert.strictEqual(config.params.start, '2024-01-01', 'Should include start date');
        assert.strictEqual(config.params.end, '2024-01-31', 'Should include end date');
        return { data: { stats: mockStats } };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await analyticsService.getWeeklyStats('user1', '2024-01-01', '2024-01-31', context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 1, 'Should return stats');
    });

    it('should return empty array when no stats', async () => {
      axios.get = async (url, config) => {
        return { data: {} };
      };

      const context = { authHeader: 'Bearer token' };
      const result = await analyticsService.getWeeklyStats('user1', '2024-01-01', '2024-01-31', context);

      assert.ok(Array.isArray(result), 'Should return an array');
      assert.strictEqual(result.length, 0, 'Should return empty array');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is available', async () => {
      axios.get = async (url, config) => {
        return { status: 200 };
      };

      const result = await analyticsService.healthCheck();

      assert.strictEqual(result.status, 'healthy', 'Should return healthy status');
      assert.strictEqual(result.analyticsService, 'connected', 'Should indicate connected');
    });

    it('should return degraded status when service is unavailable', async () => {
      axios.get = async (url, config) => {
        throw new Error('Connection refused');
      };

      const result = await analyticsService.healthCheck();

      assert.strictEqual(result.status, 'degraded', 'Should return degraded status');
      assert.strictEqual(result.analyticsService, 'disconnected', 'Should indicate disconnected');
      assert.ok(result.error, 'Should include error message');
    });
  });
});

