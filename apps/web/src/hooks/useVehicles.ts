'use client';

import { useCallback, useEffect } from 'react';
import { useVehicleContext } from '@/context/VehicleContext';
import { fetchVehicles, fetchVehicleById, updateVehicle as updateVehicleApi, ApiError } from '@/lib/api';
import { Vehicle } from '@car-finder/types';

export function useVehicles() {
  const { state, setLoading, setVehicles, setError, clearError } = useVehicleContext();

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      clearError();
      const vehicles = await fetchVehicles();
      setVehicles(vehicles);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to load vehicles: ${error.message}`);
      } else {
        setError('Failed to load vehicles: Unknown error occurred');
      }
    }
  }, [setLoading, setVehicles, setError, clearError]);

  const loadVehicleById = useCallback(async (id: string): Promise<Vehicle | null> => {
    try {
      setLoading(true);
      clearError();
      const vehicle = await fetchVehicleById(id);
      return vehicle;
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to load vehicle: ${error.message}`);
      } else {
        setError('Failed to load vehicle: Unknown error occurred');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, clearError]);

  const updateVehicle = useCallback(async (
    id: string, 
    updates: { status?: string; personalNotes?: string }
  ): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();
      const updatedVehicle = await updateVehicleApi(id, updates);
      // The context will handle updating the vehicle in state
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to update vehicle: ${error.message}`);
      } else {
        setError('Failed to update vehicle: Unknown error occurred');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, clearError]);

  // Auto-load vehicles on mount
  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  return {
    vehicles: state.vehicles,
    loading: state.loading,
    error: state.error,
    selectedVehicle: state.selectedVehicle,
    loadVehicles,
    loadVehicleById,
    updateVehicle,
    clearError,
  };
}
