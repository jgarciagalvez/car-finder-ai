'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef, ReactNode } from 'react';
import { Vehicle, VehicleStatus } from '@car-finder/types';
import { SortOption } from '@/lib/utils';

export interface OperationState {
  isTranslating?: boolean;
  isAnalyzing?: boolean;
  isUpdatingStatus?: boolean;
  isSavingNotes?: boolean;
}

export interface FeedbackState {
  type: 'success' | 'error' | null;
  message: string | null;
  vehicleId?: string;
}

export type DistanceFilter = 'all' | 'within-50' | '50-100' | '100-plus';

interface VehicleState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  selectedVehicle: Vehicle | null;
  sortBy: SortOption;
  sortStack: SortOption[];
  hasMore: boolean;
  total: number;
  statusFilter: VehicleStatus[] | null;
  distanceFilter: DistanceFilter;
  operationStates: Record<string, OperationState>;
  vehiclesToRender: number;
  feedback: FeedbackState;
  showNotInterested: boolean;
  recentlyHiddenVehicles: Map<string, 'not_interested' | 'deleted'>;
  dismissedPlaceholders: Set<string>;
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
  | { type: 'PUSH_SORT'; payload: SortOption }
  | { type: 'SET_STATUS_FILTER'; payload: VehicleStatus[] | null }
  | { type: 'SET_DISTANCE_FILTER'; payload: DistanceFilter }
  | { type: 'SET_OPERATION_STATE'; payload: { vehicleId: string; operation: keyof OperationState; isLoading: boolean } }
  | { type: 'CLEAR_OPERATION_STATE'; payload: { vehicleId: string; operation: keyof OperationState } }
  | { type: 'SET_VEHICLES_TO_RENDER'; payload: number }
  | { type: 'SET_FEEDBACK'; payload: { type: 'success' | 'error'; message: string; vehicleId?: string } }
  | { type: 'CLEAR_FEEDBACK' }
  | { type: 'SET_SHOW_NOT_INTERESTED'; payload: boolean }
  | { type: 'ADD_HIDDEN_VEHICLE'; payload: { id: string; status: 'not_interested' | 'deleted' } }
  | { type: 'DISMISS_PLACEHOLDER'; payload: string }
  | { type: 'CLEAR_PLACEHOLDERS' };

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
  setDistanceFilter: (_distanceFilter: DistanceFilter) => void;
  setOperationState: (_vehicleId: string, _operation: keyof OperationState, _isLoading: boolean) => void;
  clearOperationState: (_vehicleId: string, _operation: keyof OperationState) => void;
  setVehiclesToRender: (_count: number) => void;
  setFeedback: (_type: 'success' | 'error', _message: string, _vehicleId?: string) => void;
  clearFeedback: () => void;
  setShowNotInterested: (_show: boolean) => void;
  addHiddenVehicle: (_id: string, _status: 'not_interested' | 'deleted') => void;
  dismissPlaceholder: (_id: string) => void;
  clearPlaceholders: () => void;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

const initialState: VehicleState = {
  vehicles: [],
  loading: false,
  error: null,
  selectedVehicle: null,
  sortBy: 'priority',
  sortStack: ['priority'],
  hasMore: false,
  total: 0,
  statusFilter: null,
  distanceFilter: 'all',
  operationStates: {},
  vehiclesToRender: 50,
  feedback: {
    type: null,
    message: null,
  },
  showNotInterested: false,
  recentlyHiddenVehicles: new Map(),
  dismissedPlaceholders: new Set(),
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
    case 'PUSH_SORT': {
      // Remove duplicate if exists (prevent same sort stacking on itself)
      const filteredStack = state.sortStack.filter(s => s !== action.payload);
      // Add new sort to end (most recent = primary)
      const newStack = [...filteredStack, action.payload];
      // Limit stack size to 3 levels (prevent unbounded growth)
      const trimmedStack = newStack.slice(-3);
      return {
        ...state,
        sortStack: trimmedStack,
        sortBy: action.payload, // Update sortBy for UI display
      };
    }
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'SET_DISTANCE_FILTER':
      return { ...state, distanceFilter: action.payload };
    case 'SET_OPERATION_STATE':
      return {
        ...state,
        operationStates: {
          ...state.operationStates,
          [action.payload.vehicleId]: {
            ...state.operationStates[action.payload.vehicleId],
            [action.payload.operation]: action.payload.isLoading,
          },
        },
      };
    case 'CLEAR_OPERATION_STATE':
      return {
        ...state,
        operationStates: {
          ...state.operationStates,
          [action.payload.vehicleId]: {
            ...state.operationStates[action.payload.vehicleId],
            [action.payload.operation]: undefined,
          },
        },
      };
    case 'SET_VEHICLES_TO_RENDER':
      return { ...state, vehiclesToRender: action.payload };
    case 'SET_FEEDBACK':
      return {
        ...state,
        feedback: {
          type: action.payload.type,
          message: action.payload.message,
          vehicleId: action.payload.vehicleId,
        },
      };
    case 'CLEAR_FEEDBACK':
      return {
        ...state,
        feedback: {
          type: null,
          message: null,
        },
      };
    case 'SET_SHOW_NOT_INTERESTED':
      return { ...state, showNotInterested: action.payload };
    case 'ADD_HIDDEN_VEHICLE': {
      const newMap = new Map(state.recentlyHiddenVehicles);
      newMap.set(action.payload.id, action.payload.status);
      return { ...state, recentlyHiddenVehicles: newMap };
    }
    case 'DISMISS_PLACEHOLDER': {
      const newSet = new Set(state.dismissedPlaceholders);
      newSet.add(action.payload);
      return { ...state, dismissedPlaceholders: newSet };
    }
    case 'CLEAR_PLACEHOLDERS':
      return {
        ...state,
        recentlyHiddenVehicles: new Map(),
        dismissedPlaceholders: new Set(),
      };
    default:
      return state;
  }
}

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(vehicleReducer, initialState);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    dispatch({ type: 'PUSH_SORT', payload: sortBy });
  }, []);

  const setStatusFilter = useCallback((statusFilter: VehicleStatus[] | null) => {
    dispatch({ type: 'SET_STATUS_FILTER', payload: statusFilter });
  }, []);

  const setDistanceFilter = useCallback((distanceFilter: DistanceFilter) => {
    dispatch({ type: 'SET_DISTANCE_FILTER', payload: distanceFilter });
  }, []);

  const setOperationState = useCallback((vehicleId: string, operation: keyof OperationState, isLoading: boolean) => {
    dispatch({ type: 'SET_OPERATION_STATE', payload: { vehicleId, operation, isLoading } });
  }, []);

  const clearOperationState = useCallback((vehicleId: string, operation: keyof OperationState) => {
    dispatch({ type: 'CLEAR_OPERATION_STATE', payload: { vehicleId, operation } });
  }, []);

  const setVehiclesToRender = useCallback((count: number) => {
    dispatch({ type: 'SET_VEHICLES_TO_RENDER', payload: count });
  }, []);

  const clearFeedback = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    dispatch({ type: 'CLEAR_FEEDBACK' });
  }, []);

  const setFeedback = useCallback((type: 'success' | 'error', message: string, vehicleId?: string) => {
    // Clear previous timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // Set new feedback
    dispatch({ type: 'SET_FEEDBACK', payload: { type, message, vehicleId } });

    // Auto-clear after timeout (3s for success, 5s for error)
    const timeoutDuration = type === 'success' ? 3000 : 5000;
    feedbackTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'CLEAR_FEEDBACK' });
      feedbackTimeoutRef.current = null;
    }, timeoutDuration);
  }, []);

  const setShowNotInterested = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_NOT_INTERESTED', payload: show });
  }, []);

  const addHiddenVehicle = useCallback((id: string, status: 'not_interested' | 'deleted') => {
    dispatch({ type: 'ADD_HIDDEN_VEHICLE', payload: { id, status } });
  }, []);

  const dismissPlaceholder = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_PLACEHOLDER', payload: id });
  }, []);

  const clearPlaceholders = useCallback(() => {
    dispatch({ type: 'CLEAR_PLACEHOLDERS' });
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
    setDistanceFilter,
    setOperationState,
    clearOperationState,
    setVehiclesToRender,
    setFeedback,
    clearFeedback,
    setShowNotInterested,
    addHiddenVehicle,
    dismissPlaceholder,
    clearPlaceholders,
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
