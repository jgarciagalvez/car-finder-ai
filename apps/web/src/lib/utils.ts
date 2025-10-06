import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
    case 'deleted':
      return 'Deleted';
    default:
      return status;
  }
}
