'use client';

import { AIChatSidebar } from '@/components/AIChatSidebar';
import { VehicleDetail } from '@/components/VehicleDetail';
import { fetchVehicleById } from '@/lib/api';
import { Vehicle } from '@car-finder/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// Fallback icons
const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

interface VehicleDetailPageProps {
  params: {
    id: string;
  };
}

export default function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchVehicleById(params.id);
        setVehicle(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load vehicle';
        setError(errorMessage);
        console.error('Error loading vehicle:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicle();
  }, [params.id]);

  // Set page title based on vehicle data
  useEffect(() => {
    if (isLoading) {
      document.title = 'Loading... | Car Finder AI';
    } else if (vehicle) {
      document.title = `${vehicle.title} | Car Finder AI`;
    } else {
      document.title = 'Vehicle Not Found | Car Finder AI';
    }
  }, [vehicle, isLoading]);

  const handleVehicleUpdate = (updatedVehicle: Vehicle) => {
    setVehicle(updatedVehicle);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isChatOpen ? 'mr-96' : 'mr-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading vehicle details...</p>
            </div>
          )}

          {error && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {error.includes('not found') ? 'Vehicle Not Found' : 'Error Loading Vehicle'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {error.includes('not found')
                    ? 'The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.'
                    : 'An error occurred while loading the vehicle details. Please try again later.'}
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Return to Dashboard
                </Link>
              </div>
            </div>
          )}

          {vehicle && !isLoading && !error && (
            <VehicleDetail vehicle={vehicle} onVehicleUpdate={handleVehicleUpdate} />
          )}
        </div>
      </div>

      {/* Chat Toggle Button */}
      {!isChatOpen && vehicle && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-40"
          title="Open AI Assistant"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      )}

      {/* AI Chat Sidebar */}
      {vehicle && (
        <AIChatSidebar
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          context={{ view: 'detail', vehicleId: params.id }}
        />
      )}
    </div>
  );
}
