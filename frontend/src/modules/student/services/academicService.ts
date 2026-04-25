import { api } from '../../shared/services/api';
import { Section } from '../../shared/types';

export const academicService = {
  async getTeachingSections(): Promise<Section[]> {
    const response = await api.get<Section[]>('/academic/sections/teaching');
    return response.data;
  },

  async getEnrolledSections(): Promise<Section[]> {
    const response = await api.get<Section[]>('/academic/sections/enrolled');
    return response.data;
  },
};
