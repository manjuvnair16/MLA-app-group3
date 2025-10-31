import axios from 'axios';

const ACTIVITY_URL = process.env.ACTIVITY_URL || "http://activity-tracking:5300";

export class ActivityService {
  constructor() {
    this.baseURL = ACTIVITY_URL;
  }

  async getAllExercises(context) {
    try {
      const response = await axios.get(`${this.baseURL}/exercises`, {
        headers: { Authorization: context.authHeader },
        timeout: 5000
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        console.log('No exercises data returned or data is not an array');
        return [];
      }
      
      return response.data.map(e => ({ id: e._id, ...e }));
    } catch (error) {
      console.error('Error fetching all exercises:', error.message);
      throw error;
    }
  }

  async getExerciseById(id, context) {
    try {
      const response = await axios.get(`${this.baseURL}/exercises/${id}`, {
        headers: { Authorization: context.authHeader },
        timeout: 5000
      });
      
      if (!response.data) {
        console.log(`No data returned for exercise ID: ${id}`);
        return null;
      }
      
      const data = response.data;
      console.log(`Exercise data for ID ${id}:`, data);
      
      return { id: data._id, ...data };
    } catch (error) {
      console.error(`Error fetching exercise ${id}:`, error.message);
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async addExercise(input, context) {
    await axios.post(`${this.baseURL}/exercises/add`, input, {
      headers: { Authorization: context.authHeader },
      timeout: 10000
    });
    const all = await axios.get(`${this.baseURL}/exercises`, {
      headers: { Authorization: context.authHeader },
      timeout: 5000
    });
    const last = all.data[all.data.length - 1];
    return { id: last._id, ...last };
  }

  async updateExercise(id, input, context) {
    await axios.put(`${this.baseURL}/exercises/update/${id}`, input, {
      headers: { Authorization: context.authHeader },
      timeout: 10000
    });
    const { data } = await axios.get(`${this.baseURL}/exercises/${id}`, {
      headers: { Authorization: context.authHeader },
      timeout: 5000
    });
    return { id: data._id, ...data };
  }

  async deleteExercise(id, context) {
    const { data } = await axios.delete(`${this.baseURL}/exercises/${id}`, {
      headers: { Authorization: context.authHeader },
      timeout: 10000
    });
    return data.message || "Exercise deleted successfully";
  }

  async healthCheck() {
    try {
      await axios.get(`${this.baseURL}/health`, { timeout: 3000 });
      return { status: 'healthy', activityService: 'connected' };
    } catch (error) {
      return { 
        status: 'degraded', 
        activityService: 'disconnected',
        error: error.message 
      };
    }
  }
}
