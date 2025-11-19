'use client';

import { Vehicle } from '@car-finder/types';
import { useState, useEffect } from 'react';
import { updateVehicle, analyzeVehicle, checkVehicleExistence, translateVehicle } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

// Helper function to determine if existence check is needed
function shouldCheckExistence(vehicle: Vehicle): boolean {
  // Skip if scraped less than 4 hours ago (fresh data)
  const scrapedAt = new Date(vehicle.scrapedAt);
  const hoursSinceScraped = (Date.now() - scrapedAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceScraped < 4) return false;

  // Check if never checked or checked more than 4 hours ago
  if (!vehicle.lastExistenceCheck) return true;

  const lastCheck = new Date(vehicle.lastExistenceCheck);
  const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
  return hoursSinceCheck > 4;
}

export interface VehicleDetailProps {
  vehicle: Vehicle;
  onVehicleUpdate?: (_updatedVehicle: Vehicle) => void;
}

// Fallback icons
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

const LinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

export function VehicleDetail({ vehicle, onVehicleUpdate }: VehicleDetailProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [status, setStatus] = useState(vehicle.status);
  const [personalNotes, setPersonalNotes] = useState(vehicle.personalNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [localVehicle, setLocalVehicle] = useState(vehicle);

  // Modal state for lightbox
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);

  // Thumbnail navigation state
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);

  // Virtual Mechanic Summary state
  const [virtualMechanicSummary, setVirtualMechanicSummary] = useState(vehicle.virtualMechanicSummary || '');
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  // Full Mechanic Report state
  const [aiMechanicReport, setAiMechanicReport] = useState(vehicle.aiMechanicReport || '');
  const [isEditingFullReport, setIsEditingFullReport] = useState(false);
  const [isFullReportExpanded, setIsFullReportExpanded] = useState(false);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateSuccess, setTranslateSuccess] = useState(false);

  const photos = vehicle.photos && vehicle.photos.length > 0 ? vehicle.photos : vehicle.sourcePhotos;

  // Sync localVehicle with vehicle prop changes
  useEffect(() => {
    setLocalVehicle(vehicle);
    setVirtualMechanicSummary(vehicle.virtualMechanicSummary || '');
    setAiMechanicReport(vehicle.aiMechanicReport || '');
  }, [vehicle]);

  const handlePreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  // Modal handlers
  const handleOpenModal = (index: number) => {
    setModalPhotoIndex(index);
    setIsModalOpen(true);
  };

  // Thumbnail click handler
  const handleThumbnailClick = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  // Thumbnail navigation handlers (circular)
  const handleThumbnailPrevious = () => {
    setThumbnailStartIndex((prev) => {
      if (prev === 0) {
        // Wrap to end
        return Math.max(0, photos.length - 10);
      }
      return Math.max(prev - 2, 0);
    });
  };

  const handleThumbnailNext = () => {
    setThumbnailStartIndex((prev) => {
      const maxIndex = Math.max(0, photos.length - 10);
      if (prev >= maxIndex) {
        // Wrap to start
        return 0;
      }
      return Math.min(prev + 2, maxIndex);
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as Vehicle['status']);
    setIsSaving(true);
    try {
      const updated = await updateVehicle(vehicle.id, { status: newStatus });
      onVehicleUpdate?.(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
      setStatus(vehicle.status);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotesBlur = async () => {
    if (personalNotes === vehicle.personalNotes) return;

    setIsSaving(true);
    try {
      const updated = await updateVehicle(vehicle.id, { personalNotes });
      onVehicleUpdate?.(updated);
    } catch (error) {
      console.error('Failed to update notes:', error);
      setPersonalNotes(vehicle.personalNotes || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSummary = async () => {
    if (virtualMechanicSummary === vehicle.virtualMechanicSummary) {
      setIsEditingSummary(false);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateVehicle(vehicle.id, { virtualMechanicSummary });
      onVehicleUpdate?.(updated);
      setIsEditingSummary(false);
    } catch (error) {
      console.error('Failed to update mechanic summary:', error);
      setVirtualMechanicSummary(vehicle.virtualMechanicSummary || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSummary = () => {
    setVirtualMechanicSummary(vehicle.virtualMechanicSummary || '');
    setIsEditingSummary(false);
  };

  const handleSaveFullReport = async () => {
    if (aiMechanicReport === vehicle.aiMechanicReport) {
      setIsEditingFullReport(false);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateVehicle(vehicle.id, { aiMechanicReport });
      onVehicleUpdate?.(updated);
      setIsEditingFullReport(false);
    } catch (error) {
      console.error('Failed to update full mechanic report:', error);
      setAiMechanicReport(vehicle.aiMechanicReport || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelFullReport = () => {
    setAiMechanicReport(vehicle.aiMechanicReport || '');
    setIsEditingFullReport(false);
  };

  const handleGenerateDetailedReport = async () => {
    if (!confirm('Generate detailed mechanic report? This will use 1 AI credit.')) return;

    setIsGeneratingReport(true);
    setAnalyzeError(null);

    try {
      const updated = await analyzeVehicle(vehicle.id, false, true); // force=false, includeFullReport=true
      onVehicleUpdate?.(updated);
      // Update local state with new values
      setAiMechanicReport(updated.aiMechanicReport || '');
      setIsFullReportExpanded(true); // Auto-expand on success
      setAnalyzeSuccess(true);
      setTimeout(() => setAnalyzeSuccess(false), 3000);
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Report generation failed');
      setTimeout(() => setAnalyzeError(null), 5000);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleTranslate = async () => {
    if (!confirm('Translate this vehicle description? This will use AI credits.')) return;

    setIsTranslating(true);
    setTranslateError(null);
    setTranslateSuccess(false);

    try {
      // Check existence if needed (4-hour cache)
      if (shouldCheckExistence(localVehicle)) {
        const result = await checkVehicleExistence(vehicle.id);

        // Update local vehicle state with existence check result
        setLocalVehicle(prev => ({
          ...prev,
          isRemovedFromSource: result.isRemovedFromSource,
          lastExistenceCheck: result.lastExistenceCheck
        }));

        if (result.isRemovedFromSource) {
          setTranslateError('Cannot translate - vehicle has been removed from Otomoto');
          setTimeout(() => setTranslateError(null), 5000);
          return;
        }
      }

      const updated = await translateVehicle(vehicle.id, true);
      onVehicleUpdate?.(updated);
      setLocalVehicle(updated);
      setTranslateSuccess(true);
      setTimeout(() => setTranslateSuccess(false), 3000);
    } catch (error) {
      setTranslateError(error instanceof Error ? error.message : 'Translation failed');
      setTimeout(() => setTranslateError(null), 5000);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleQuickAnalysis = async () => {
    if (!confirm('Generate quick analysis (summary only)? This will use AI credits.')) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeSuccess(false);

    try {
      // Check existence if needed (4-hour cache)
      if (shouldCheckExistence(localVehicle)) {
        const result = await checkVehicleExistence(vehicle.id);

        // Update local vehicle state with existence check result
        setLocalVehicle(prev => ({
          ...prev,
          isRemovedFromSource: result.isRemovedFromSource,
          lastExistenceCheck: result.lastExistenceCheck
        }));

        if (result.isRemovedFromSource) {
          setAnalyzeError('Cannot analyze - vehicle has been removed from Otomoto');
          setTimeout(() => setAnalyzeError(null), 5000);
          return;
        }
      }

      const updated = await analyzeVehicle(vehicle.id, true, false); // force=true, includeFullReport=false
      onVehicleUpdate?.(updated);
      setLocalVehicle(updated);
      setVirtualMechanicSummary(updated.virtualMechanicSummary || '');
      setAnalyzeSuccess(true);
      setTimeout(() => setAnalyzeSuccess(false), 3000);
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Quick analysis failed');
      setTimeout(() => setAnalyzeError(null), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFullAnalysis = async () => {
    if (!confirm('Generate full analysis including detailed mechanic report? This will use more AI credits.')) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeSuccess(false);

    try {
      // Check existence if needed (4-hour cache)
      if (shouldCheckExistence(localVehicle)) {
        const result = await checkVehicleExistence(vehicle.id);

        // Update local vehicle state with existence check result
        setLocalVehicle(prev => ({
          ...prev,
          isRemovedFromSource: result.isRemovedFromSource,
          lastExistenceCheck: result.lastExistenceCheck
        }));

        if (result.isRemovedFromSource) {
          setAnalyzeError('Cannot analyze - vehicle has been removed from Otomoto');
          setTimeout(() => setAnalyzeError(null), 5000);
          return;
        }
      }

      const updated = await analyzeVehicle(vehicle.id, true, true); // force=true, includeFullReport=true
      onVehicleUpdate?.(updated);
      setLocalVehicle(updated);
      setVirtualMechanicSummary(updated.virtualMechanicSummary || '');
      setAiMechanicReport(updated.aiMechanicReport || '');
      setAnalyzeSuccess(true);
      setTimeout(() => setAnalyzeSuccess(false), 3000);
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Full analysis failed');
      setTimeout(() => setAnalyzeError(null), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTimestamp = (date: Date | string | undefined): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Mobile Sticky Header - MVP solution */}
      <div className="block lg:hidden sticky top-0 bg-white z-10 shadow-md p-4">
        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <select
            aria-label="status-mobile"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isSaving}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
          {/* Quick action buttons */}
          {!localVehicle.description && (
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 text-sm"
              title="Translate"
            >
              {isTranslating ? '...' : 'Translate'}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content (Left) */}
      <div className="flex-1 space-y-6">
      {/* Hero Section - Photo Gallery */}
      <section className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative">
          {photos.length > 0 ? (
            <>
              <img
                src={photos[currentPhotoIndex]}
                alt={`${vehicle.title} - Photo ${currentPhotoIndex + 1}`}
                className="w-full h-96 aspect-square object-cover cursor-pointer"
                onClick={() => handleOpenModal(currentPhotoIndex)}
                title="Click to view full size"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Previous photo"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Next photo"
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-96 aspect-square bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">No photos available</p>
            </div>
          )}
        </div>

        {/* Thumbnail Strip - Below Carousel */}
        {photos.length > 1 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2">
              {/* Left Arrow - Always visible */}
              <button
                onClick={handleThumbnailPrevious}
                className="flex-shrink-0 p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                aria-label="Previous thumbnails"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              {/* Thumbnails */}
              <div className="flex gap-2">
                {photos.slice(thumbnailStartIndex, thumbnailStartIndex + 10).map((photo, index) => {
                  const photoIndex = thumbnailStartIndex + index;
                  const isActive = photoIndex === currentPhotoIndex;

                  return (
                    <button
                      key={photoIndex}
                      onClick={() => handleThumbnailClick(photoIndex)}
                      className={`w-16 h-16 rounded overflow-hidden transition-all ${
                        isActive
                          ? 'opacity-100 ring-2 ring-blue-500 scale-105'
                          : 'opacity-40 hover:opacity-70'
                      }`}
                      aria-label={`View photo ${photoIndex + 1}`}
                    >
                      <img
                        src={photo}
                        alt={`Thumbnail ${photoIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right Arrow - Always visible */}
              <button
                onClick={handleThumbnailNext}
                className="flex-shrink-0 p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                aria-label="Next thumbnails"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Title and Price Overlay */}
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{vehicle.title}</h1>
                {/* Removed from Source Warning Badge */}
                {vehicle.isRemovedFromSource && (
                  <span className="bg-orange-100 text-orange-800 border border-orange-300 px-3 py-1 rounded text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Removed from Source
                  </span>
                )}
              </div>
              <p className="text-gray-600">{vehicle.year} • {vehicle.mileage.toLocaleString()} km</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {vehicle.pricePln.toLocaleString()} PLN
              </div>
              <div className="text-lg text-gray-600">
                €{vehicle.priceEur.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Analysis Section */}
      {(vehicle.personalFitScore !== null || vehicle.aiPriorityRating !== null || vehicle.aiMechanicReport || vehicle.virtualMechanicSummary) && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Analysis</h2>


          {vehicle.aiPrioritySummary && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Priority Summary</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{vehicle.aiPrioritySummary}</p>
            </div>
          )}

          {/* Virtual Mechanic Summary (Concise 3-5 bullet points) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Virtual Mechanic Summary</h3>
              {(virtualMechanicSummary || vehicle.virtualMechanicSummary) && !isEditingSummary ? (
                <button
                  onClick={() => setIsEditingSummary(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              ) : null}
            </div>
            {isEditingSummary ? (
              <div className="space-y-2">
                <textarea
                  value={virtualMechanicSummary}
                  onChange={(e) => setVirtualMechanicSummary(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-3 text-sm font-mono"
                  rows={8}
                  maxLength={2000}
                  disabled={isSaving}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSummary}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelSummary}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (virtualMechanicSummary || vehicle.virtualMechanicSummary) ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="prose prose-sm max-w-none prose-ul:my-2 prose-li:my-1 prose-p:my-2 prose-headings:my-3 prose-ul:pl-5 prose-li:marker:text-yellow-600">
                  <ReactMarkdown>{virtualMechanicSummary || vehicle.virtualMechanicSummary}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-l-4 border-gray-300 p-4 rounded text-gray-500 italic">
                Summary not generated for this vehicle. Run analysis to generate.
              </div>
            )}

            {/* Generate/View Detailed Report Button */}
            <div className="mt-3">
              {!aiMechanicReport && !vehicle.aiMechanicReport ? (
                <button
                  onClick={handleGenerateDetailedReport}
                  disabled={isGeneratingReport}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isGeneratingReport ? (
                    <>
                      <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span>Generating detailed report...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Generate detailed report</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setIsFullReportExpanded(!isFullReportExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>📋</span>
                  <span>{isFullReportExpanded ? 'Hide' : 'View'} detailed report</span>
                </button>
              )}
            </div>
          </div>

          {/* Full Detailed Mechanic Report (Collapsible) */}
          {(aiMechanicReport || vehicle.aiMechanicReport) && (
            <div className="mb-6">
              <button
                onClick={() => setIsFullReportExpanded(!isFullReportExpanded)}
                className="flex items-center justify-between w-full text-left mb-2 hover:text-blue-600 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">Full Detailed Report</h3>
                <span className="text-gray-600">
                  {isFullReportExpanded ? '▼' : '▶'}
                </span>
              </button>
              {isFullReportExpanded && (
                <div className="mt-2">
                  <div className="flex items-center justify-end mb-2">
                    {!isEditingFullReport ? (
                      <button
                        onClick={() => setIsEditingFullReport(true)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                  {isEditingFullReport ? (
                    <div className="space-y-2">
                      <textarea
                        value={aiMechanicReport}
                        onChange={(e) => setAiMechanicReport(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 text-sm font-mono"
                        rows={15}
                        disabled={isSaving}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveFullReport}
                          disabled={isSaving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelFullReport}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-l-4 border-gray-300 pl-4">
                      <article className="prose prose-slate max-w-none">
                        <ReactMarkdown>{aiMechanicReport || vehicle.aiMechanicReport}</ReactMarkdown>
                      </article>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {vehicle.aiDataSanityCheck && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Sanity Check</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{vehicle.aiDataSanityCheck}</p>
            </div>
          )}
        </section>
      )}

      {/* Overview Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>

        {vehicle.description && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{vehicle.description}</p>
          </div>
        )}

        {vehicle.features && vehicle.features.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Features</h3>
            <div className="flex flex-wrap gap-2">
              {vehicle.features.map((feature, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {vehicle.sourceParameters && Object.keys(vehicle.sourceParameters).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(vehicle.sourceParameters).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">{key}</span>
                  <span className="text-gray-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Seller Info Section */}
      {vehicle.sellerInfo && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Seller Information</h2>
          <div className="space-y-2">
            {vehicle.sellerInfo.name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Name</span>
                <span className="text-gray-900 font-medium">{vehicle.sellerInfo.name}</span>
              </div>
            )}
            {vehicle.sellerInfo.type && (
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="text-gray-900 font-medium capitalize">{vehicle.sellerInfo.type}</span>
              </div>
            )}
            {vehicle.sellerInfo.location && (
              <div className="flex justify-between">
                <span className="text-gray-600">Location</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vehicle.sellerInfo.location.split(',')[0].trim() + ', Poland')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {vehicle.sellerInfo.location}
                </a>
              </div>
            )}
            {vehicle.distanceFromWroclaw !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">Distance from Wrocław</span>
                <span className="text-gray-900 font-medium">{Math.round(vehicle.distanceFromWroclaw)} km</span>
              </div>
            )}
            {vehicle.sellerInfo.memberSince && (
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="text-gray-900 font-medium">{vehicle.sellerInfo.memberSince}</span>
              </div>
            )}
          </div>

          {/* Google Maps Embed */}
          {vehicle.sellerInfo.location && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Location Map</h3>
              <div className="w-full h-96 rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(vehicle.sellerInfo.location.split(',')[0].trim() + ', Poland')}`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Source Data Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Source Data</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Source</h3>
            <p className="text-gray-900">{vehicle.source.toUpperCase()}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Original Title</h3>
            <p className="text-gray-900">{vehicle.sourceTitle}</p>
          </div>

          {vehicle.sourceEquipment && Object.keys(vehicle.sourceEquipment).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Equipment</h3>
              <div className="space-y-3">
                {Object.entries(vehicle.sourceEquipment).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-800 mb-1">{category}</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Original Listing URL</h3>
            <a
              href={vehicle.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View on {vehicle.source.toUpperCase()}
              <LinkIcon className="w-4 h-4" />
            </a>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Published Date</h3>
            <p className="text-gray-900">{formatDate(vehicle.sourceCreatedAt)}</p>
          </div>
        </div>
      </section>

      {/* Timestamps Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Metadata</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Scraped At</span>
            <span className="text-gray-900">{formatTimestamp(vehicle.scrapedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Created At</span>
            <span className="text-gray-900">{formatTimestamp(vehicle.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Updated</span>
            <span className="text-gray-900">{formatTimestamp(vehicle.updatedAt)}</span>
          </div>
        </div>
      </section>

      {/* Mobile-Only: Scores and Workflow (visible below lg) */}
      <div className="block lg:hidden space-y-6">
        {/* AI Scores Section - Mobile */}
        {(vehicle.personalFitScore !== null || vehicle.aiPriorityRating !== null || vehicle.marketValueScore !== null) && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI Scores</h2>
            <div className="space-y-3">
              {vehicle.personalFitScore !== null && (
                <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-600">Personal Fit Score</div>
                  <div className="text-xl font-bold text-blue-600">{vehicle.personalFitScore}/10</div>
                </div>
              )}

              {vehicle.marketValueScore !== null && (
                <div className="bg-green-50 rounded-lg p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-600">Market Value</div>
                  <div className="text-xl font-bold text-green-600">{vehicle.marketValueScore}</div>
                </div>
              )}

              {vehicle.aiPriorityRating !== null && (
                <div className="bg-purple-50 rounded-lg p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-600">Priority Rating</div>
                  <div className="text-xl font-bold text-purple-600">{vehicle.aiPriorityRating}/10</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* My Workflow Section - Mobile */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Workflow</h2>

          <div className="space-y-4">
            {/* Note: Status dropdown is in sticky header on mobile, so we can skip it here or show action buttons */}

            {/* Action Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions
              </label>
              <div className="flex flex-col gap-2">
                {/* Translate - hide when translation exists */}
                {!localVehicle.description && (
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    title="Translate vehicle description"
                  >
                    {isTranslating ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <span>Translate</span>
                      </>
                    )}
                  </button>
                )}

                {/* Quick Analysis - hide when summary exists */}
                {!localVehicle.virtualMechanicSummary && (
                  <button
                    onClick={handleQuickAnalysis}
                    disabled={isAnalyzing || !localVehicle.description}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    title="Generate AI summary analysis (concise key insights)"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Quick Analysis</span>
                      </>
                    )}
                  </button>
                )}

                {/* Full Analysis - hide when full report exists */}
                {!localVehicle.aiMechanicReport && (
                  <button
                    onClick={handleFullAnalysis}
                    disabled={isAnalyzing || !localVehicle.description}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    title="Generate full detailed mechanic report (comprehensive analysis)"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Full Analysis</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {translateError && (
                <p className="mt-2 text-sm text-red-600">{translateError}</p>
              )}
              {translateSuccess && (
                <p className="mt-2 text-sm text-green-600">Translation completed successfully!</p>
              )}
              {analyzeError && (
                <p className="mt-2 text-sm text-red-600">{analyzeError}</p>
              )}
              {analyzeSuccess && (
                <p className="mt-2 text-sm text-green-600">Analysis completed successfully!</p>
              )}
            </div>

            <div>
              <label htmlFor="notes-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                Personal Notes
              </label>
              <textarea
                id="notes-mobile"
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                disabled={isSaving}
                placeholder="Add your notes about this vehicle..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-y"
                rows={4}
              />
            </div>
          </div>
        </section>
      </div>

      </div>
      {/* End Main Content */}

      {/* Sidebar (Right) - Desktop Sticky */}
      <aside className="hidden lg:block lg:sticky lg:top-0 lg:w-96 lg:max-h-screen lg:overflow-y-auto space-y-6 lg:pl-6 lg:border-l lg:border-gray-200">
        {/* AI Scores Section */}
        {(vehicle.personalFitScore !== null || vehicle.aiPriorityRating !== null || vehicle.marketValueScore !== null) && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI Scores</h2>
            <div className="space-y-3">
              {vehicle.personalFitScore !== null && (
                <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-600">Personal Fit Score</div>
                  <div className="text-xl font-bold text-blue-600">{vehicle.personalFitScore}/10</div>
                </div>
              )}

              {vehicle.marketValueScore !== null && (
                <div className="bg-green-50 rounded-lg p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-600">Market Value</div>
                  <div className="text-xl font-bold text-green-600">{vehicle.marketValueScore}</div>
                </div>
              )}

              {vehicle.aiPriorityRating !== null && (
                <div className="bg-purple-50 rounded-lg p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-600">Priority Rating</div>
                  <div className="text-xl font-bold text-purple-600">{vehicle.aiPriorityRating}/10</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* My Workflow Section */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Workflow</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isSaving}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            </div>

            {/* Action Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions
              </label>
              <div className="flex flex-col gap-2">
                {/* Translate - hide when translation exists */}
                {!localVehicle.description && (
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    title="Translate vehicle description"
                  >
                    {isTranslating ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <span>Translate</span>
                      </>
                    )}
                  </button>
                )}

                {/* Quick Analysis - hide when summary exists */}
                {!localVehicle.virtualMechanicSummary && (
                  <button
                    onClick={handleQuickAnalysis}
                    disabled={isAnalyzing || !localVehicle.description}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    title="Generate AI summary analysis (concise key insights)"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Quick Analysis</span>
                      </>
                    )}
                  </button>
                )}

                {/* Full Analysis - hide when full report exists */}
                {!localVehicle.aiMechanicReport && (
                  <button
                    onClick={handleFullAnalysis}
                    disabled={isAnalyzing || !localVehicle.description}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    title="Generate full detailed mechanic report (comprehensive analysis)"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Full Analysis</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {translateError && (
                <p className="mt-2 text-sm text-red-600">{translateError}</p>
              )}
              {translateSuccess && (
                <p className="mt-2 text-sm text-green-600">Translation completed successfully!</p>
              )}
              {analyzeError && (
                <p className="mt-2 text-sm text-red-600">{analyzeError}</p>
              )}
              {analyzeSuccess && (
                <p className="mt-2 text-sm text-green-600">Analysis completed successfully!</p>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Personal Notes
              </label>
              <textarea
                id="notes"
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                disabled={isSaving}
                placeholder="Add your notes about this vehicle..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-y"
                rows={4}
              />
            </div>
          </div>
        </section>
      </aside>
      </div>
      {/* End Desktop Two-Column Layout */}

      {/* Custom Modal - Image + Thumbnails */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* Close Button */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-white"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image Container - Takes remaining space above thumbnails */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setModalPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
                  aria-label="Previous photo"
                >
                  <ChevronLeftIcon className="w-8 h-8" />
                </button>
                <button
                  onClick={() => setModalPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
                  aria-label="Next photo"
                >
                  <ChevronRightIcon className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Main Image */}
            <img
              src={photos[modalPhotoIndex]}
              alt={`Photo ${modalPhotoIndex + 1}`}
              className="max-w-[95%] max-h-[90%] object-contain"
            />

            {/* Photo Counter */}
            {photos.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {modalPhotoIndex + 1} / {photos.length}
              </div>
            )}
          </div>

          {/* Thumbnail Strip - Below Image */}
          {photos.length > 1 && (
            <div className="w-full bg-black/95 border-t border-gray-700">
              <div className="flex items-center justify-center gap-2 p-4">
                {/* Left Arrow */}
                <button
                  onClick={handleThumbnailPrevious}
                  className="flex-shrink-0 p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                  aria-label="Previous thumbnails"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-white" />
                </button>

                {/* Thumbnails */}
                <div className="flex gap-2">
                  {photos
                    .slice(thumbnailStartIndex, thumbnailStartIndex + 10)
                    .map((photo, index) => {
                      const photoIndex = thumbnailStartIndex + index;
                      const isActive = photoIndex === modalPhotoIndex;

                      return (
                        <button
                          key={photoIndex}
                          onClick={() => setModalPhotoIndex(photoIndex)}
                          className={`w-16 h-16 rounded overflow-hidden transition-all ${
                            isActive
                              ? 'opacity-100 ring-2 ring-blue-500 scale-105'
                              : 'opacity-40 hover:opacity-70'
                          }`}
                          aria-label={`View photo ${photoIndex + 1}`}
                        >
                          <img
                            src={photo}
                            alt={`Thumbnail ${photoIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                </div>

                {/* Right Arrow */}
                <button
                  onClick={handleThumbnailNext}
                  className="flex-shrink-0 p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                  aria-label="Next thumbnails"
                >
                  <ChevronRightIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
