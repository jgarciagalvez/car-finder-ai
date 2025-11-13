'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Vehicle, VehicleStatus } from '@car-finder/types';
import { SortOption } from '@/lib/utils';

interface VehicleState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  selectedVehicle: Vehicle | null;
  sortBy: SortOption;
  hasMore: boolean;
  total: number;
  statusFilter: VehicleStatus[] | null;
}

type VehicleAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VEHICLES'; payload: Vehicle[]; hasMore: boolean; total: number }
  | { type: 'APPEND_VEHICLES'; payload: Vehicle[]; hasMore: boolean; total: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_VEHICLE'; payload: Vehicle | null }
  | { type: 'UPDATE_VEHICLE'; payload: Vehicle }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_SORT_BY'; payload: SortOption }
  | { type: 'SET_STATUS_FILTER'; payload: VehicleStatus[] | null };

interface VehicleContextType {
  state: VehicleState;
  setLoading: (_loading: boolean) => void;
  setVehicles: (_vehicles: Vehicle[], _hasMore: boolean, _total: number) => void;
  appendVehicles: (_vehicles: Vehicle[], _hasMore: boolean, _total: number) => void;
  setError: (_error: string | null) => void;
  setSelectedVehicle: (_vehicle: Vehicle | null) => void;
  updateVehicle: (_vehicle: Vehicle) => void;
  clearError: () => void;
  setSortBy: (_sortBy: SortOption) => void;
  setStatusFilter: (_statusFilter: VehicleStatus[] | null) => void;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

const initialState: VehicleState = {
  vehicles: [],
  loading: false,
  error: null,
  selectedVehicle: null,
  sortBy: 'priority',
  hasMore: false,
  total: 0,
  statusFilter: null,
};

function vehicleReducer(state: VehicleState, action: VehicleAction): VehicleState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_VEHICLES':
      return { ...state, vehicles: action.payload, error: null, hasMore: action.hasMore, total: action.total };
    case 'APPEND_VEHICLES':
      return { ...state, vehicles: [...state.vehicles, ...action.payload], error: null, hasMore: action.hasMore, total: action.total };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SELECTED_VEHICLE':
      return { ...state, selectedVehicle: action.payload };
    case 'UPDATE_VEHICLE':
      return {
        ...state,
        vehicles: state.vehicles.map(v =>
          v.id === action.payload.id ? action.payload : v
        ),
        selectedVehicle: state.selectedVehicle?.id === action.payload.id
          ? action.payload
          : state.selectedVehicle,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    default:
      return state;
  }
}

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(vehicleReducer, initialState);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setVehicles = useCallback((vehicles: Vehicle[], hasMore: boolean, total: number) => {
    dispatch({ type: 'SET_VEHICLES', payload: vehicles, hasMore, total });
  }, []);

  const appendVehicles = useCallback((vehicles: Vehicle[], hasMore: boolean, total: number) => {
    dispatch({ type: 'APPEND_VEHICLES', payload: vehicles, hasMore, total });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setSelectedVehicle = useCallback((vehicle: Vehicle | null) => {
    dispatch({ type: 'SET_SELECTED_VEHICLE', payload: vehicle });
  }, []);

  const updateVehicle = useCallback((vehicle: Vehicle) => {
    dispatch({ type: 'UPDATE_VEHICLE', payload: vehicle });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setSortBy = useCallback((sortBy: SortOption) => {
    dispatch({ type: 'SET_SORT_BY', payload: sortBy });
  }, []);

  const setStatusFilter = useCallback((statusFilter: VehicleStatus[] | null) => {
    dispatch({ type: 'SET_STATUS_FILTER', payload: statusFilter });
  }, []);

  const value: VehicleContextType = {
    state,
    setLoading,
    setVehicles,
    appendVehicles,
    setError,
    setSelectedVehicle,
    updateVehicle,
    clearError,
    setSortBy,
    setStatusFilter,
  };

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicleContext() {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicleContext must be used within a VehicleProvider');
  }
  return context;
}
