import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Vehicle } from '@car-finder/types';

export type SortOption =
  | 'priority'
  | 'price_asc'
  | 'price_desc'
  | 'year_desc'
  | 'year_asc'
  | 'mileage_asc'
  | 'mileage_desc'
  | 'personal_fit'
  | 'distance_asc'
  | 'distance_desc'
  | 'date_added_desc';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(pricePln: number, priceEur: number): string {
  return `${pricePln.toLocaleString('pl-PL')} PLN (€${priceEur.toLocaleString('de-DE')})`;
}

export function formatMileage(mileage: number): string {
  return `${mileage.toLocaleString('pl-PL')} km`;
}

export function formatYear(year: number): string {
  return year.toString();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800';
    case 'to_contact':
      return 'bg-yellow-100 text-yellow-800';
    case 'contacted':
      return 'bg-orange-100 text-orange-800';
    case 'to_visit':
      return 'bg-purple-100 text-purple-800';
    case 'visited':
      return 'bg-green-100 text-green-800';
    case 'not_interested':
      return 'bg-red-100 text-red-800';
    case 'deleted':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'new':
      return 'New';
    case 'to_contact':
      return 'To Contact';
    case 'contacted':
      return 'Contacted';
    case 'to_visit':
      return 'To Visit';
    case 'visited':
      return 'Visited';
    case 'not_interested':
      return 'Not Interested';
    case 'deleted':
      return 'Deleted';
    default:
      return status;
  }
}

// Score color coding helpers
export function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-50 border-gray-200 text-gray-600';

  if (score >= 80) return 'bg-green-50 border-green-200 text-green-700';
  if (score >= 60) return 'bg-yellow-50 border-yellow-200 text-yellow-700';
  return 'bg-red-50 border-red-200 text-red-700';
}

export function getScoreTextColor(score: number | null): string {
  if (score === null) return 'text-gray-600';

  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export function getMarketValueColor(marketValue: string | null): string {
  if (!marketValue) return 'bg-gray-50 border-gray-200 text-gray-600';

  // Good deal (negative percentage means below market)
  if (marketValue.startsWith('-')) return 'bg-green-50 border-green-200 text-green-700';

  // Market average
  if (marketValue === 'market_avg') return 'bg-gray-50 border-gray-200 text-gray-600';

  // Overpriced (positive percentage means above market)
  return 'bg-red-50 border-red-200 text-red-700';
}

export function getMarketValueTextColor(marketValue: string | null): string {
  if (!marketValue) return 'text-gray-600';

  if (marketValue.startsWith('-')) return 'text-green-600';
  if (marketValue === 'market_avg') return 'text-gray-600';
  return 'text-red-600';
}

export function formatMarketValue(marketValue: string | null): string {
  if (!marketValue) return 'N/A';
  if (marketValue === 'market_avg') return 'Market';
  return marketValue;
}

// Sorting functions
export function sortVehicles(vehicles: Vehicle[], sortBy: SortOption): Vehicle[] {
  const sorted = [...vehicles]; // Create copy to avoid mutation

  // Helper to push not_interested and deleted to end
  const pushUnwantedToEnd = (a: Vehicle, b: Vehicle): number => {
    const aUnwanted = a.status === 'not_interested' || a.status === 'deleted';
    const bUnwanted = b.status === 'not_interested' || b.status === 'deleted';

    if (aUnwanted && !bUnwanted) return 1;  // a goes after b
    if (!aUnwanted && bUnwanted) return -1; // a goes before b
    return 0; // Both wanted or both unwanted, continue with normal sort
  };

  sorted.sort((a, b) => {
    // First, check for unwanted statuses (only for priority sort)
    if (sortBy === 'priority') {
      const unwantedSort = pushUnwantedToEnd(a, b);
      if (unwantedSort !== 0) return unwantedSort;
    }

    // Then apply the specific sort logic
    switch (sortBy) {
      case 'priority':
        return (b.aiPriorityRating ?? b.personalFitScore ?? 0) -
               (a.aiPriorityRating ?? a.personalFitScore ?? 0);
      case 'price_asc':
        return a.priceEur - b.priceEur;
      case 'price_desc':
        return b.priceEur - a.priceEur;
      case 'year_desc':
        return b.year - a.year;
      case 'year_asc':
        return a.year - b.year;
      case 'mileage_asc':
        return a.mileage - b.mileage;
      case 'mileage_desc':
        return b.mileage - a.mileage;
      case 'personal_fit':
        return (b.personalFitScore ?? 0) - (a.personalFitScore ?? 0);
      case 'distance_asc':
        // Sort null distances to end
        if (a.distanceFromWroclaw === null) return 1;
        if (b.distanceFromWroclaw === null) return -1;
        return a.distanceFromWroclaw - b.distanceFromWroclaw;
      case 'distance_desc':
        // Sort null distances to end
        if (a.distanceFromWroclaw === null) return 1;
        if (b.distanceFromWroclaw === null) return -1;
        return b.distanceFromWroclaw - a.distanceFromWroclaw;
      case 'date_added_desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  return sorted;
}

// Helper function to compare two vehicles by a single sort option
function compareVehicles(a: Vehicle, b: Vehicle, sortOption: SortOption): number {
  // Handle unwanted statuses for priority sort only
  if (sortOption === 'priority') {
    const aUnwanted = a.status === 'not_interested' || a.status === 'deleted';
    const bUnwanted = b.status === 'not_interested' || b.status === 'deleted';

    if (aUnwanted && !bUnwanted) return 1;
    if (!aUnwanted && bUnwanted) return -1;
  }

  switch (sortOption) {
    case 'priority':
      return (b.aiPriorityRating ?? b.personalFitScore ?? 0) -
             (a.aiPriorityRating ?? a.personalFitScore ?? 0);
    case 'price_asc':
      return a.priceEur - b.priceEur;
    case 'price_desc':
      return b.priceEur - a.priceEur;
    case 'year_desc':
      return b.year - a.year;
    case 'year_asc':
      return a.year - b.year;
    case 'mileage_asc':
      return a.mileage - b.mileage;
    case 'mileage_desc':
      return b.mileage - a.mileage;
    case 'personal_fit':
      return (b.personalFitScore ?? 0) - (a.personalFitScore ?? 0);
    case 'distance_asc':
      if (a.distanceFromWroclaw === null) return 1;
      if (b.distanceFromWroclaw === null) return -1;
      return a.distanceFromWroclaw - b.distanceFromWroclaw;
    case 'distance_desc':
      if (a.distanceFromWroclaw === null) return 1;
      if (b.distanceFromWroclaw === null) return -1;
      return b.distanceFromWroclaw - a.distanceFromWroclaw;
    case 'date_added_desc':
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    default:
      return 0;
  }
}

// Compound sorting with multiple sort criteria (last in stack = primary sort)
export function sortVehiclesCompound(vehicles: Vehicle[], sortStack: SortOption[]): Vehicle[] {
  if (sortStack.length === 0) return vehicles;

  const sorted = [...vehicles];

  sorted.sort((a, b) => {
    // Apply sorts from end of stack (most recent = primary)
    // Iterate backwards through stack for tiebreaking
    for (let i = sortStack.length - 1; i >= 0; i--) {
      const comparison = compareVehicles(a, b, sortStack[i]);
      if (comparison !== 0) return comparison;
      // If equal, continue to next sort in stack (tiebreaker)
    }
    return 0; // All sorts equal, maintain stable order
  });

  return sorted;
}
