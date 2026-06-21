import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Auth rides in an httpOnly cookie sent automatically with every request
// (withCredentials). No token is read or stored by JavaScript.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default api;
