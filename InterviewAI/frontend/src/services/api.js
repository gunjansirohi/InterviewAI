
import axios from 'axios';

const apiBaseUrl = (
  import.meta.env.VITE_API_URL ||
  'https://interview-ai-muye.vercel.app/api'
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('interviewai_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
