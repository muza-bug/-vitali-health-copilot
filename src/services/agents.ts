/* =============================================================================
   Vitali Health AI — AI agents / automation extension point (INTERFACE ONLY)
   -----------------------------------------------------------------------------
   A clean place for future autonomous agents to act on a Circle — e.g. auto-
   drafting an update from a voice clip, watching metrics for outliers, or
   nudging the team about an overdue task. No implementation now; just the seam.

   >>> TODO: register real agents here and dispatch Circle events to them. <<<
   ============================================================================= */

import type { Circle, TimelineEntry } from '../types/models';

/** What an agent may propose back to a Circle (never auto-applied silently). */
export interface AgentSuggestion {
  circleId: string;
  kind: 'draft-update' | 'flag' | 'next-step';
  text: string;
}

/** Lifecycle hooks an agent can implement. All optional. */
export interface VitaliAgent {
  id: string;
  label: string;
  /** Called when a Circle changes; may return suggestions for the team to accept. */
  onCircleEvent?(circle: Circle, entry: TimelineEntry): Promise<AgentSuggestion[]>;
}

const registry: VitaliAgent[] = [];

/** Register an automation agent. TODO: real agents get added here. */
export function registerAgent(agent: VitaliAgent): void {
  registry.push(agent);
}

/**
 * Fan a Circle event out to all registered agents and collect their suggestions.
 * The UI decides whether to surface them — nothing is applied automatically.
 * TODO: connect to the agent runtime / queue.
 */
export async function dispatchCircleEvent(
  circle: Circle,
  entry: TimelineEntry,
): Promise<AgentSuggestion[]> {
  const all = await Promise.all(
    registry.map((a) => a.onCircleEvent?.(circle, entry) ?? Promise.resolve([])),
  );
  return all.flat();
}
