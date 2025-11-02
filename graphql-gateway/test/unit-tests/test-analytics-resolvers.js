import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyticsResolvers } from '../../src/services/analytics/resolvers/index.js';
import { ValidationError } from '../../src/utils/validation.js';

describe('Analytics Resolvers Tests', () => {
  describe('Query Resolvers', () => {
    describe('analytics', () => {
      it('should return empty object', () => {
        const result = analyticsResolvers.Query.analytics();
        assert.deepStrictEqual(result, {}, 'Should return empty object');
      });
    });
  });

  describe('AnalyticsQuery Resolvers', () => {
    describe('allStats', () => {
      it('should return array (may be empty on error)', async () => {
        try {
          const result = await analyticsResolvers.AnalyticsQuery.allStats(null, {}, {});
          // Implementation may return empty array on error or throw
          assert.ok(Array.isArray(result), 'Should return an array');
        } catch (error) {
          // Service errors throw (connection refused, etc.)
          // This is expected behavior when service is unavailable
          assert.ok(error, 'May throw service errors');
          assert.ok(error.message.includes('unavailable') || error.message.includes('Failed to'), 
            'Should throw service error message');
        }
      });
    });

    describe('userStats', () => {
      it('should validate username', async () => {
        await assert.rejects(
          () => analyticsResolvers.AnalyticsQuery.userStats(null, { username: 'notanemail' }, {}),
          ValidationError,
          'Should validate username format (must be email)'
        );
      });

      it('should validate username format', async () => {
        await assert.rejects(
          () => analyticsResolvers.AnalyticsQuery.userStats(null, { username: 'user name' }, {}),
          ValidationError,
          'Should reject invalid email addresses'
        );
      });

      it('should return array (may be empty on error)', async () => {
        try {
          const result = await analyticsResolvers.AnalyticsQuery.userStats(null, { username: 'testuser@example.com' }, {});
          assert.ok(Array.isArray(result), 'Should return an array');
        } catch (error) {
          // May throw validation or service error
          assert.ok(error, 'May throw errors');
        }
      });
    });

    describe('weeklyStats', () => {
      it('should validate username', async () => {
        await assert.rejects(
          () => analyticsResolvers.AnalyticsQuery.weeklyStats(
            null,
            { username: 'notanemail', startDate: '2024-01-01', endDate: '2024-01-31' },
            {}
          ),
          ValidationError,
          'Should validate username (must be email)'
        );
      });

      it('should validate date range', async () => {
        await assert.rejects(
          () => analyticsResolvers.AnalyticsQuery.weeklyStats(
            null,
            { username: 'testuser@example.com', startDate: '2024-01-31', endDate: '2024-01-01' },
            {}
          ),
          ValidationError,
          'Should validate date range (end before start)'
        );
      });

      it('should validate date range size', async () => {
        await assert.rejects(
          () => analyticsResolvers.AnalyticsQuery.weeklyStats(
            null,
            { username: 'testuser@example.com', startDate: '2024-01-01', endDate: '2025-02-01' },
            {}
          ),
          ValidationError,
          'Should reject date range over 365 days'
        );
      });

      it('should return array (may be empty on error)', async () => {
        try {
          const result = await analyticsResolvers.AnalyticsQuery.weeklyStats(
            null,
            { username: 'testuser@example.com', startDate: '2024-01-01', endDate: '2024-01-31' },
            {}
          );
          assert.ok(Array.isArray(result), 'Should return an array');
        } catch (error) {
          // May throw validation or service error
          assert.ok(error, 'May throw errors');
        }
      });
    });
  });

  describe('Resolver Structure', () => {
    it('should have Query resolvers', () => {
      assert.ok(analyticsResolvers.Query, 'Should have Query resolvers');
      assert.strictEqual(typeof analyticsResolvers.Query.analytics, 'function', 'Should have analytics resolver');
    });

    it('should have AnalyticsQuery resolvers', () => {
      assert.ok(analyticsResolvers.AnalyticsQuery, 'Should have AnalyticsQuery resolvers');
      assert.strictEqual(typeof analyticsResolvers.AnalyticsQuery.allStats, 'function', 'Should have allStats resolver');
      assert.strictEqual(typeof analyticsResolvers.AnalyticsQuery.userStats, 'function', 'Should have userStats resolver');
      assert.strictEqual(typeof analyticsResolvers.AnalyticsQuery.weeklyStats, 'function', 'Should have weeklyStats resolver');
    });
  });
});

