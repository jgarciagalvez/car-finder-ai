import * as fs from 'fs';
import * as path from 'path';

/**
 * Workspace utilities for monorepo file resolution
 * Provides centralized workspace root detection and file resolution
 */
export class WorkspaceUtils {
  private static cachedRoot: string | null = null;

  /**
   * Find the workspace root by looking for package.json with workspaces
   * Results are cached for performance
   */
  static findWorkspaceRoot(): string {
    if (this.cachedRoot) {
      return this.cachedRoot;
    }

    let dir = process.cwd();
    while (dir !== path.dirname(dir)) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          if (pkg.workspaces) {
            this.cachedRoot = dir;
            return dir;
          }
        } catch (error) {
          // Continue searching if package.json is malformed
        }
      }
      dir = path.dirname(dir);
    }

    // Fallback to current working directory
    this.cachedRoot = process.cwd();
    return this.cachedRoot;
  }

  /**
   * Resolve a file path relative to the workspace root
   */
  static resolveProjectFile(filename: string): string {
    return path.join(this.findWorkspaceRoot(), filename);
  }

  /**
   * Resolve a configuration file path relative to the workspace root
   */
  static resolveConfigFile(filename: string): string {
    return this.resolveProjectFile(filename);
  }

  /**
   * Resolve a schema file path relative to the workspace root
   */
  static resolveSchemaFile(filename: string): string {
    return this.resolveProjectFile(filename);
  }

  /**
   * Ensure a file exists at the given path, throw error if not found
   */
  static ensureFileExists(filepath: string): void {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Required file not found: ${filepath}`);
    }
  }

  /**
   * Clear the cached workspace root (useful for testing)
   */
  static clearCache(): void {
    this.cachedRoot = null;
  }
}
