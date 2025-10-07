'use client';

import { notFound } from 'next/navigation';
import { AIChatSidebar } from '@/components/AIChatSidebar';
import { useState } from 'react';
// Fallback icon if Heroicons are not available
const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
  </svg>
);

interface VehicleDetailPageProps {
  params: {
    id: string;
  };
}

export default function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // For now, this is a placeholder implementation
  // In future stories, this will show detailed vehicle information
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className={`transition-all duration-300 ${isChatOpen ? 'mr-96' : 'mr-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Vehicle Details
            </h1>
            <p className="text-gray-600">
              Vehicle ID: {params.id}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Detailed vehicle view will be implemented in future stories.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Toggle Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-40"
          title="Open AI Assistant"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      )}

      {/* AI Chat Sidebar */}
      <AIChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        context={{ view: 'detail', vehicleId: params.id }}
      />
    </div>
  );
}
