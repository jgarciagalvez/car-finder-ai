'use client';

import { Vehicle } from '@car-finder/types';
import {
  formatPrice,
  formatMileage,
  formatYear,
  getStatusColor,
  getStatusLabel,
  getScoreColor,
  getScoreTextColor,
  getMarketValueColor,
  getMarketValueTextColor,
  formatMarketValue
} from '@/lib/utils';
import { useVehicles } from '@/hooks/useVehicles';
import Link from 'next/link';
import React, { useState, MouseEvent } from 'react';
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
  // Local state (essential per-card UI state only - AC: 1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [notes, setNotes] = useState(vehicle.personalNotes || '');

  // Access centralized state from context
  const {
    forceTranslateVehicle,
    forceAnalyzeVehicle,
    updateVehicle,
    operationStates,
    setOperationState,
    feedback,
    setFeedback,
    clearFeedback,
    showNotInterested,
    addHiddenVehicle,
  } = useVehicles();

  // Derive operation states for this vehicle (AC: 2)
  const vehicleOps = operationStates[vehicle.id] || {};
  const isTranslating = vehicleOps.isTranslating || false;
  const isAnalyzing = vehicleOps.isAnalyzing || false;
  const isUpdatingStatus = vehicleOps.isUpdatingStatus || false;
  const isSavingNotes = vehicleOps.isSavingNotes || false;

  // Derive feedback message for this vehicle (AC: 3)
  const showFeedback = feedback.vehicleId === vehicle.id;
  const actionError = showFeedback && feedback.type === 'error' ? feedback.message : null;
  const actionSuccess = showFeedback && feedback.type === 'success' ? feedback.message : null;

  const photos = vehicle.photos.length > 0 ? vehicle.photos : [];

  const nextImage = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % photos.length);
    setImageError(false); // Reset error when changing images
  };

  const prevImage = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setImageError(false); // Reset error when changing images
  };

  const openOriginalPost = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(vehicle.sourceUrl, '_blank');
  };

  const handleForceTranslate = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Force re-translate this vehicle? This will use AI credits.')) return;

    try {
      setOperationState(vehicle.id, 'isTranslating', true);
      clearFeedback();
      await forceTranslateVehicle(vehicle.id);
      setFeedback('success', 'Vehicle translated successfully!', vehicle.id);
    } catch (error) {
      setFeedback('error', error instanceof Error ? error.message : 'Translation failed', vehicle.id);
    } finally {
      setOperationState(vehicle.id, 'isTranslating', false);
    }
  };

  const handleForceAnalyze = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Force re-analyze this vehicle? This will use AI credits.')) return;

    try {
      setOperationState(vehicle.id, 'isAnalyzing', true);
      clearFeedback();
      await forceAnalyzeVehicle(vehicle.id);
      setFeedback('success', 'Vehicle analyzed successfully!', vehicle.id);
    } catch (error) {
      setFeedback('error', error instanceof Error ? error.message : 'Analysis failed', vehicle.id);
    } finally {
      setOperationState(vehicle.id, 'isAnalyzing', false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const newStatus = e.target.value;

    try {
      setOperationState(vehicle.id, 'isUpdatingStatus', true);
      clearFeedback();

      // Add to recently hidden vehicles BEFORE updating status
      // This ensures the placeholder state is set before the vehicle is filtered out
      // For deleted: always show placeholder
      // For not_interested: only show placeholder if toggle is OFF
      if (newStatus === 'deleted') {
        addHiddenVehicle(vehicle.id, 'deleted');
      } else if (newStatus === 'not_interested' && !showNotInterested) {
        addHiddenVehicle(vehicle.id, 'not_interested');
      }

      await updateVehicle(vehicle.id, { status: newStatus });

      setFeedback('success', 'Status updated successfully!', vehicle.id);
    } catch (error) {
      setFeedback('error', error instanceof Error ? error.message : 'Status update failed', vehicle.id);
    } finally {
      setOperationState(vehicle.id, 'isUpdatingStatus', false);
    }
  };

  const handleSaveNotes = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setOperationState(vehicle.id, 'isSavingNotes', true);
      clearFeedback();
      await updateVehicle(vehicle.id, { personalNotes: notes || '' });
      setFeedback('success', 'Notes saved successfully!', vehicle.id);
      setIsNotesExpanded(false);
    } catch (error) {
      setFeedback('error', error instanceof Error ? error.message : 'Failed to save notes', vehicle.id);
    } finally {
      setOperationState(vehicle.id, 'isSavingNotes', false);
    }
  };

  const handleCancelNotes = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotes(vehicle.personalNotes || '');
    setIsNotesExpanded(false);
  };

  // Show action buttons for not_interested status or incomplete AI data
  const showActions =
    vehicle.status === 'not_interested' ||
    !vehicle.description ||
    !vehicle.aiPriorityRating;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden relative">
      {/* Action notifications */}
      {actionSuccess && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-10 text-sm">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-10 text-sm">
          {actionError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Image Carousel Section */}
        <div className="lg:w-80 lg:flex-shrink-0">
          <div className="aspect-video lg:aspect-square bg-gray-200 relative">
            {photos.length > 0 && !imageError ? (
              <>
                <img
                  src={photos[currentImageIndex]}
                  alt={vehicle.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setImageError(true)}
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
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gradient-to-br from-gray-100 to-gray-200">
                <svg className="w-16 h-16 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">{imageError ? 'Image Failed to Load' : 'No Image Available'}</span>
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
              {vehicle.sellerInfo?.location ? (
                <>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vehicle.sellerInfo.location.split(',')[0].trim() + ', Poland')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {vehicle.sellerInfo.location.split(',')[0].trim()}
                  </a>
                  {vehicle.distanceFromWroclaw !== null && (
                    <span className="text-gray-500"> • {Math.round(vehicle.distanceFromWroclaw)} km</span>
                  )}
                </>
              ) : (
                <span>N/A</span>
              )}
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
            {/* AI Priority Rating */}
            <div className={`border rounded-lg p-4 text-center min-w-[80px] ${getScoreColor(vehicle.aiPriorityRating)}`}>
              <div className={`text-2xl font-bold ${getScoreTextColor(vehicle.aiPriorityRating)}`}>
                {vehicle.aiPriorityRating ?? 'N/A'}
              </div>
              <div className="text-xs font-medium">AI Priority</div>
            </div>

            {/* Personal Fit Score */}
            <div className={`border rounded-lg p-4 text-center min-w-[80px] ${getScoreColor(vehicle.personalFitScore)}`}>
              <div className={`text-2xl font-bold ${getScoreTextColor(vehicle.personalFitScore)}`}>
                {vehicle.personalFitScore ?? 'N/A'}
              </div>
              <div className="text-xs font-medium">Personal Fit</div>
            </div>

            {/* Market Value */}
            <div className={`border rounded-lg p-4 text-center min-w-[80px] ${getMarketValueColor(vehicle.marketValueScore)}`}>
              <div className={`text-2xl font-bold ${getMarketValueTextColor(vehicle.marketValueScore)} flex items-center justify-center`}>
                <span className="text-sm mr-1">📈</span>
                {formatMarketValue(vehicle.marketValueScore)}
              </div>
              <div className="text-xs font-medium">vs Market</div>
            </div>
          </div>

          {/* AI Summary */}
          {vehicle.aiPrioritySummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                {vehicle.aiPrioritySummary}
              </p>
            </div>
          )}

          {/* Personal Notes Section */}
          <div className="mb-4">
            {!isNotesExpanded ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsNotesExpanded(true);
                }}
                className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {vehicle.personalNotes ? (
                  <>
                    <div className="font-medium text-gray-700 mb-1">📝 Personal Notes</div>
                    <div className="line-clamp-2">{vehicle.personalNotes}</div>
                  </>
                ) : (
                  <span className="text-gray-500">💭 Add personal notes...</span>
                )}
              </button>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="font-medium text-gray-700 mb-2">📝 Personal Notes</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Add your thoughts, questions, or reminders about this vehicle..."
                  className="w-full border border-gray-300 rounded p-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  disabled={isSavingNotes}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isSavingNotes ? (
                      <>
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      'Save Notes'
                    )}
                  </button>
                  <button
                    onClick={handleCancelNotes}
                    disabled={isSavingNotes}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Row: Features and Status */}
          <div className="flex justify-between items-end">
            {/* Features */}
            <div className="flex flex-wrap gap-2 flex-1">
              {vehicle.features && vehicle.features.length > 0 ? (
                <>
                  {vehicle.features.slice(0, 5).map((feature, index) => (
                    <span
                      key={index}
                      className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium"
                    >
                      {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                  {vehicle.features.length > 5 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                      +{vehicle.features.length - 5} more
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-gray-500">No features listed</span>
              )}
            </div>

            {/* Status Dropdown */}
            <div className="ml-4 flex items-center gap-2">
              <select
                className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                value={vehicle.status}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <option value="new">New</option>
                <option value="processed">Processed</option>
                <option value="skipped">Skipped</option>
                <option value="to_contact">To Contact</option>
                <option value="contacted">Contacted</option>
                <option value="to_visit">To Visit</option>
                <option value="visited">Visited</option>
                <option value="not_interested">Not Interested</option>
                <option value="deleted">Deleted</option>
              </select>
              {isUpdatingStatus && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              )}
            </div>
          </div>

          {/* Action Buttons (shown for not_interested or incomplete AI data) */}
          {showActions && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={handleForceTranslate}
                disabled={isTranslating}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
                title="Force re-translate this vehicle description"
              >
                {isTranslating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span>Force Translate</span>
                  </>
                )}
              </button>

              <button
                onClick={handleForceAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
                title="Force re-analyze this vehicle with AI"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Force Analyze</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
