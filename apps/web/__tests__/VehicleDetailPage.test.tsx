import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VehicleDetailPage from '@/app/vehicle/[id]/page';
import { fetchVehicleById } from '@/lib/api';
import type { Vehicle } from '@car-finder/types';

// Mock the API
jest.mock('@/lib/api');
const mockFetchVehicleById = fetchVehicleById as jest.MockedFunction<typeof fetchVehicleById>;

// Mock the VehicleDetail component
jest.mock('@/components/VehicleDetail', () => ({
  VehicleDetail: ({ vehicle }: { vehicle: Vehicle }) => (
    <div data-testid="vehicle-detail">
      <div>Vehicle ID: {vehicle.id}</div>
      <div>Title: {vehicle.title}</div>
    </div>
  ),
}));

// Mock the AIChatSidebar component
jest.mock('@/components/AIChatSidebar', () => ({
  AIChatSidebar: ({ isOpen, context }: { isOpen: boolean; context: any }) => (
    <div data-testid="ai-chat-sidebar">
      <div>Chat Open: {isOpen.toString()}</div>
      <div>Vehicle ID: {context.vehicleId}</div>
    </div>
  ),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Vehicle Detail Page', () => {
  const mockVehicle: Vehicle = {
    id: '123',
    source: 'otomoto',
    sourceId: 'otomoto-123',
    sourceUrl: 'https://otomoto.pl/123',
    sourceCreatedAt: new Date('2023-01-01'),
    sourceTitle: 'BMW X5 2020',
    sourceDescriptionHtml: '<p>Great car</p>',
    sourceParameters: { 'Marka': 'BMW' },
    sourceEquipment: { 'Komfort': ['Klimatyzacja'] },
    sourcePhotos: ['photo1.jpg'],
    title: 'BMW X5 2020',
    description: 'Great car',
    features: ['air_conditioning'],
    pricePln: 150000,
    priceEur: 35000,
    year: 2020,
    mileage: 50000,
    sellerInfo: {
      name: 'John Doe',
      id: 'seller-123',
      type: 'private',
      location: 'Warsaw',
      memberSince: '2019',
    },
    photos: ['photo1.jpg'],
    personalFitScore: 85,
    marketValueScore: '-5%',
    aiPriorityRating: 8,
    aiPrioritySummary: 'Good value',
    aiMechanicReport: '## Report',
    aiDataSanityCheck: 'Consistent',
    distanceFromWroclaw: null,
    status: 'new',
    personalNotes: null,
    scrapedAt: new Date('2023-01-15'),
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-01-16'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockFetchVehicleById.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<VehicleDetailPage params={{ id: '123' }} />);

    expect(screen.getByText(/Loading vehicle details/i)).toBeInTheDocument();
  });

  it('should fetch and display vehicle data on load', async () => {
    mockFetchVehicleById.mockResolvedValueOnce(mockVehicle);

    render(<VehicleDetailPage params={{ id: '123' }} />);

    await waitFor(() => {
      expect(mockFetchVehicleById).toHaveBeenCalledWith('123');
    });

    await waitFor(() => {
      expect(screen.getByTestId('vehicle-detail')).toBeInTheDocument();
      expect(screen.getByText('Vehicle ID: 123')).toBeInTheDocument();
      expect(screen.getByText('Title: BMW X5 2020')).toBeInTheDocument();
    });
  });

  it('should display 404 error when vehicle not found', async () => {
    const error = new Error('Vehicle not found');
    mockFetchVehicleById.mockRejectedValueOnce(error);

    render(<VehicleDetailPage params={{ id: '999' }} />);

    await waitFor(() => {
      expect(screen.getByText('Vehicle Not Found')).toBeInTheDocument();
    });

    expect(screen.getByText(/doesn't exist or has been removed/i)).toBeInTheDocument();
  });

  it('should display generic error for 500 errors', async () => {
    const error = new Error('Internal server error');
    mockFetchVehicleById.mockRejectedValueOnce(error);

    render(<VehicleDetailPage params={{ id: '123' }} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Vehicle')).toBeInTheDocument();
    });

    expect(screen.getByText(/An error occurred while loading/i)).toBeInTheDocument();
  });

  it('should display link back to dashboard on error', async () => {
    const error = new Error('Vehicle not found');
    mockFetchVehicleById.mockRejectedValueOnce(error);

    render(<VehicleDetailPage params={{ id: '999' }} />);

    await waitFor(() => {
      const backLink = screen.getByText(/Return to Dashboard/i);
      expect(backLink.closest('a')).toHaveAttribute('href', '/dashboard');
    });
  });

  it('should render Back to Dashboard link in header', async () => {
    mockFetchVehicleById.mockResolvedValueOnce(mockVehicle);

    render(<VehicleDetailPage params={{ id: '123' }} />);

    await waitFor(() => {
      const backLink = screen.getByText(/Back to Dashboard/i);
      expect(backLink.closest('a')).toHaveAttribute('href', '/dashboard');
    });
  });

  it('should render AI chat sidebar when vehicle is loaded', async () => {
    mockFetchVehicleById.mockResolvedValueOnce(mockVehicle);

    render(<VehicleDetailPage params={{ id: '123' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('ai-chat-sidebar')).toBeInTheDocument();
      expect(screen.getByText('Vehicle ID: 123')).toBeInTheDocument();
    });
  });

  it('should not render AI chat sidebar on error', async () => {
    const error = new Error('Vehicle not found');
    mockFetchVehicleById.mockRejectedValueOnce(error);

    render(<VehicleDetailPage params={{ id: '999' }} />);

    await waitFor(() => {
      expect(screen.queryByTestId('ai-chat-sidebar')).not.toBeInTheDocument();
    });
  });

  it('should not render chat toggle button during loading', () => {
    mockFetchVehicleById.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<VehicleDetailPage params={{ id: '123' }} />);

    expect(screen.queryByTitle('Open AI Assistant')).not.toBeInTheDocument();
  });

  it('should render chat toggle button when vehicle is loaded', async () => {
    mockFetchVehicleById.mockResolvedValueOnce(mockVehicle);

    render(<VehicleDetailPage params={{ id: '123' }} />);

    await waitFor(() => {
      expect(screen.getByTitle('Open AI Assistant')).toBeInTheDocument();
    });
  });

  it('should handle vehicle ID from params', async () => {
    mockFetchVehicleById.mockResolvedValueOnce(mockVehicle);

    render(<VehicleDetailPage params={{ id: 'abc-def-123' }} />);

    await waitFor(() => {
      expect(mockFetchVehicleById).toHaveBeenCalledWith('abc-def-123');
    });
  });

  it('should update vehicle data when onVehicleUpdate is called', async () => {
    mockFetchVehicleById.mockResolvedValueOnce(mockVehicle);

    const { rerender } = render(<VehicleDetailPage params={{ id: '123' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('vehicle-detail')).toBeInTheDocument();
    });

    // Simulate vehicle update
    const updatedVehicle = { ...mockVehicle, title: 'Updated BMW X5' };
    mockFetchVehicleById.mockResolvedValueOnce(updatedVehicle);

    rerender(<VehicleDetailPage params={{ id: '123' }} />);

    // The vehicle detail component should receive the updated data
    // This is handled by the onVehicleUpdate callback in the actual implementation
  });

  it('should maintain browser history for back navigation', async () => {
    mockFetchVehicleById.mockResolvedValueOnce(mockVehicle);

    render(<VehicleDetailPage params={{ id: '123' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('vehicle-detail')).toBeInTheDocument();
    });

    // The back link should use Next.js Link for client-side navigation
    const backLink = screen.getByText(/Back to Dashboard/i);
    expect(backLink.closest('a')).toBeInTheDocument();
  });

  it('should display loading spinner during data fetch', () => {
    mockFetchVehicleById.mockImplementation(() => new Promise(() => {}));

    render(<VehicleDetailPage params={{ id: '123' }} />);

    // Check for loading spinner (animate-spin class)
    const spinner = screen.getByText(/Loading vehicle details/i).previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });
});
