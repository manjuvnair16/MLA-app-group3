import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/auth";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Include JWT in the Authorization header of requests
api.interceptors.request.use((config) => {
  const jwt = localStorage.getItem("jwt");
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});

export const getUserById = (id) => {
  return api.get(`/user/${id}`);
};

export const getUserByEmail = (email) => {
  return api.get(`/user`, {
    params: { email },
  });
};

export const trackExercise = (payload) => {
  return api.post(`/exercises/add`, payload);
};
