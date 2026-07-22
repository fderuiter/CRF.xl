/**
 * @issue #28
 */
/**
 * ============================================================================
 * hierarchy.ts
 * ============================================================================
 * The core building blocks of the trial (Items -> Groups -> Forms -> Events).
 */

import { z } from "zod";
import {
  crfItemSchema,
  crfDisplayBlockSchema,
  crfDisplayBlockElementSchema,
  crfFormElementSchema,
  itemGroupSchema,
  crfFormSchema,
  eventFormRefSchema,
  studyEventSchema,
  studyDesignSchema,
} from "./schemas";
export type CrfItem = z.infer<typeof crfItemSchema>;
export type CrfDisplayBlock = z.infer<typeof crfDisplayBlockSchema>;
type CrfDisplayBlockElement = z.infer<typeof crfDisplayBlockElementSchema>;
export type CrfFormElement = z.infer<typeof crfFormElementSchema>;

export function isCrfDisplayBlock(
  element: CrfFormElement | Partial<CrfFormElement>
): element is CrfDisplayBlockElement {
  return element.nodeType === "display";
}

export function isCrfItem(element: CrfFormElement | Partial<CrfFormElement>): element is CrfItem {
  return !isCrfDisplayBlock(element);
}

export type ItemGroup = z.infer<typeof itemGroupSchema>;
export type CrfForm = z.infer<typeof crfFormSchema>;
export type EventFormRef = z.infer<typeof eventFormRefSchema>;
export type StudyEvent = z.infer<typeof studyEventSchema>;
export type StudyDesign = z.infer<typeof studyDesignSchema>;
