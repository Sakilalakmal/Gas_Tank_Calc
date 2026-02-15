import { http } from './http';
import axios from 'axios';

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

export type CreateReadingRequest = {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
};

export type ReadingRecord = {
  id: number;
  created_by_user_id: number;
  pressure_unit: 'psi' | string;
  factor_used: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  kg1: number;
  kg2: number;
  kg3: number;
  kg4: number;
  total_kg: number;
  recorded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  tank_capacity_kg?: number;
  plant_total_capacity_kg?: number;
  max_tank_pressure_psi?: number;
  is_within_capacity_limits?: boolean;
};

type JsonApiResource<T> = {
  data: T;
};

type JsonApiCollection<T> = {
  data: T[];
};

function unwrapResource<T>(payload: T | JsonApiResource<T>): T {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload
  ) {
    return (payload as JsonApiResource<T>).data;
  }

  return payload as T;
}

function unwrapCollection<T>(payload: T[] | JsonApiCollection<T>): T[] {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  return payload as T[];
}

export const apiClient = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await http.post<LoginResponse>('/api/login', payload);
    return response.data;
  },
  async createReading(payload: CreateReadingRequest): Promise<ReadingRecord> {
    const response = await http.post<ReadingRecord | JsonApiResource<ReadingRecord>>(
      '/api/readings',
      payload
    );
    return unwrapResource(response.data);
  },
  async getLatestReading(): Promise<ReadingRecord | null> {
    try {
      const response = await http.get<ReadingRecord | JsonApiResource<ReadingRecord>>(
        '/api/readings/latest'
      );
      return unwrapResource(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  },
  async getReadings(limit = 30, includeInvalid = false): Promise<ReadingRecord[]> {
    const response = await http.get<ReadingRecord[] | JsonApiCollection<ReadingRecord>>(
      `/api/readings?limit=${limit}&include_invalid=${includeInvalid ? 1 : 0}`
    );
    return unwrapCollection(response.data);
  },
  async logout(): Promise<void> {
    await http.post('/api/logout');
  },
};
