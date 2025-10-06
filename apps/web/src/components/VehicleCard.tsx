'use client';

import { Vehicle } from '@car-finder/types';
import { formatPrice, formatMileage, formatYear, getStatusColor, getStatusLabel } from '@/lib/utils';
import Link from 'next/link';

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <Link href={`/vehicle/${vehicle.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden cursor-pointer">
        {/* Vehicle Image */}
        <div className="aspect-video bg-gray-200 relative">
          {vehicle.photos.length > 0 ? (
            <img
              src={vehicle.photos[0]}
              alt={vehicle.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No Image Available
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
              {getStatusLabel(vehicle.status)}
            </span>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
            {vehicle.title}
          </h3>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Year:</span>
              <span className="font-medium">{formatYear(vehicle.year)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Mileage:</span>
              <span className="font-medium">{formatMileage(vehicle.mileage)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Source:</span>
              <span className="font-medium capitalize">{vehicle.source}</span>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-lg font-bold text-gray-900">
              {formatPrice(vehicle.pricePln, vehicle.priceEur)}
            </div>
          </div>

          {/* AI Scores (if available) */}
          {(vehicle.personalFitScore || vehicle.aiPriorityRating) && (
            <div className="mt-3 flex gap-2">
              {vehicle.personalFitScore && (
                <div className="bg-blue-50 px-2 py-1 rounded text-xs">
                  Fit: {vehicle.personalFitScore}/10
                </div>
              )}
              {vehicle.aiPriorityRating && (
                <div className="bg-green-50 px-2 py-1 rounded text-xs">
                  Priority: {vehicle.aiPriorityRating}/10
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
