import { apiClient } from './client';

export type HealthResponse = {
  status: string;
  [key: string]: unknown;
};

export async function checkHealth() {
  return apiClient.get<HealthResponse>('/health');
}
