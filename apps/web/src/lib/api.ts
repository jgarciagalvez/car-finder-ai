import { Vehicle } from '@car-finder/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
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
export async function fetchVehicles(): Promise<Vehicle[]> {
  return apiRequest<Vehicle[]>('/api/vehicles');
}

export async function fetchVehicleById(id: string): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/api/vehicles/${id}`);
}

export async function updateVehicle(
  id: string, 
  updates: { status?: string; personalNotes?: string }
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/api/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// Health check
export async function checkApiHealth(): Promise<{ status: string; message: string; timestamp: string }> {
  return apiRequest<{ status: string; message: string; timestamp: string }>('/health');
}
