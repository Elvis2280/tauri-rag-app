import axios from 'axios';
import { API_BASE_URL, API_KEY } from '@/lib/env';

if (!API_BASE_URL || !API_KEY) {
  throw new Error('Missing API ENV settings...');
}

const apiRag = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'X-API-Key': API_KEY,
  },
});

apiRag.interceptors.request.use((config) => {
  console.log(
    '[apiRag] →',
    config.method?.toUpperCase(),
    config.url,
    config.params ?? '',
  );
  return config;
});

apiRag.interceptors.response.use(
  (response) => {
    console.log('[apiRag] ←', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('[apiRag] ×', error.config?.url, error.message);
    return Promise.reject(error);
  },
);

export default apiRag;
