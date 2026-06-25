/* =============================================================================
   Vitali Health AI — Process-metrics pipeline (STUB)
   -----------------------------------------------------------------------------
   Captures DE-IDENTIFIED process metrics (how long things take) that later become
   anonymized training insight — "one nurse's experience helps train many."

   PRIVACY IS THE PRODUCT HERE: the input shape below deliberately CANNOT carry a
   patient or nurse identifier. Only unit + measurement type + duration are kept.
   Keep it that way when wiring the real export.

   >>> TODO: connect real anonymized analytics / aggregation pipeline here. <<<
   ============================================================================= */

import type { MetricType, ProcessMetric, TaskCategory } from '../types/models';

/** Exactly the fields allowed to leave the device. No identities. */
export interface MetricInput {
  type: MetricType;
  category: TaskCategory | 'general';
  /** De-identified unit label only, e.g. "4 West". */
  unit: string;
  durationMs: number;
}

/** Local buffer standing in for the export queue. */
const buffer: ProcessMetric[] = [];
let seq = 1;

/**
 * Record a single de-identified measurement.
 * TODO: batch + ship to the anonymized analytics service (and drop the buffer).
 */
export function captureMetric(input: MetricInput): ProcessMetric {
  const metric: ProcessMetric = {
    id: `cap${seq++}`,
    type: input.type,
    category: input.category,
    unit: input.unit,
    durationMs: input.durationMs,
    capturedAt: new Date().toISOString(),
  };
  buffer.push(metric);
  // eslint-disable-next-line no-console
  console.debug('[analytics] captured de-identified metric', metric);
  return metric;
}

/** Everything captured this session — useful while building. */
export function getBufferedMetrics(): ProcessMetric[] {
  return [...buffer];
}

/**
 * Flush the buffer to the anonymized pipeline.
 * TODO: POST to the analytics ingest endpoint; assert no PII in payload.
 */
export async function exportMetrics(): Promise<{ exported: number }> {
  const count = buffer.length;
  buffer.length = 0;
  return { exported: count };
}
