import axios, { InternalAxiosRequestConfig } from 'axios';

export const BASE_URL = `http://${import.meta.env.VITE_API_ENDPOINT || 'localhost:8001'}`;
const axiosInstance = axios.create({
  baseURL: BASE_URL
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig<any>) => {
    // eslint-disable-next-line no-constant-condition
    if (['put', 'delete', 'post', 'get']) {
      try {
        config.headers['Access-Control-Allow-Origin'] = '*';
      } catch (e) {
        console.log(e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export default axiosInstance;
