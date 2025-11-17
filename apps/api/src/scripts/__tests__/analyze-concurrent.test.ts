/**
 * Unit tests for concurrent processing in analyze.ts
 */

import { parseArgs } from '../analyze';

// Mock p-limit before importing analyze.ts
jest.mock('p-limit', () => {
  return jest.fn(() => {
    return jest.fn((fn: any) => fn());
  });
});

// Mock dependencies
jest.mock('@car-finder/services', () => ({
  WorkspaceUtils: {
    loadEnvFromRoot: jest.fn(),
    findWorkspaceRoot: jest.fn(() => '/mock/workspace/root'),
  },
}));

describe('analyze.ts - Concurrent Processing', () => {
  describe('parseArgs - concurrency flag', () => {
    let originalArgv: string[];

    beforeEach(() => {
      originalArgv = process.argv;
      // Mock console methods to suppress output during tests
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      process.argv = originalArgv;
      jest.restoreAllMocks();
    });

    it('should default concurrency to 3 when not specified', () => {
      process.argv = ['node', 'analyze.ts'];
      const options = parseArgs();

      expect(options.concurrency).toBe(3);
    });

    it('should parse --concurrency flag correctly', () => {
      process.argv = ['node', 'analyze.ts', '--concurrency', '4'];
      const options = parseArgs();

      expect(options.concurrency).toBe(4);
    });

    it('should parse --concurrency 1 for sequential processing', () => {
      process.argv = ['node', 'analyze.ts', '--concurrency', '1'];
      const options = parseArgs();

      expect(options.concurrency).toBe(1);
    });

    it('should parse --concurrency 2', () => {
      process.argv = ['node', 'analyze.ts', '--concurrency', '2'];
      const options = parseArgs();

      expect(options.concurrency).toBe(2);
    });

    it('should parse --concurrency with --limit flag', () => {
      process.argv = ['node', 'analyze.ts', '--concurrency', '4', '--limit', '10'];
      const options = parseArgs();

      expect(options.concurrency).toBe(4);
      expect(options.limit).toBe(10);
    });

    it('should auto-adjust concurrency to 1 for single vehicle analysis', () => {
      process.argv = ['node', 'analyze.ts', '--vehicle-id', 'abc123', '--concurrency', '4'];
      const options = parseArgs();

      // When --vehicle-id is specified, concurrency should be forced to 1
      expect(options.concurrency).toBe(1);
      expect(options.vehicleId).toBe('abc123');
    });

    it('should reject concurrency > 5 (max is 5)', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      process.argv = ['node', 'analyze.ts', '--concurrency', '6'];

      expect(() => parseArgs()).toThrow('Process exited with code 1');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid --concurrency value. Maximum is 5')
      );

      mockExit.mockRestore();
    });

    it('should reject negative concurrency values', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      process.argv = ['node', 'analyze.ts', '--concurrency', '-1'];

      expect(() => parseArgs()).toThrow('Process exited with code 1');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid --concurrency value. Must be a positive integer')
      );

      mockExit.mockRestore();
    });

    it('should reject zero concurrency', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      process.argv = ['node', 'analyze.ts', '--concurrency', '0'];

      expect(() => parseArgs()).toThrow('Process exited with code 1');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid --concurrency value. Must be a positive integer')
      );

      mockExit.mockRestore();
    });

    it('should reject non-integer concurrency values', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      process.argv = ['node', 'analyze.ts', '--concurrency', 'abc'];

      expect(() => parseArgs()).toThrow('Process exited with code 1');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid --concurrency value. Must be a positive integer')
      );

      mockExit.mockRestore();
    });

    it('should work with all flags combined', () => {
      process.argv = [
        'node',
        'analyze.ts',
        '--concurrency',
        '3',
        '--limit',
        '20',
        '--skip-mechanic-report',
        '--force',
      ];
      const options = parseArgs();

      expect(options.concurrency).toBe(3);
      expect(options.limit).toBe(20);
      expect(options.skipMechanicReport).toBe(true);
      expect(options.force).toBe(true);
    });
  });
});
