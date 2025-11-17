'use client';

import { Vehicle } from '@car-finder/types';
import { useState } from 'react';
import { updateVehicle, analyzeVehicle } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

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

  // Virtual Mechanic Summary state
  const [virtualMechanicSummary, setVirtualMechanicSummary] = useState(vehicle.virtualMechanicSummary || '');
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  // Full Mechanic Report state
  const [aiMechanicReport, setAiMechanicReport] = useState(vehicle.aiMechanicReport || '');
  const [isEditingFullReport, setIsEditingFullReport] = useState(false);
  const [isFullReportExpanded, setIsFullReportExpanded] = useState(false);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);

  const photos = vehicle.photos && vehicle.photos.length > 0 ? vehicle.photos : vehicle.sourcePhotos;

  const handlePreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
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

  const handleAnalyzeVehicle = async (force: boolean = false) => {
    if (force && !confirm('Force re-analyze this vehicle? This will use AI credits.')) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeSuccess(false);

    try {
      const updated = await analyzeVehicle(vehicle.id, force);
      onVehicleUpdate?.(updated);
      // Update local state with new values
      setVirtualMechanicSummary(updated.virtualMechanicSummary || '');
      setAiMechanicReport(updated.aiMechanicReport || '');
      setAnalyzeSuccess(true);
      setTimeout(() => setAnalyzeSuccess(false), 3000);
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Analysis failed');
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
    <div className="space-y-6">
      {/* Hero Section - Photo Gallery */}
      <section className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative">
          {photos.length > 0 ? (
            <>
              <img
                src={photos[currentPhotoIndex]}
                alt={`${vehicle.title} - Photo ${currentPhotoIndex + 1}`}
                className="w-full h-96 object-cover"
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
            <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">No photos available</p>
            </div>
          )}
        </div>

        {/* Title and Price Overlay */}
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{vehicle.title}</h1>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {vehicle.personalFitScore !== null && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Personal Fit Score</div>
                <div className="text-3xl font-bold text-blue-600">{vehicle.personalFitScore}/100</div>
              </div>
            )}

            {vehicle.marketValueScore !== null && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Market Value</div>
                <div className="text-3xl font-bold text-green-600">{vehicle.marketValueScore}</div>
              </div>
            )}

            {vehicle.aiPriorityRating !== null && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Priority Rating</div>
                <div className="text-3xl font-bold text-purple-600">{vehicle.aiPriorityRating}/10</div>
              </div>
            )}
          </div>

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

      {/* Workflow Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Workflow</h2>

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

          {/* AI Analysis Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Analysis
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleAnalyzeVehicle(false)}
                disabled={isAnalyzing}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Analyze missing data only"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
              <button
                onClick={() => handleAnalyzeVehicle(true)}
                disabled={isAnalyzing}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Force re-analyze all data (uses AI credits)"
              >
                {isAnalyzing ? 'Analyzing...' : 'Force Re-analyze'}
              </button>
            </div>
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
    </div>
  );
}
