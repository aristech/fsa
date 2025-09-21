import type { AISettingsFormData, AISettingsResponse } from 'src/types/ai-settings';

import axiosInstance from 'src/lib/axios';

// ----------------------------------------------------------------------

const endpoints = {
  get: '/api/v1/ai/settings',
  update: '/api/v1/ai/settings',
  test: '/api/v1/ai/settings/test',
};

export const aiSettingsApi = {
  get: async (): Promise<AISettingsResponse> => {
    const response = await axiosInstance.get(endpoints.get);
    return response.data;
  },
  update: async (data: AISettingsFormData): Promise<AISettingsResponse> => {
    const response = await axiosInstance.put(endpoints.update, data);
    return response.data;
  },
  test: async (data: { openaiApiKey: string; preferredModel: string }): Promise<AISettingsResponse> => {
    const response = await axiosInstance.post(endpoints.test, data);
    return response.data;
  },
};
