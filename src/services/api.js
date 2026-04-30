import axios from 'axios';
import { sk } from '../utils/storageKeys';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const API = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// Attach access token from tab-scoped sessionStorage
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(sk('authToken'));
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// Handle 401 with refresh + queue
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !originalRequest._retry) {
      const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');
      if (isRefreshEndpoint) {
        sessionStorage.removeItem(sk('authToken'));
        sessionStorage.removeItem(sk('refreshToken'));
        sessionStorage.removeItem(sk('user'));
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshToken = sessionStorage.getItem(sk('refreshToken'));
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(
          `${API_BASE}/auth/refresh`,
          { refreshToken },
          { withCredentials: false }
        );

        if (res.data?.success) {
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          sessionStorage.setItem(sk('authToken'), accessToken);
          sessionStorage.setItem(sk('refreshToken'), newRefreshToken);
          API.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return API.request(originalRequest);
        }
        throw new Error('Refresh failed');
      } catch (err) {
        processQueue(err, null);
        sessionStorage.removeItem(sk('authToken'));
        sessionStorage.removeItem(sk('refreshToken'));
        sessionStorage.removeItem(sk('user'));
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;
