import axios from "axios";
import { API_BASE_URL } from "@/lib/env";

const apiRag = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiRag.interceptors.request.use((config) => {
  console.log(
    "[apiRag] →",
    config.method?.toUpperCase(),
    config.url,
    config.params ?? "",
  );
  return config;
});

apiRag.interceptors.response.use(
  (response) => {
    console.log("[apiRag] ←", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log("[apiRag] ×", error.config?.url, error.message);
    return Promise.reject(error);
  },
);

export default apiRag;
