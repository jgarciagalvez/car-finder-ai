import { Kysely } from 'kysely';
import { Vehicle as VehicleType, SellerInfo } from '@car-finder/types';
import { Database as DatabaseSchema, Vehicle, NewVehicle, VehicleUpdate } from '../schema';

export class VehicleRepository {
  constructor(private db: Kysely<DatabaseSchema>) {}

  /**
   * Insert a new vehicle into the database
   * Handles type conversion between @car-finder/types and database schema
   */
  async insertVehicle(vehicle: VehicleType): Promise<void> {
    try {
      const dbVehicle: NewVehicle = {
        // Don't include id - it will be auto-generated
        source: vehicle.source,
        sourceId: vehicle.sourceId,
        sourceUrl: vehicle.sourceUrl,
        sourceCreatedAt: vehicle.sourceCreatedAt.toISOString(),
        
        // Raw scraped data
        sourceTitle: vehicle.sourceTitle,
        sourceDescriptionHtml: vehicle.sourceDescriptionHtml,
        sourceParameters: JSON.stringify(vehicle.sourceParameters),
        sourceEquipment: JSON.stringify(vehicle.sourceEquipment),
        sourcePhotos: JSON.stringify(vehicle.sourcePhotos),
        
        // Processed & normalized data
        title: vehicle.title,
        description: vehicle.description,
        features: JSON.stringify(vehicle.features),
        pricePln: vehicle.pricePln,
        priceEur: vehicle.priceEur,
        year: vehicle.year,
        mileage: vehicle.mileage,
        
        // Seller information
        sellerInfo: JSON.stringify(vehicle.sellerInfo),
        photos: JSON.stringify(vehicle.photos),
        
        // AI generated data
        personalFitScore: vehicle.personalFitScore,
        marketValueScore: vehicle.marketValueScore,
        aiPriorityRating: vehicle.aiPriorityRating,
        aiPrioritySummary: vehicle.aiPrioritySummary,
        aiMechanicReport: vehicle.aiMechanicReport,
        aiDataSanityCheck: vehicle.aiDataSanityCheck,
        
        // User workflow data
        status: vehicle.status,
        personalNotes: vehicle.personalNotes,
        
        // Timestamps
        scrapedAt: vehicle.scrapedAt.toISOString(),
        // createdAt and updatedAt will be auto-generated
      };

      await this.db
        .insertInto('vehicles')
        .values(dbVehicle)
        .execute();

      console.log(`✅ Vehicle inserted successfully: ${vehicle.sourceUrl}`);
    } catch (error) {
      console.error('❌ Failed to insert vehicle:', error);
      throw new Error(`Vehicle insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find a vehicle by its source URL (for deduplication)
   */
  async findVehicleByUrl(sourceUrl: string): Promise<VehicleType | null> {
    try {
      const result = await this.db
        .selectFrom('vehicles')
        .selectAll()
        .where('sourceUrl', '=', sourceUrl)
        .executeTakeFirst();

      return result ? this.mapDbVehicleToType(result) : null;
    } catch (error) {
      console.error('❌ Failed to find vehicle by URL:', error);
      throw new Error(`Vehicle lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find a vehicle by its ID
   */
  async findVehicleById(id: string): Promise<VehicleType | null> {
    try {
      const result = await this.db
        .selectFrom('vehicles')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return result ? this.mapDbVehicleToType(result) : null;
    } catch (error) {
      console.error('❌ Failed to find vehicle by ID:', error);
      throw new Error(`Vehicle lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a vehicle's data
   */
  async updateVehicle(id: string, updates: Partial<VehicleType>): Promise<void> {
    try {
      const dbUpdates: VehicleUpdate = {};

      // Map only the fields that are being updated
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.personalNotes !== undefined) dbUpdates.personalNotes = updates.personalNotes;
      if (updates.personalFitScore !== undefined) dbUpdates.personalFitScore = updates.personalFitScore;
      if (updates.marketValueScore !== undefined) dbUpdates.marketValueScore = updates.marketValueScore;
      if (updates.aiPriorityRating !== undefined) dbUpdates.aiPriorityRating = updates.aiPriorityRating;
      if (updates.aiPrioritySummary !== undefined) dbUpdates.aiPrioritySummary = updates.aiPrioritySummary;
      if (updates.aiMechanicReport !== undefined) dbUpdates.aiMechanicReport = updates.aiMechanicReport;
      if (updates.aiDataSanityCheck !== undefined) dbUpdates.aiDataSanityCheck = updates.aiDataSanityCheck;

      if (Object.keys(dbUpdates).length === 0) {
        console.log('⚠️ No valid updates provided for vehicle:', id);
        return;
      }

      const result = await this.db
        .updateTable('vehicles')
        .set(dbUpdates)
        .where('id', '=', id)
        .execute();

      if (result.length === 0) {
        throw new Error(`Vehicle with ID ${id} not found`);
      }

      console.log(`✅ Vehicle updated successfully: ${id}`);
    } catch (error) {
      console.error('❌ Failed to update vehicle:', error);
      throw new Error(`Vehicle update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all vehicles (for dashboard display)
   */
  async getAllVehicles(): Promise<VehicleType[]> {
    try {
      const results = await this.db
        .selectFrom('vehicles')
        .selectAll()
        .orderBy('createdAt', 'desc')
        .execute();

      return results.map(vehicle => this.mapDbVehicleToType(vehicle));
    } catch (error) {
      console.error('❌ Failed to get all vehicles:', error);
      throw new Error(`Vehicle retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get vehicles by status (for filtering)
   */
  async getVehiclesByStatus(status: VehicleType['status']): Promise<VehicleType[]> {
    try {
      const results = await this.db
        .selectFrom('vehicles')
        .selectAll()
        .where('status', '=', status)
        .orderBy('createdAt', 'desc')
        .execute();

      return results.map(vehicle => this.mapDbVehicleToType(vehicle));
    } catch (error) {
      console.error('❌ Failed to get vehicles by status:', error);
      throw new Error(`Vehicle retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a vehicle by ID
   */
  async deleteVehicle(id: string): Promise<void> {
    try {
      const result = await this.db
        .deleteFrom('vehicles')
        .where('id', '=', id)
        .execute();

      if (result.length === 0) {
        throw new Error(`Vehicle with ID ${id} not found`);
      }

      console.log(`✅ Vehicle deleted successfully: ${id}`);
    } catch (error) {
      console.error('❌ Failed to delete vehicle:', error);
      throw new Error(`Vehicle deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find vehicles that don't have AI analysis yet (for batch processing)
   * Returns vehicles where any AI field is NULL
   */
  async findVehiclesWithoutAnalysis(): Promise<VehicleType[]> {
    try {
      const results = await this.db
        .selectFrom('vehicles')
        .selectAll()
        .where((eb) =>
          eb.or([
            eb('personalFitScore', 'is', null),
            eb('aiPriorityRating', 'is', null),
            eb('aiMechanicReport', 'is', null),
            eb('aiDataSanityCheck', 'is', null),
          ])
        )
        .orderBy('createdAt', 'desc')
        .execute();

      return results.map(vehicle => this.mapDbVehicleToType(vehicle));
    } catch (error) {
      console.error('❌ Failed to find vehicles without analysis:', error);
      throw new Error(`Vehicle retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update AI analysis fields for a vehicle
   * This is a specialized update method for batch analysis operations
   */
  async updateVehicleAnalysis(
    id: string,
    analysis: {
      personalFitScore?: number;
      aiPriorityRating?: number;
      aiPrioritySummary?: string;
      aiMechanicReport?: string;
      aiDataSanityCheck?: string;
    }
  ): Promise<void> {
    try {
      const dbUpdates: VehicleUpdate = {};

      // Map analysis fields to database updates
      if (analysis.personalFitScore !== undefined) {
        dbUpdates.personalFitScore = analysis.personalFitScore;
      }
      if (analysis.aiPriorityRating !== undefined) {
        dbUpdates.aiPriorityRating = analysis.aiPriorityRating;
      }
      if (analysis.aiPrioritySummary !== undefined) {
        dbUpdates.aiPrioritySummary = analysis.aiPrioritySummary;
      }
      if (analysis.aiMechanicReport !== undefined) {
        dbUpdates.aiMechanicReport = analysis.aiMechanicReport;
      }
      if (analysis.aiDataSanityCheck !== undefined) {
        dbUpdates.aiDataSanityCheck = analysis.aiDataSanityCheck;
      }

      if (Object.keys(dbUpdates).length === 0) {
        console.log('⚠️ No analysis updates provided for vehicle:', id);
        return;
      }

      const result = await this.db
        .updateTable('vehicles')
        .set(dbUpdates)
        .where('id', '=', id)
        .execute();

      if (result.length === 0) {
        throw new Error(`Vehicle with ID ${id} not found`);
      }

      console.log(`✅ Vehicle analysis updated successfully: ${id}`);
    } catch (error) {
      console.error('❌ Failed to update vehicle analysis:', error);
      throw new Error(`Vehicle analysis update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database vehicle record to @car-finder/types Vehicle interface
   */
  private mapDbVehicleToType(dbVehicle: Vehicle): VehicleType {
    return {
      id: dbVehicle.id,
      source: dbVehicle.source,
      sourceId: dbVehicle.sourceId,
      sourceUrl: dbVehicle.sourceUrl,
      sourceCreatedAt: new Date(dbVehicle.sourceCreatedAt),
      
      // Raw scraped data
      sourceTitle: dbVehicle.sourceTitle,
      sourceDescriptionHtml: dbVehicle.sourceDescriptionHtml,
      sourceParameters: JSON.parse(dbVehicle.sourceParameters),
      sourceEquipment: JSON.parse(dbVehicle.sourceEquipment),
      sourcePhotos: JSON.parse(dbVehicle.sourcePhotos),
      
      // Processed & normalized data
      title: dbVehicle.title,
      description: dbVehicle.description,
      features: JSON.parse(dbVehicle.features),
      pricePln: dbVehicle.pricePln,
      priceEur: dbVehicle.priceEur,
      year: dbVehicle.year,
      mileage: dbVehicle.mileage,
      
      // Seller information
      sellerInfo: JSON.parse(dbVehicle.sellerInfo) as SellerInfo,
      photos: JSON.parse(dbVehicle.photos),
      
      // AI generated data
      personalFitScore: dbVehicle.personalFitScore,
      marketValueScore: dbVehicle.marketValueScore,
      aiPriorityRating: dbVehicle.aiPriorityRating,
      aiPrioritySummary: dbVehicle.aiPrioritySummary,
      aiMechanicReport: dbVehicle.aiMechanicReport,
      aiDataSanityCheck: dbVehicle.aiDataSanityCheck,
      
      // User workflow data
      status: dbVehicle.status,
      personalNotes: dbVehicle.personalNotes,
      
      // Timestamps
      scrapedAt: new Date(dbVehicle.scrapedAt),
      createdAt: new Date(dbVehicle.createdAt),
      updatedAt: new Date(dbVehicle.updatedAt),
    };
  }
}
