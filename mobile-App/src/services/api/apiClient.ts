import { http } from './http';

export type User = {
  id: number;
  username: string;
  epf_number: string;
  designation: string;
  role: string;
};

export type LoginRequest = {
  username: string;
  epf_number: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export const apiClient = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await http.post<LoginResponse>('/api/login', payload);
    return response.data;
  },
  async logout(): Promise<void> {
    await http.post('/api/logout');
  },
};
