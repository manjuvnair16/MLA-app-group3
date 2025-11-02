import { ValidationError } from './validation.js';

export const handleServiceError = (error, operation) => {
  // Handle ValidationError instances - re-throw as-is to preserve validation details
  if (error instanceof ValidationError) {
    console.warn(`GraphQL ${operation} Validation Error:`, {
      message: error.message,
      field: error.field,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    // Re-throw ValidationError to preserve field and code information
    throw error;
  }

  // Handle service/network errors
  console.error(`GraphQL ${operation} Error:`, {
    message: error.message,
    status: error.response?.status,
    url: error.config?.url,
    timestamp: new Date().toISOString()
  });

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    throw new Error(`Activity service is currently unavailable. Please try again later.`);
  }
  
  if (error.response?.status === 404) {
    throw new Error(`Exercise not found`);
  }
  
  if (error.response?.status >= 500) {
    throw new Error(`Activity service error. Please try again later.`);
  }
  
  throw new Error(`Failed to ${operation}: ${error.message}`);
};

export const retryWithFallback = async (operation, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
