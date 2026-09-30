import axios from 'axios';
import { message } from 'antd';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Error handling
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let errMsg = '网络请求失败，请检查网络连接';
    if (error.response) {
      if (error.response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('未登录或登录已过期'));
      }

      if (error.response.data && error.response.data.error) {
        errMsg = error.response.data.error;
      } else {
        errMsg = `服务错误 (${error.response.status}): ${error.message}`;
      }
    } else if (error.message) {
      errMsg = error.message;
    }

    message.error(errMsg, 5);
    return Promise.reject(new Error(errMsg));
  }
);

export default client;
