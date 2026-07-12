/**
 * Types for the background extraction job system.
 *
 * Extraction jobs represent in-progress, completed, or failed portfolio
 * extractions that were submitted via the create-portfolio dialog and
 * are being processed asynchronously (or will be retried later).
 */

import type { Holding, BrokerSource } from "@/types/portfolio";
import type { HoldingValidation } from "@/lib/validation-engine";

export type ExtractionStatus =
  | "queued"
  | "extracting"
  | "completed"
  | "failed";

export interface ExtractionJob {
  id: string;
  fileName: string;
  status: ExtractionStatus;
  stage: string;
  startedAt: number;
  completedAt?: number;
  holdings: Holding[];
  source: BrokerSource;
  portfolioName: string;
  holdingsCount: number;
  error?: string;
  /** true when holdings were auto-imported without review */
  autoImported?: boolean;
  /** Per-holding validation results from extraction pipeline */
  validationResults?: HoldingValidation[];
}
