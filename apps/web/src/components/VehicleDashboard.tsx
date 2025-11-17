'use client';

import { useVehicles } from '@/hooks/useVehicles';
import { VehicleCard } from './VehicleCard';
import { PlaceholderNotification } from './PlaceholderNotification';
import { useRef, useEffect, useCallback } from 'react';

export function VehicleDashboard() {
  const {
    vehicles,
    filteredVehicles,
    allVehicles,
    loading,
    error,
    clearError,
    statusFilter,
    sortBy,
    vehiclesToRender,
    loadMoreForRendering,
    setVehiclesToRender,
    showNotInterested,
    recentlyHiddenVehicles,
    dismissedPlaceholders,
    dismissPlaceholder
  } = useVehicles();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset vehiclesToRender when sort or filter changes (AC #6)
  // This resets render count to 50 without changing scroll position
  useEffect(() => {
    setVehiclesToRender(50);
  }, [sortBy, statusFilter, setVehiclesToRender]);

  // Progressive rendering: Load more for display when scrolling near bottom
  const handleLoadMore = useCallback(() => {
    if (vehiclesToRender < filteredVehicles.length && !loading) {
      loadMoreForRendering();
    }
  }, [vehiclesToRender, filteredVehicles.length, loading, loadMoreForRendering]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [handleLoadMore]);

  // Helper function to determine if vehicle should show as placeholder
  // MUST be defined before early returns to follow Rules of Hooks
  const shouldShowPlaceholder = useCallback((vehicleId: string) => {
    const hiddenStatus = recentlyHiddenVehicles.get(vehicleId);
    const isDismissed = dismissedPlaceholders.has(vehicleId);

    if (!hiddenStatus || isDismissed) {
      return false;
    }

    // Show placeholder for deleted vehicles
    if (hiddenStatus === 'deleted') {
      return true;
    }

    // Show placeholder for not_interested only if toggle is OFF
    if (hiddenStatus === 'not_interested' && !showNotInterested) {
      return true;
    }

    return false;
  }, [recentlyHiddenVehicles, dismissedPlaceholders, showNotInterested]);

  // Only show full loading spinner on initial load (when no vehicles are loaded yet)
  if (loading && allVehicles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading vehicles</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    // Check if there are vehicles but they're filtered out
    const isFiltered = statusFilter && statusFilter.length > 0 && allVehicles.length > 0;

    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {isFiltered ? 'No vehicles match your filter' : 'No vehicles found'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {isFiltered
            ? 'Try selecting a different status filter to see more vehicles.'
            : 'No vehicles have been scraped yet. Run the ingestion script to populate the database.'
          }
        </p>
      </div>
    );
  }

  // Helper function to get placeholder message
  const getPlaceholderMessage = (status: 'not_interested' | 'deleted') => {
    if (status === 'deleted') {
      return 'Vehicle Deleted';
    }
    return 'Vehicle Added to Not Interested List';
  };

  return (
    <div className="space-y-4">
      {/* Vehicle List - Horizontal Cards with Placeholders */}
      {vehicles.map((vehicle) => {
        const hiddenStatus = recentlyHiddenVehicles.get(vehicle.id);

        if (hiddenStatus && shouldShowPlaceholder(vehicle.id)) {
          return (
            <PlaceholderNotification
              key={`placeholder-${vehicle.id}`}
              vehicleId={vehicle.id}
              message={getPlaceholderMessage(hiddenStatus)}
              onDismiss={dismissPlaceholder}
            />
          );
        }

        return <VehicleCard key={vehicle.id} vehicle={vehicle} />;
      })}

      {/* Progressive rendering sentinel element */}
      {vehiclesToRender < filteredVehicles.length && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Rendering more vehicles...</p>
          </div>
        </div>
      )}

      {/* End of results indicator */}
      {vehiclesToRender >= filteredVehicles.length && allVehicles.length > 0 && (
        <div className="text-center py-8 text-sm text-gray-500 border-t border-gray-200">
          {statusFilter && statusFilter.length > 0 ? (
            <>Showing {filteredVehicles.length} of {allVehicles.length} vehicles</>
          ) : (
            <>All {filteredVehicles.length} vehicles displayed</>
          )}
        </div>
      )}
    </div>
  );
}
