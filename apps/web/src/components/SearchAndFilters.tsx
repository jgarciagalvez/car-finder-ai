'use client';

import { SortOption } from '@/lib/utils';
import { VehicleStatus } from '@car-finder/types';
import { DistanceFilter } from '@/context/VehicleContext';

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

interface SearchAndFiltersProps {
  searchQuery?: string;
  onSearchChange?: (_query: string) => void;
  vehicleCount?: number;
  totalCount?: number;
  sortBy?: SortOption;
  onSortChange?: (_sortBy: SortOption) => void;
  statusFilter?: VehicleStatus[] | null;
  onStatusFilterChange?: (_statusFilter: VehicleStatus[] | null) => void;
  distanceFilter?: DistanceFilter;
  onDistanceFilterChange?: (_distanceFilter: DistanceFilter) => void;
}

export function SearchAndFilters({
  searchQuery = '',
  onSearchChange,
  vehicleCount = 0,
  totalCount,
  sortBy = 'priority',
  onSortChange,
  statusFilter = null,
  onStatusFilterChange,
  distanceFilter = 'all',
  onDistanceFilterChange
}: SearchAndFiltersProps) {
  return (
    <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search and Filters - Single Row */}
        <div className="flex flex-col lg:flex-row gap-3 items-center">
          {/* Search Bar */}
          <div className="flex-1 w-full relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search cars..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filters and Sorting */}
          <div className="flex gap-2 items-center flex-wrap">
            {/* Vehicle Count - Inline */}
            <span className="text-sm text-gray-600 whitespace-nowrap px-2">
              {totalCount !== undefined ? (
                <>{totalCount} total</>
              ) : (
                <>{vehicleCount} cars</>
              )}
            </span>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange?.(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="priority">Sort: Priority</option>
                <option value="price_asc">Sort: Price (Low to High)</option>
                <option value="price_desc">Sort: Price (High to Low)</option>
                <option value="year_desc">Sort: Year (Newest)</option>
                <option value="year_asc">Sort: Year (Oldest)</option>
                <option value="mileage_asc">Sort: Mileage (Lowest)</option>
                <option value="mileage_desc">Sort: Mileage (Highest)</option>
                <option value="distance_asc">Sort: Distance (Closest)</option>
                <option value="distance_desc">Sort: Distance (Farthest)</option>
                <option value="personal_fit">Sort: Personal Fit</option>
                <option value="date_added_desc">Sort: Date Added (Newest)</option>
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
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

            {/* Distance Filter */}
            <div className="relative">
              <select
                value={distanceFilter}
                onChange={(e) => onDistanceFilterChange?.(e.target.value as DistanceFilter)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Distances</option>
                <option value="within-50">Within 50 km</option>
                <option value="50-100">50-100 km</option>
                <option value="100-plus">100+ km</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              {distanceFilter !== 'all' && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  1
                </span>
              )}
            </div>

            {/* Advanced Filters Button */}
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-1 transition-colors text-sm">
              <FilterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
