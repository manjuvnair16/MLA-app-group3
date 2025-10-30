import { ActivityService } from '../datasource/activityService.js';
import { handleServiceError, retryWithFallback } from '../../../utils/errorHandler.js';

/**
 * Activity Service Instance
 */
const activityService = new ActivityService();

/**
 * Query Resolvers for Activity Service
 */
const queryResolvers = {
  /**
   * Get all exercises
   */
  exercises: async (_, __, context) => {
    try {
      const result = await activityService.getAllExercises(context);
      return result || [];
    } catch (error) {
      console.error('Error in exercises resolver:', error);
      return [];
    }
  },

  /**
   * Get exercise by ID
   */
  exercise: async (_, { id }, context) => {
    try {
      const result = await activityService.getExerciseById(id, context);
      return result;
    } catch (error) {
      console.error(`Error in exercise resolver for ID ${id}:`, error);
      return null;
    }
  }
};

/**
 * Mutation Resolvers for Activity Service
 */
const mutationResolvers = {
  /**
   * Add a new exercise
   */
  addExercise: async (_, { input }, context) => {
    try {
      return await retryWithFallback(async () => {
        return await activityService.addExercise(input, context);
      });
    } catch (error) {
      handleServiceError(error, 'add exercise');
    }
  },

  /**
   * Update an existing exercise
   */
  updateExercise: async (_, { id, input }, context) => {
    try {
      return await retryWithFallback(async () => {
        return await activityService.updateExercise(id, input, context);
      });
    } catch (error) {
      handleServiceError(error, 'update exercise');
    }
  },

  /**
   * Delete an exercise
   */
  deleteExercise: async (_, { id }, context) => {
    try {
      return await retryWithFallback(async () => {
        return await activityService.deleteExercise(id, context);
      });
    } catch (error) {
      handleServiceError(error, 'delete exercise');
    }
  }
};

/**
 * Activity Resolvers Export
 */
export const activityResolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers
};
