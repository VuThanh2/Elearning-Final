import { api } from '../../shared/services/api';
import { LoginRequest, LoginResponse, User } from '../../shared/types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Even if logout fails, we still clear local token
      console.error('Logout error:', error);
    }
  },

  async resetPassword(email: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { email, newPassword });
  },
};
