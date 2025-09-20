import type { AISettingsFormData, AISettingsResponse } from 'src/types/ai-settings';

import axiosInstance from 'src/lib/axios';

// ----------------------------------------------------------------------

const endpoints = {
  get: '/api/v1/ai/settings',
  update: '/api/v1/ai/settings',
  test: '/api/v1/ai/settings/test',
};

export const aiSettingsApi = {
  get: (): Promise<AISettingsResponse> => axiosInstance.get(endpoints.get),
  update: (data: AISettingsFormData): Promise<AISettingsResponse> =>
    axiosInstance.put(endpoints.update, data),
  test: (data: { openaiApiKey: string; preferredModel: string }): Promise<AISettingsResponse> =>
    axiosInstance.post(endpoints.test, data),
};
