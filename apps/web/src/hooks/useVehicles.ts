'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useVehicleContext } from '@/context/VehicleContext';
import {
  fetchVehicles,
  fetchVehicleById,
  updateVehicle as updateVehicleApi,
  translateVehicle as translateVehicleApi,
  analyzeVehicle as analyzeVehicleApi,
  ApiError
} from '@/lib/api';
import { Vehicle } from '@car-finder/types';
import { sortVehicles } from '@/lib/utils';

export function useVehicles() {
  const { state, setLoading, setVehicles, appendVehicles, setError, clearError, setSortBy, setStatusFilter, updateVehicle: updateVehicleInContext } = useVehicleContext();

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      clearError();
      const response = await fetchVehicles({ offset: 0, limit: 50 });
      setVehicles(response.vehicles, response.pagination.hasMore, response.pagination.total);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to load vehicles: ${error.message}`);
      } else {
        setError('Failed to load vehicles: Unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [setLoading, setVehicles, setError, clearError]);

  const loadMoreVehicles = useCallback(async () => {
    if (!state.hasMore || state.loading) return;

    try {
      setLoading(true);
      clearError();
      const currentOffset = state.vehicles.length;
      const response = await fetchVehicles({ offset: currentOffset, limit: 50 });
      appendVehicles(response.vehicles, response.pagination.hasMore, response.pagination.total);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to load more vehicles: ${error.message}`);
      } else {
        setError('Failed to load more vehicles: Unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [state.hasMore, state.loading, state.vehicles.length, setLoading, appendVehicles, setError, clearError]);

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
  ): Promise<Vehicle | null> => {
    try {
      setLoading(true);
      clearError();
      const updatedVehicle = await updateVehicleApi(id, updates);
      updateVehicleInContext(updatedVehicle);
      return updatedVehicle;
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to update vehicle: ${error.message}`);
      } else {
        setError('Failed to update vehicle: Unknown error occurred');
      }
      throw error; // Re-throw so caller can handle it
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, clearError, updateVehicleInContext]);

  const forceTranslateVehicle = useCallback(async (vehicleId: string): Promise<void> => {
    try {
      setLoading(true);
      clearError();
      const updatedVehicle = await translateVehicleApi(vehicleId, true);
      updateVehicleInContext(updatedVehicle);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to translate vehicle: ${error.message}`);
      } else {
        setError('Failed to translate vehicle: Unknown error occurred');
      }
      throw error; // Re-throw so the caller can handle it
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, updateVehicleInContext, setError]);

  const forceAnalyzeVehicle = useCallback(async (vehicleId: string): Promise<void> => {
    try {
      setLoading(true);
      clearError();
      const updatedVehicle = await analyzeVehicleApi(vehicleId, true);
      updateVehicleInContext(updatedVehicle);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(`Failed to analyze vehicle: ${error.message}`);
      } else {
        setError('Failed to analyze vehicle: Unknown error occurred');
      }
      throw error; // Re-throw so the caller can handle it
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, updateVehicleInContext, setError]);

  // Auto-load vehicles on mount (only once)
  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Apply sorting and filtering
  const filteredVehicles = useMemo(() => {
    // First sort the vehicles
    const sorted = sortVehicles(state.vehicles, state.sortBy);

    // Then apply status filter if active
    if (state.statusFilter && state.statusFilter.length > 0) {
      return sorted.filter(v => state.statusFilter!.includes(v.status));
    }

    return sorted;
  }, [state.vehicles, state.sortBy, state.statusFilter]);

  return {
    vehicles: filteredVehicles,
    allVehicles: state.vehicles, // Expose unfiltered count
    loading: state.loading,
    error: state.error,
    selectedVehicle: state.selectedVehicle,
    sortBy: state.sortBy,
    statusFilter: state.statusFilter,
    hasMore: state.hasMore,
    total: state.total,
    loadVehicles,
    loadMoreVehicles,
    loadVehicleById,
    updateVehicle,
    clearError,
    setSortBy,
    setStatusFilter,
    forceTranslateVehicle,
    forceAnalyzeVehicle,
    refetch: loadVehicles, // Alias for refetching data
  };
}
