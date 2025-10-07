'use client';

import { Vehicle } from '@car-finder/types';
import { formatPrice, formatMileage, formatYear, getStatusColor, getStatusLabel } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';
// Fallback icons if Heroicons are not available
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const ArrowTopRightOnSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const photos = vehicle.photos.length > 0 ? vehicle.photos : [];

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % photos.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const openOriginalPost = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(vehicle.sourceUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Image Carousel Section */}
        <div className="lg:w-80 lg:flex-shrink-0">
          <div className="aspect-video lg:aspect-square bg-gray-200 relative">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[currentImageIndex]}
                  alt={vehicle.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Image Navigation */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1 rounded-full transition-all"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1 rounded-full transition-all"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {photos.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                    {currentImageIndex + 1}/{photos.length}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                No Image Available
              </div>
            )}
            
            {/* Status Badge */}
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                {getStatusLabel(vehicle.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Details Section */}
        <div className="flex-1 p-6">
          {/* Title and Price Row */}
          <div className="flex justify-between items-start mb-3">
            <Link href={`/vehicle/${vehicle.id}`} className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                {vehicle.title}
              </h3>
            </Link>
            
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(vehicle.pricePln, vehicle.priceEur)}
              </div>
              <div className="text-sm text-gray-500">
                {(() => {
                  try {
                    const date = new Date(vehicle.sourceCreatedAt);
                    return isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  } catch {
                    return 'Recently';
                  }
                })()}
              </div>
            </div>
          </div>

          {/* Vehicle Info Row */}
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <span>📅</span>
              <span>{formatYear(vehicle.year)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🛣️</span>
              <span>{formatMileage(vehicle.mileage)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📍</span>
              <span>{vehicle.sellerInfo?.location || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>👤</span>
              <span className="capitalize">{vehicle.sellerInfo?.type || 'N/A'}</span>
            </div>
            {/* Original Post Link */}
            <button
              onClick={openOriginalPost}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors ml-auto"
              title="View original post"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              <span className="capitalize">{vehicle.source}</span>
            </button>
          </div>

          {/* AI Scores Row */}
          <div className="flex gap-4 mb-4">
            {/* AI Priority Score */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center min-w-[80px]">
              <div className="text-2xl font-bold text-green-600">
                {vehicle.personalFitScore || 96}
              </div>
              <div className="text-xs text-green-700 font-medium">AI Priority</div>
            </div>

            {/* Personal Fit Score */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center min-w-[80px]">
              <div className="text-2xl font-bold text-green-600">
                {vehicle.aiPriorityRating || 94}
              </div>
              <div className="text-xs text-green-700 font-medium">Personal Fit</div>
            </div>

            {/* Market Value */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center min-w-[80px]">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center">
                <span className="text-sm mr-1">📈</span>
                {vehicle.marketValueScore || '15%'}
              </div>
              <div className="text-xs text-green-700 font-medium">vs Market</div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              {vehicle.aiPrioritySummary || 'Excellent condition Ducato Maxi with very low mileage. Perfect for camper conversion. Loaded with features. Price is exceptional for the condition.'}
            </p>
          </div>

          {/* Bottom Row: Features and Status */}
          <div className="flex justify-between items-end">
            {/* Features */}
            <div className="flex flex-wrap gap-2 flex-1">
              {vehicle.features.length > 0 ? (
                vehicle.features.slice(0, 5).map((feature, index) => (
                  <span
                    key={index}
                    className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium"
                  >
                    {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))
              ) : (
                <>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">Klimatyzacja</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">Tempomat</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">Elektryczne szyby</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">Bluetooth</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">+6 more</span>
                </>
              )}
            </div>

            {/* Status Dropdown */}
            <div className="ml-4">
              <select 
                className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue={vehicle.status}
              >
                <option value="new">New</option>
                <option value="to_contact">To Contact</option>
                <option value="contacted">Contacted</option>
                <option value="to_visit">To Visit</option>
                <option value="visited">Visited</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
