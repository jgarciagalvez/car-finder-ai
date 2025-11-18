'use client';

/**
 * AnalysisStatusBadge Component
 *
 * Displays a small, subtle badge indicating the AI analysis completeness level:
 * - "📊 Summary" - Concise summary exists (no full report)
 * - "📋 Full" - Both summary and full detailed report exist
 * - "⚠️ No Analysis" - No AI analysis performed yet
 *
 * Only shown when at least one AI data field is populated.
 */

interface AnalysisStatusBadgeProps {
  virtualMechanicSummary: string | null;
  aiMechanicReport: string | null;
}

export function AnalysisStatusBadge({
  virtualMechanicSummary,
  aiMechanicReport
}: AnalysisStatusBadgeProps) {
  // No analysis performed yet
  if (!virtualMechanicSummary) {
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">
        <span>⚠️</span>
        <span>No Analysis</span>
      </span>
    );
  }

  // Summary only (no full report)
  if (!aiMechanicReport) {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">
        <span>📊</span>
        <span>Summary</span>
      </span>
    );
  }

  // Both summary and full report exist
  return (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium border border-green-200">
      <span>📋</span>
      <span>Full</span>
    </span>
  );
}
