import { DatabaseService } from './database';
import { VehicleRepository } from './repositories/vehicleRepository';
import { sql } from 'kysely';
import path from 'path';
import fs from 'fs';

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let testDbPath: string;

  beforeEach(() => {
    // Use a unique test database file for each test
    testDbPath = path.join(__dirname, '__tests__', `test-${Date.now()}.db`);
    dbService = new DatabaseService(testDbPath);
  });

  afterEach(async () => {
    // Clean up after each test
    if (dbService.isInitialized()) {
      await dbService.close();
    }
    
    // Remove test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      await dbService.initialize();
      
      expect(dbService.isInitialized()).toBe(true);
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should create database file if it does not exist', async () => {
      expect(fs.existsSync(testDbPath)).toBe(false);
      
      await dbService.initialize();
      
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should throw error when getting db before initialization', () => {
      expect(() => dbService.getDatabase()).toThrow('Database not initialized');
    });

    it('should return database instance after initialization', async () => {
      await dbService.initialize();

      const db = dbService.getDatabase();
      expect(db).toBeDefined();
    });
  });

  describe('schema creation', () => {
    it('should create vehicles table', async () => {
      await dbService.initialize();
      const db = dbService.getDatabase();
      
      // Query the schema to verify table exists
      const result = await db.executeQuery(
        sql<{name: string, type: string}>`
          SELECT name, type FROM sqlite_master 
          WHERE type = 'table' AND name = 'vehicles'
        `.compile(db)
      ).then(r => r.rows[0]);
      
      expect(result).toBeDefined();
      expect(result?.name).toBe('vehicles');
    });

    it('should create indexes', async () => {
      await dbService.initialize();
      const db = dbService.getDatabase();
      
      // Query for indexes
      const indexes = await db.executeQuery(
        sql<{name: string}>`
          SELECT name FROM sqlite_master 
          WHERE type = 'index' AND name LIKE 'idx_vehicles_%'
        `.compile(db)
      ).then(r => r.rows);
      
      expect(indexes.length).toBeGreaterThan(0);
    });
  });

  describe('connection management', () => {
    it('should close database connection', async () => {
      await dbService.initialize();
      expect(dbService.isInitialized()).toBe(true);
      
      await dbService.close();
      expect(dbService.isInitialized()).toBe(false);
    });

    it('should handle multiple close calls gracefully', async () => {
      await dbService.initialize();
      await dbService.close();
      
      // Should not throw error on second close
      await expect(dbService.close()).resolves.not.toThrow();
    });
  });
});
