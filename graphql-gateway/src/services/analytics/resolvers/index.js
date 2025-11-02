import { AnalyticsService } from '../datasource/analyticsService.js';
import { handleServiceError, retryWithFallback } from '../../../utils/errorHandler.js';
import { 
  validateUsername, 
  validateDateRange,
} from '../../../utils/validation.js';

/**
 * Analytics Service Instance
 */
const analyticsService = new AnalyticsService();

/**
 * Query Resolvers for Analytics Service
 */
const queryResolvers = {
  /**
   * Analytics query entry point
   * Returns empty object to access AnalyticsQuery fields
   */
  analytics: () => ({}),
};

/**
 * Analytics Query Resolvers
 */
const analyticsQueryResolvers = {
  /**
   * Get all user statistics
   */
  allStats: async (_, __, context) => {
    try {
      return await retryWithFallback(async () => {
        return await analyticsService.getAllStats(context);
      });
    } catch (error) {
      handleServiceError(error, 'fetch all stats');
      return []; // Return empty array instead of null
    }
  },
  
  /**
   * Get statistics for a specific user
   */
  userStats: async (_, { username }, context) => {
    try {
      // Validate username input
      const validatedUsername = validateUsername(username);
      
      return await retryWithFallback(async () => {
        return await analyticsService.getUserStats(validatedUsername, context);
      });
    } catch (error) {
      handleServiceError(error, 'fetch user stats');
      return []; // Return empty array instead of null
    }
  },
  
  /**
   * Get weekly statistics for a user within date range
   */
  weeklyStats: async (_, { username, startDate, endDate }, context) => {
    try {
      // Validate username and date range inputs
      const validatedUsername = validateUsername(username);
      const validatedDates = validateDateRange(startDate, endDate);
      
      return await retryWithFallback(async () => {
        return await analyticsService.getWeeklyStats(
          validatedUsername, 
          validatedDates.startDate, 
          validatedDates.endDate, 
          context
        );
      });
    } catch (error) {
      handleServiceError(error, 'fetch weekly stats');
      return []; // Return empty array instead of null
    }
  }
};

/**
 * Analytics Resolvers Export
 */
export const analyticsResolvers = {
  Query: queryResolvers,
  AnalyticsQuery: analyticsQueryResolvers
};
