/**
 * @issue #28
 */
/**
 * ============================================================================
 * ui.ts
 * ============================================================================
 * Affordances for paper generation and digital EDC UI rendering.
 */

import { TranslatedText } from "./common";
import { VasOrientation } from "./enums";

export interface AssetConfig {
  url: string;
  altText?: TranslatedText;
  mimeType?: string;
}

export interface VasConfig {
  orientation: VasOrientation;
  rangeMin: number;
  rangeMax: number;
  step: number;
  minorTickStep?: number;
  majorTickStep?: number;
  leftLabel?: TranslatedText;
  rightLabel?: TranslatedText;
}

export interface PartialDateConfig {
  allowPartialDD?: boolean;
  allowPartialMMM?: boolean;
  allowPartialYYYY?: boolean;
  allowPartialTime?: boolean;
  partialDDText?: string;
  partialMMMText?: string;
  partialYYYYText?: string;
  partialTimeText?: string;
  imputeDD?: string;
  imputeMMM?: string;
  imputeYYYY?: string;
  imputeTime?: string;
}
