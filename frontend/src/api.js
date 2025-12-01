import axios from "axios";

function getUrl() {
  if (process.env.CODESPACES === "true") {
    return `https://${process.env.CODESPACE_NAME}-5300.app.github.dev`;
  } else {
    return `http://localhost:5300`;
  }
}

const baseURL = getUrl();

const api = axios.create({
  baseURL,
});

// Include JWT in the Authorization header of requests
api.interceptors.request.use((config) => {
  const jwt = localStorage.getItem("jwt");
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});

export const trackExercise = (payload) => api.post(`/exercises/add`, payload);
export const getCustomActivities = (username) => api.get(`/exercises/custom-activities/${username}`);
export const createCustomActivity = (payload) => api.post(`/exercises/custom-activities`, payload);
export const deleteCustomActivity = (activityId) => api.delete(`/exercises/custom-activities/${activityId}`);