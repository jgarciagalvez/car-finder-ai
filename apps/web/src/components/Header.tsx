'use client';

import { useState } from 'react';

// Icons
const VanIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v14l-6-2.5L6 19z"/>
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface HeaderProps {
  vehicleCount?: number;
  lastUpdated?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
}

export function Header({ vehicleCount = 0, lastUpdated, onRefresh, onSettings }: HeaderProps) {
  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <VanIcon className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Car Finder AI</h1>
              <p className="text-blue-100 text-sm">Smart car hunting for Wrocław</p>
            </div>
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center space-x-6">
            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-right">
                <p className="text-blue-100 text-sm">Last updated</p>
                <p className="text-white font-medium">{lastUpdated}</p>
              </div>
            )}

            {/* Vehicle Count */}
            <div className="bg-blue-500 px-4 py-2 rounded-lg">
              <p className="text-blue-100 text-sm">Vehicles tracked</p>
              <p className="text-white font-bold text-lg">{vehicleCount}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onRefresh}
                className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                title="Refresh Data"
              >
                <RefreshIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>

              <button
                onClick={onSettings}
                className="bg-blue-500 hover:bg-blue-400 text-white p-2 rounded-lg transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
