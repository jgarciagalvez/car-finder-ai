import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VehicleDetail } from '@/components/VehicleDetail';
import { updateVehicle } from '@/lib/api';
import type { Vehicle } from '@car-finder/types';

// Mock the API
jest.mock('@/lib/api');
const mockUpdateVehicle = updateVehicle as jest.MockedFunction<typeof updateVehicle>;

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

// Mock yet-another-react-lightbox
jest.mock('yet-another-react-lightbox', () => {
  return function MockLightbox({ open, close, index, slides }: any) {
    if (!open) return null;
    return (
      <div data-testid="lightbox-modal">
        <button onClick={close} data-testid="lightbox-close">Close</button>
        <div data-testid="lightbox-image">{slides[index]?.src}</div>
        <div data-testid="lightbox-counter">{index + 1} / {slides.length}</div>
      </div>
    );
  };
});

jest.mock('yet-another-react-lightbox/plugins/thumbnails', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('VehicleDetail Component', () => {
  const mockVehicle: Vehicle = {
    id: '123',
    source: 'otomoto',
    sourceId: 'otomoto-123',
    sourceUrl: 'https://otomoto.pl/123',
    sourceCreatedAt: new Date('2023-01-01'),
    sourceTitle: 'BMW X5 2020',
    sourceDescriptionHtml: '<p>Great car</p>',
    sourceParameters: {
      'Marka': 'BMW',
      'Model': 'X5',
      'Moc': '300 KM',
      'Przebieg': '50000 km',
    },
    sourceEquipment: {
      'Komfort': ['Klimatyzacja', 'Skórzane fotele'],
      'Bezpieczeństwo': ['ABS', 'Airbag'],
    },
    sourcePhotos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    title: 'BMW X5 2020',
    description: 'Great car with low mileage',
    features: ['air_conditioning', 'leather_seats', 'abs', 'airbag'],
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
    photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    personalFitScore: 8.5,
    marketValueScore: '-5%',
    aiPriorityRating: 8,
    aiPrioritySummary: 'Good value for money. Low mileage for the year.',
    aiMechanicReport: '## Inspection Report\n\n**Overall Condition**: Good\n\n- Engine: No issues\n- Transmission: Smooth operation\n- Suspension: Normal wear',
    virtualMechanicSummary: '- **BMW X5 (N55 engine)** has good reliability reputation\n- Main concern: **Oil consumption** at higher mileage\n- At 50k km, expect routine maintenance only',
    aiDataSanityCheck: 'All data appears consistent',
    distanceFromWroclaw: null,
    status: 'new',
    personalNotes: null,
    isRemovedFromSource: false,
    lastExistenceCheck: null,
    scrapedAt: new Date('2023-01-15'),
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-01-16'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render vehicle title and price', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getAllByText('BMW X5 2020').length).toBeGreaterThan(0);
    expect(screen.getByText(/150,000 PLN/)).toBeInTheDocument();
    expect(screen.getByText(/€35,000/)).toBeInTheDocument();
  });

  it('should render vehicle year and mileage', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getAllByText(/2020/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50,000 km/).length).toBeGreaterThan(0);
  });

  it('should render photo gallery with navigation', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);

    // Check for photo counter
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('should navigate through photos when clicking arrows', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    const nextButton = screen.getByLabelText('Next photo');
    fireEvent.click(nextButton);

    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();

    const prevButton = screen.getByLabelText('Previous photo');
    fireEvent.click(prevButton);

    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('should render AI analysis scores when available', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getAllByText('8.5/10').length).toBeGreaterThan(0); // personalFitScore (appears in sidebar and mobile)
    expect(screen.getAllByText('-5%').length).toBeGreaterThan(0); // marketValueScore (appears in sidebar and mobile)
    expect(screen.getAllByText('8/10').length).toBeGreaterThan(0); // aiPriorityRating (appears in sidebar and mobile)
  });

  it('should render AI priority summary', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getByText(/Good value for money/)).toBeInTheDocument();
  });

  it('should render Virtual Mechanic Report with markdown', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getByText(/Virtual Mechanic Summary/)).toBeInTheDocument();
    const markdownContent = screen.getAllByTestId('markdown-content')[0];
    expect(markdownContent).toHaveTextContent('BMW X5 (N55 engine)');
  });

  it('should render vehicle description and features', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getByText(/Great car with low mileage/)).toBeInTheDocument();
    expect(screen.getByText(/air_conditioning/)).toBeInTheDocument();
  });

  it('should render specifications from sourceParameters', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getAllByText(/Marka/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BMW/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Moc/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/300 KM/i).length).toBeGreaterThan(0);
  });

  it('should render seller information', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getByText('Seller Information')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/private/i)).toBeInTheDocument();
    expect(screen.getByText('Warsaw')).toBeInTheDocument();
    expect(screen.getByText('2019')).toBeInTheDocument();
  });

  it('should render source data section', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getByText('Source Data')).toBeInTheDocument();
    expect(screen.getAllByText('BMW X5 2020').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OTOMOTO/i).length).toBeGreaterThan(0);
  });

  it('should render source URL as clickable link', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    const link = screen.getByRole('link', { name: /View on OTOMOTO/i });
    expect(link).toHaveAttribute('href', 'https://otomoto.pl/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render equipment categories and items', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getAllByText(/Komfort/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Klimatyzacja/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bezpieczeństwo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ABS/i).length).toBeGreaterThan(0);
  });

  it('should render timestamps formatted correctly', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    expect(screen.getByText('Metadata')).toBeInTheDocument();
    // Timestamps should be formatted - exact format depends on locale
    expect(screen.getAllByText(/Jan/i).length).toBeGreaterThan(0);
  });

  it('should render status dropdown', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    const statusDropdown = screen.getByLabelText('Status');
    expect(statusDropdown).toBeInTheDocument();
    expect(statusDropdown).toHaveValue('new');
  });

  it('should update vehicle status when changed', async () => {
    const updatedVehicle = { ...mockVehicle, status: 'to_contact' as const };
    mockUpdateVehicle.mockResolvedValueOnce(updatedVehicle);

    render(<VehicleDetail vehicle={mockVehicle} />);

    const statusDropdown = screen.getByLabelText('Status');
    fireEvent.change(statusDropdown, { target: { value: 'to_contact' } });

    await waitFor(() => {
      expect(mockUpdateVehicle).toHaveBeenCalledWith('123', { status: 'to_contact' });
    });
  });

  it('should render personal notes textarea', () => {
    render(<VehicleDetail vehicle={mockVehicle} />);

    const notesTextareas = screen.getAllByRole('textbox', { name: /personal notes/i });
    expect(notesTextareas.length).toBeGreaterThan(0); // Both sidebar and mobile versions
  });

  it('should update personal notes on blur', async () => {
    const updatedVehicle = { ...mockVehicle, personalNotes: 'Test notes' };
    mockUpdateVehicle.mockResolvedValueOnce(updatedVehicle);

    render(<VehicleDetail vehicle={mockVehicle} />);

    const notesTextareas = screen.getAllByRole('textbox', { name: /personal notes/i });
    const notesTextarea = notesTextareas[0]; // Use first one (sidebar desktop version)
    fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
    fireEvent.blur(notesTextarea);

    await waitFor(() => {
      expect(mockUpdateVehicle).toHaveBeenCalledWith('123', { personalNotes: 'Test notes' });
    });
  });

  it('should handle missing AI data gracefully', () => {
    const vehicleWithoutAI: Vehicle = {
      ...mockVehicle,
      personalFitScore: null,
      marketValueScore: null,
      aiPriorityRating: null,
      aiPrioritySummary: null,
      aiMechanicReport: null,
      virtualMechanicSummary: null,
      aiDataSanityCheck: null,
    };

    render(<VehicleDetail vehicle={vehicleWithoutAI} />);

    // Should still render basic vehicle info
    expect(screen.getAllByText('BMW X5 2020').length).toBeGreaterThan(0);
    // AI Scores section should not be rendered when no scores exist
    expect(screen.queryByText('AI Scores')).not.toBeInTheDocument();
    // Verify the scores are not rendered
    expect(screen.queryByText(/\/10$/)).not.toBeInTheDocument();
  });

  it('should handle vehicle with no photos', () => {
    const vehicleWithoutPhotos: Vehicle = {
      ...mockVehicle,
      photos: [],
      sourcePhotos: [],
    };

    render(<VehicleDetail vehicle={vehicleWithoutPhotos} />);

    expect(screen.getByText('No photos available')).toBeInTheDocument();
  });

  it('should call onVehicleUpdate callback when vehicle is updated', async () => {
    const onVehicleUpdate = jest.fn();
    const updatedVehicle = { ...mockVehicle, status: 'contacted' as const };
    mockUpdateVehicle.mockResolvedValueOnce(updatedVehicle);

    render(<VehicleDetail vehicle={mockVehicle} onVehicleUpdate={onVehicleUpdate} />);

    const statusDropdown = screen.getByLabelText('Status');
    fireEvent.change(statusDropdown, { target: { value: 'contacted' } });

    await waitFor(() => {
      expect(onVehicleUpdate).toHaveBeenCalledWith(updatedVehicle);
    });
  });

  it('should handle update errors gracefully', async () => {
    mockUpdateVehicle.mockRejectedValueOnce(new Error('Update failed'));

    render(<VehicleDetail vehicle={mockVehicle} />);

    const statusDropdown = screen.getByLabelText('Status');
    fireEvent.change(statusDropdown, { target: { value: 'contacted' } });

    await waitFor(() => {
      expect(mockUpdateVehicle).toHaveBeenCalled();
    });

    // Status should revert back to original
    expect(statusDropdown).toHaveValue('new');
  });

  // Modal Tests
  describe('Image Modal and Gallery Navigation', () => {
    it('should open modal when carousel image is clicked', () => {
      render(<VehicleDetail vehicle={mockVehicle} />);

      const carouselImage = screen.getByAltText(/BMW X5 2020 - Photo 1/);
      fireEvent.click(carouselImage);

      expect(screen.getByTestId('lightbox-modal')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
      render(<VehicleDetail vehicle={mockVehicle} />);

      const carouselImage = screen.getByAltText(/BMW X5 2020 - Photo 1/);
      fireEvent.click(carouselImage);

      const closeButton = screen.getByTestId('lightbox-close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('lightbox-modal')).not.toBeInTheDocument();
    });

    it('should open modal at correct photo index', () => {
      render(<VehicleDetail vehicle={mockVehicle} />);

      // Navigate to second photo
      const nextButton = screen.getByLabelText('Next photo');
      fireEvent.click(nextButton);

      // Click image to open modal
      const carouselImage = screen.getByAltText(/BMW X5 2020 - Photo 2/);
      fireEvent.click(carouselImage);

      // Modal should show photo 2
      expect(screen.getByTestId('lightbox-image')).toHaveTextContent('photo2.jpg');
    });

    it('should make carousel image clickable with cursor pointer', () => {
      render(<VehicleDetail vehicle={mockVehicle} />);

      const carouselImage = screen.getByAltText(/BMW X5 2020 - Photo 1/);
      expect(carouselImage.className).toContain('cursor-pointer');
    });
  });
});
