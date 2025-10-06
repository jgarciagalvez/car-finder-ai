import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { Database as DatabaseSchema, SCHEMA_STATEMENTS } from './schema';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private db: Kysely<DatabaseSchema> | null = null;
  private sqliteDb: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Default to a local database file in the project root
    this.dbPath = dbPath || path.join(process.cwd(), 'car-finder.db');
  }

  /**
   * Initialize the database connection and create schema if needed
   */
  async initialize(): Promise<void> {
    try {
      // Ensure the directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create SQLite database connection
      this.sqliteDb = new Database(this.dbPath);
      
      // Create Kysely instance with SQLite dialect
      this.db = new Kysely<DatabaseSchema>({
        dialect: new SqliteDialect({
          database: this.sqliteDb,
        }),
      });

      // Create schema (tables, indexes, triggers)
      await this.createSchema();
      
      console.log(`✅ Database initialized successfully at: ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create database schema (tables, indexes, triggers)
   */
  private async createSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      for (const statement of SCHEMA_STATEMENTS) {
        await sql`${sql.raw(statement)}`.execute(this.db);
      }
      console.log('✅ Database schema created successfully');
    } catch (error) {
      console.error('❌ Failed to create database schema:', error);
      throw new Error(`Schema creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the Kysely database instance
   */
  getDb(): Kysely<DatabaseSchema> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.destroy();
        this.db = null;
      }
      
      if (this.sqliteDb) {
        this.sqliteDb.close();
        this.sqliteDb = null;
      }
      
      console.log('✅ Database connection closed successfully');
    } catch (error) {
      console.error('❌ Failed to close database connection:', error);
      throw new Error(`Database close failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null && this.sqliteDb !== null;
  }

  /**
   * Get database file path
   */
  getDbPath(): string {
    return this.dbPath;
  }
}
