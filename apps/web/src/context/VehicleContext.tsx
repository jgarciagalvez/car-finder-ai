'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Vehicle } from '@car-finder/types';

interface VehicleState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  selectedVehicle: Vehicle | null;
}

type VehicleAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VEHICLES'; payload: Vehicle[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_VEHICLE'; payload: Vehicle | null }
  | { type: 'UPDATE_VEHICLE'; payload: Vehicle }
  | { type: 'CLEAR_ERROR' };

interface VehicleContextType {
  state: VehicleState;
  setLoading: (loading: boolean) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setError: (error: string | null) => void;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  clearError: () => void;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

const initialState: VehicleState = {
  vehicles: [],
  loading: false,
  error: null,
  selectedVehicle: null,
};

function vehicleReducer(state: VehicleState, action: VehicleAction): VehicleState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_VEHICLES':
      return { ...state, vehicles: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
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
    default:
      return state;
  }
}

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(vehicleReducer, initialState);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setVehicles = useCallback((vehicles: Vehicle[]) => {
    dispatch({ type: 'SET_VEHICLES', payload: vehicles });
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

  const value: VehicleContextType = {
    state,
    setLoading,
    setVehicles,
    setError,
    setSelectedVehicle,
    updateVehicle,
    clearError,
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
