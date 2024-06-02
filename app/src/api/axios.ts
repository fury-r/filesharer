import axios, { InternalAxiosRequestConfig } from "axios";

export const BASE_URL =
  import.meta.env.REACT_APP_API_ENDPOINT || "http://192.168.0.101:8000";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig<any>) => {
    // eslint-disable-next-line no-constant-condition
    if (["put", "delete", "post", "get"]) {
      try {
        config.headers["Access-Control-Allow-Origin"] = "*";
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
