import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private tokenKey = 'auth_token';

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor() {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // Log requests to /quizzes endpoints for debugging
        if (config.url?.includes('/quizzes')) {
          console.log('API Request:', {
            method: config.method,
            url: config.url,
            data: config.data,
          });
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  private setupResponseInterceptor() {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError) => {
        // Log full error details for debugging
        console.error('API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method,
          data: error.response?.data,
          message: error.message,
        });

        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401) {
          this.clearToken();
          // Dispatch logout event for auth context to catch
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        // Handle 403 Forbidden - insufficient permissions
        if (error.response?.status === 403) {
          const responseData = error.response?.data as any;
          window.dispatchEvent(
            new CustomEvent('notification:show', {
              detail: {
                message: responseData?.message || 'Access Denied - Insufficient permissions',
                type: 'error',
              },
            })
          );
        }

        // Handle 409 Conflict - quiz state errors, max attempts reached, etc
        if (error.response?.status === 409) {
          const responseData = error.response?.data as any;
          const message = responseData?.message || 'Cannot perform this action at this time';
          window.dispatchEvent(
            new CustomEvent('notification:show', {
              detail: {
                message,
                type: 'error',
              },
            })
          );
        }

        return Promise.reject(error);
      }
    );
  }

  public setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  public getInstance() {
    return this.axiosInstance;
  }
}

export const apiClient = new ApiClient();
export const api = apiClient.getInstance();
