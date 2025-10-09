/**
 * DictionaryLoader - Loads and caches translation dictionaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceUtils } from '@car-finder/services';

export interface FeatureDictionary {
  comments?: string[];
  features: Record<string, string>;
}

export class DictionaryLoader {
  private static cache: Map<string, FeatureDictionary> = new Map();
  private static dictionariesDir: string = path.join(WorkspaceUtils.findWorkspaceRoot(), 'packages/ai/src/dictionaries');

  /**
   * Load feature translation dictionary
   * Results are cached for performance
   */
  static loadFeatureDictionary(): FeatureDictionary {
    const cacheKey = 'feature-dictionary';

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const dictionaryPath = path.join(this.dictionariesDir, 'feature-dictionary.json');

    if (!fs.existsSync(dictionaryPath)) {
      throw new Error(`Feature dictionary not found at: ${dictionaryPath}`);
    }

    const content = fs.readFileSync(dictionaryPath, 'utf-8');
    const dictionary = JSON.parse(content) as FeatureDictionary;

    this.cache.set(cacheKey, dictionary);
    return dictionary;
  }

  /**
   * Translate features using dictionary
   * Returns { translated, unmapped } where:
   * - translated: features found in dictionary
   * - unmapped: features not found in dictionary (need AI translation)
   */
  static translateFeatures(polishFeatures: string[]): { translated: string[]; unmapped: string[] } {
    const dictionary = this.loadFeatureDictionary();
    const translated: string[] = [];
    const unmapped: string[] = [];

    for (const feature of polishFeatures) {
      const trimmed = feature.trim();
      if (dictionary.features[trimmed]) {
        translated.push(dictionary.features[trimmed]);
      } else {
        unmapped.push(trimmed);
      }
    }

    return { translated, unmapped };
  }

  /**
   * Clear cache (useful for testing or when dictionary is updated)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
