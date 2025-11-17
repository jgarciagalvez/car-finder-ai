'use client';

interface PlaceholderNotificationProps {
  vehicleId: string;
  message: string;
  onDismiss: (_vehicleId: string) => void;
}

// X icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function PlaceholderNotification({
  vehicleId,
  message,
  onDismiss
}: PlaceholderNotificationProps) {
  return (
    <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 flex justify-between items-center">
      <span className="text-sm text-gray-600">{message}</span>
      <button
        onClick={() => onDismiss(vehicleId)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
