export interface AISettings {
  userId: string;
  tenantId: string;
  openaiApiKey?: string;
  preferredModel?:
    | "gpt-4"
    | "gpt-4-turbo"
    | "gpt-3.5-turbo"
    | "gpt-4o"
    | "gpt-4o-mini";
  maxTokens?: number;
  temperature?: number;
  useLocalNLP?: boolean;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AISettingsFormData {
  openaiApiKey: string;
  preferredModel: string;
  maxTokens: number;
  temperature: number;
  useLocalNLP: boolean;
  language: string;
}

export interface AISettingsResponse {
  success: boolean;
  data?: AISettings;
  message?: string;
}
