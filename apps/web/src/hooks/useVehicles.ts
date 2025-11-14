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
  const {
    state,
    setLoading,
    setVehicles,
    appendVehicles,
    setError,
    clearError,
    setSortBy,
    setStatusFilter,
    updateVehicle: updateVehicleInContext,
    setOperationState,
    clearOperationState,
    setVehiclesToRender,
    setFeedback,
    clearFeedback,
  } = useVehicleContext();

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      clearError();
      // Fetch ALL vehicles (no limit - use 0 to indicate unlimited)
      const response = await fetchVehicles({ offset: 0, limit: 0 });
      setVehicles(response.vehicles, false, response.pagination.total);
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

  // Progressive rendering: Slice filtered vehicles based on render count
  const visibleVehicles = useMemo(() => {
    return filteredVehicles.slice(0, state.vehiclesToRender);
  }, [filteredVehicles, state.vehiclesToRender]);

  // Progressive rendering: Load more vehicles for display (not from API)
  const loadMoreForRendering = useCallback(() => {
    if (state.vehiclesToRender < filteredVehicles.length) {
      setVehiclesToRender(Math.min(state.vehiclesToRender + 50, filteredVehicles.length));
    }
  }, [state.vehiclesToRender, filteredVehicles.length, setVehiclesToRender]);

  return {
    vehicles: visibleVehicles, // Visible vehicles for rendering
    filteredVehicles, // All filtered vehicles (for debugging/info)
    allVehicles: state.vehicles, // All unfiltered vehicles
    loading: state.loading,
    error: state.error,
    selectedVehicle: state.selectedVehicle,
    sortBy: state.sortBy,
    statusFilter: state.statusFilter,
    hasMore: state.hasMore,
    total: state.total,
    vehiclesToRender: state.vehiclesToRender,
    loadVehicles,
    loadMoreForRendering, // Progressive rendering
    setVehiclesToRender, // Direct access for manual reset
    loadVehicleById,
    updateVehicle,
    clearError,
    setSortBy,
    setStatusFilter,
    forceTranslateVehicle,
    forceAnalyzeVehicle,
    // New methods for centralized state management
    operationStates: state.operationStates,
    setOperationState,
    clearOperationState,
    feedback: state.feedback,
    setFeedback,
    clearFeedback,
    refetch: loadVehicles, // Alias for refetching data
  };
}
