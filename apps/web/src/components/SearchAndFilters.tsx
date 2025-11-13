'use client';

import { SortOption } from '@/lib/utils';
import { VehicleStatus } from '@car-finder/types';

// Icons
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ArrowPathIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

interface SearchAndFiltersProps {
  searchQuery?: string;
  onSearchChange?: (_query: string) => void;
  onScrapeNew?: () => void;
  onRefresh?: () => void;
  vehicleCount?: number;
  totalCount?: number;
  sortBy?: SortOption;
  onSortChange?: (_sortBy: SortOption) => void;
  statusFilter?: VehicleStatus[] | null;
  onStatusFilterChange?: (_statusFilter: VehicleStatus[] | null) => void;
}

export function SearchAndFilters({
  searchQuery = '',
  onSearchChange,
  onScrapeNew,
  onRefresh,
  vehicleCount = 0,
  totalCount,
  sortBy = 'priority',
  onSortChange,
  statusFilter = null,
  onStatusFilterChange
}: SearchAndFiltersProps) {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title and Scrape Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Car Finder AI</h2>
            <p className="text-gray-600 mt-1">
              {statusFilter && statusFilter.length > 0 && totalCount !== undefined ? (
                <>Showing {vehicleCount} of {totalCount} cars</>
              ) : (
                <>{vehicleCount} cars found</>
              )}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              title="Refresh vehicle list"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onScrapeNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Scrape New Listings</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search cars..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters and Sorting */}
          <div className="flex gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange?.(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="priority">Sort: Priority</option>
                <option value="price_asc">Sort: Price (Low to High)</option>
                <option value="price_desc">Sort: Price (High to Low)</option>
                <option value="year_desc">Sort: Year (Newest)</option>
                <option value="year_asc">Sort: Year (Oldest)</option>
                <option value="mileage_asc">Sort: Mileage (Lowest)</option>
                <option value="mileage_desc">Sort: Mileage (Highest)</option>
                <option value="personal_fit">Sort: Personal Fit</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter && statusFilter.length === 1 ? statusFilter[0] : 'all'}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    onStatusFilterChange?.(null);
                  } else {
                    onStatusFilterChange?.([value as VehicleStatus]);
                  }
                }}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="to_contact">To Contact</option>
                <option value="contacted">Contacted</option>
                <option value="to_visit">To Visit</option>
                <option value="visited">Visited</option>
                <option value="not_interested">Not Interested</option>
                <option value="deleted">Deleted</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              {statusFilter && statusFilter.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {statusFilter.length}
                </span>
              )}
            </div>

            {/* Advanced Filters Button */}
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg flex items-center space-x-2 transition-colors">
              <FilterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
