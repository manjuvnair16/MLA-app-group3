import { ActivityService } from '../datasource/activityService.js';
import { handleServiceError, retryWithFallback } from '../../../utils/errorHandler.js';
import { 
  validateID, 
  validateAddExerciseInput, 
  validateUpdateExerciseInput,
} from '../../../utils/validation.js';

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
      // Validate ID input
      const validatedID = validateID(id);
      const result = await activityService.getExerciseById(validatedID, context);
      return result;
    } catch (error) {
      handleServiceError(error, 'get exercise');
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
      // Validate and sanitize input
      const validatedInput = validateAddExerciseInput(input);
      
      return await retryWithFallback(async () => {
        return await activityService.addExercise(validatedInput, context);
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
      // Validate ID and input
      const validatedID = validateID(id);
      const validatedInput = validateUpdateExerciseInput(input);
      
      return await retryWithFallback(async () => {
        return await activityService.updateExercise(validatedID, validatedInput, context);
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
      // Validate ID input
      const validatedID = validateID(id);
      
      return await retryWithFallback(async () => {
        return await activityService.deleteExercise(validatedID, context);
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
