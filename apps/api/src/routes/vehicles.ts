import { Router, Request, Response } from 'express';
import { ServiceRegistry } from '@car-finder/services';
import { Vehicle } from '@car-finder/types';

const router: Router = Router();

// GET /api/vehicles - Get all vehicles
router.get('/', async (req: Request, res: Response) => {
  try {
    const vehicleRepository = await ServiceRegistry.getVehicleRepository();
    
    const vehicles = await vehicleRepository.getAllVehicles();
    
    // Transform vehicles for API response (exclude raw source fields for clarity)
    const apiVehicles = vehicles.map(vehicle => ({
      id: vehicle.id,
      source: vehicle.source,
      sourceUrl: vehicle.sourceUrl,
      sourceCreatedAt: vehicle.sourceCreatedAt.toISOString(),
      title: vehicle.title,
      description: vehicle.description,
      features: vehicle.features,
      pricePln: vehicle.pricePln,
      priceEur: vehicle.priceEur,
      year: vehicle.year,
      mileage: vehicle.mileage,
      sellerInfo: vehicle.sellerInfo,
      photos: vehicle.photos,
      personalFitScore: vehicle.personalFitScore,
      marketValueScore: vehicle.marketValueScore,
      aiPriorityRating: vehicle.aiPriorityRating,
      aiPrioritySummary: vehicle.aiPrioritySummary,
      aiMechanicReport: vehicle.aiMechanicReport,
      status: vehicle.status,
      personalNotes: vehicle.personalNotes,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    }));

    res.json(apiVehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch vehicles from database'
    });
  }
});

// GET /api/vehicles/:id - Get single vehicle by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vehicleRepository = await ServiceRegistry.getVehicleRepository();
    const vehicle = await vehicleRepository.findVehicleById(id);
    
    if (!vehicle) {
      return res.status(404).json({
        error: 'Vehicle not found',
        message: `No vehicle found with ID: ${id}`
      });
    }

    // Transform vehicle for API response
    const apiVehicle = {
      id: vehicle.id,
      source: vehicle.source,
      sourceUrl: vehicle.sourceUrl,
      sourceCreatedAt: vehicle.sourceCreatedAt.toISOString(),
      title: vehicle.title,
      description: vehicle.description,
      features: vehicle.features,
      pricePln: vehicle.pricePln,
      priceEur: vehicle.priceEur,
      year: vehicle.year,
      mileage: vehicle.mileage,
      sellerInfo: vehicle.sellerInfo,
      photos: vehicle.photos,
      personalFitScore: vehicle.personalFitScore,
      marketValueScore: vehicle.marketValueScore,
      aiPriorityRating: vehicle.aiPriorityRating,
      aiPrioritySummary: vehicle.aiPrioritySummary,
      aiMechanicReport: vehicle.aiMechanicReport,
      status: vehicle.status,
      personalNotes: vehicle.personalNotes,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };

    res.json(apiVehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch vehicle from database'
    });
  }
});

// PATCH /api/vehicles/:id - Update vehicle status or notes
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, personalNotes } = req.body;

    // Validate input
    if (!status && personalNotes === undefined) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Either status or personalNotes must be provided'
      });
    }

    if (status && !['new', 'to_contact', 'contacted', 'to_visit', 'visited', 'deleted'].includes(status)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Invalid status value'
      });
    }

    const vehicleRepository = await ServiceRegistry.getVehicleRepository();
    
    // Check if vehicle exists
    const existingVehicle = await vehicleRepository.findVehicleById(id);
    if (!existingVehicle) {
      return res.status(404).json({
        error: 'Vehicle not found',
        message: `No vehicle found with ID: ${id}`
      });
    }

    // Update vehicle
    const updates: Partial<Vehicle> = {};
    if (status) updates.status = status as any;
    if (personalNotes !== undefined) updates.personalNotes = personalNotes;

    await vehicleRepository.updateVehicle(id, updates);
    
    // Fetch the updated vehicle
    const updatedVehicle = await vehicleRepository.findVehicleById(id);
    if (!updatedVehicle) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Vehicle was updated but could not be retrieved'
      });
    }

    // Transform vehicle for API response
    const apiVehicle = {
      id: updatedVehicle.id,
      source: updatedVehicle.source,
      sourceUrl: updatedVehicle.sourceUrl,
      title: updatedVehicle.title,
      description: updatedVehicle.description,
      features: updatedVehicle.features,
      pricePln: updatedVehicle.pricePln,
      priceEur: updatedVehicle.priceEur,
      year: updatedVehicle.year,
      mileage: updatedVehicle.mileage,
      photos: updatedVehicle.photos,
      personalFitScore: updatedVehicle.personalFitScore,
      marketValueScore: updatedVehicle.marketValueScore,
      aiPriorityRating: updatedVehicle.aiPriorityRating,
      aiPrioritySummary: updatedVehicle.aiPrioritySummary,
      aiMechanicReport: updatedVehicle.aiMechanicReport,
      status: updatedVehicle.status,
      personalNotes: updatedVehicle.personalNotes,
      createdAt: updatedVehicle.createdAt.toISOString(),
      updatedAt: updatedVehicle.updatedAt.toISOString(),
    };

    res.json(apiVehicle);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update vehicle in database'
    });
  }
});

export default router;
