import { notFound } from 'next/navigation';

interface VehicleDetailPageProps {
  params: {
    id: string;
  };
}

export default function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  // For now, this is a placeholder implementation
  // In future stories, this will show detailed vehicle information
  return (
    <div className="min-h-screen bg-gray-50">
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
  );
}
