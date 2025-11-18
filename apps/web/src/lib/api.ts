import { Vehicle } from '@car-finder/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface PaginationMetadata {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface VehiclesResponse {
  vehicles: Vehicle[];
  pagination: PaginationMetadata;
}

export interface CheckExistenceResult {
  vehicleId: string;
  isRemovedFromSource: boolean;
  lastExistenceCheck: string;
  httpStatus: number;
  message: string;
}

export class ApiError extends Error {
  public status: number;
  public response?: any;

  constructor(
    message: string,
    status: number,
    response?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: globalThis.RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: globalThis.RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      0
    );
  }
}

// Vehicle API functions
export async function fetchVehicles(options?: { offset?: number; limit?: number }): Promise<VehiclesResponse> {
  const params = new URLSearchParams();

  if (options?.offset !== undefined) {
    params.append('offset', options.offset.toString());
  }
  if (options?.limit !== undefined) {
    params.append('limit', options.limit.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/vehicles${queryString ? `?${queryString}` : ''}`;

  return apiRequest<VehiclesResponse>(endpoint);
}

export async function fetchVehicleById(id: string): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/api/vehicles/${id}`);
}

export async function updateVehicle(
  id: string,
  updates: { status?: string; personalNotes?: string; virtualMechanicSummary?: string; aiMechanicReport?: string }
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/api/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function translateVehicle(vehicleId: string, force: boolean = false): Promise<Vehicle> {
  const url = `/api/vehicles/${vehicleId}/translate${force ? '?force=true' : ''}`;
  return apiRequest<Vehicle>(url, { method: 'POST' });
}

export async function analyzeVehicle(vehicleId: string, force: boolean = false): Promise<Vehicle> {
  const url = `/api/vehicles/${vehicleId}/analyze${force ? '?force=true' : ''}`;
  return apiRequest<Vehicle>(url, { method: 'POST' });
}

export async function checkVehicleExistence(vehicleId: string): Promise<CheckExistenceResult> {
  return apiRequest<CheckExistenceResult>(`/api/vehicles/${vehicleId}/check-existence`, {
    method: 'POST',
  });
}

// Health check
export async function checkApiHealth(): Promise<{ status: string; message: string; timestamp: string }> {
  return apiRequest<{ status: string; message: string; timestamp: string }>('/health');
}
