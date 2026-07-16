/**
 * @issue #28
 */
/**
 * ============================================================================
 * validation.ts
 * ============================================================================
 * Validation logic, edit checks, required field derivations, and constraints.
 */

import { TranslatedText } from "./common";
import { PartialDateConfig } from "./ui";
import { AggregateFunction, DateImputationRule, QuerySeverity, RangeValueType } from "./enums";

export interface DerivationConfig {
  expression?: string;
  dependencyItemOids: string[];
  isAggregate?: boolean;
  aggregateFunction?: AggregateFunction;
  targetGroupOid?: string;
  targetItemOid?: string;
}

export interface MissingDataConfig {
  allowMissingCodes: boolean;
  allowedCodes?: string[];
}

export interface RangeCheck {
  comparator: "<" | "<=" | ">" | ">=" | "==" | "!=";
  value: string | number;
  valueType: RangeValueType;
  severity?: QuerySeverity;
  errorMessage?: TranslatedText;
}

export interface ItemValidation {
  required: boolean;
  requireIf?: string;
  requiredErrorMessage?: TranslatedText;
  missingDataConfig?: MissingDataConfig;
  inputMask?: string;
  minLength?: number;
  maxLength?: number;
  rangeChecks?: RangeCheck[];
  regexPattern?: RegExp | string;
  regexErrorMessage?: TranslatedText;
  allowFutureDates?: boolean;
  partialDateConfig?: PartialDateConfig;
  allowMultipleSelections?: boolean;
  maxSelections?: number;
  maxFiles?: number;
  allowedExtensions?: string[];
  maxFileSizeMb?: number;
  dateImputationRule?: DateImputationRule;
}

export interface EditCheck {
  logic: string;
  severity: QuerySeverity;
  queryMessage: TranslatedText;
}

export interface ValidationIssue {
  level: "Error" | "Warning";
  message: string;
  location?: string;
  rowIndex?: number;
  sheetName?: string; // Tracks which tab the error lives on
}
