/* The AI care assistant — a proactive agent that reads a Circle's live context
   (status, vitals, recent notes, open tasks) and proposes prioritized next steps
   the team can accept with one tap. Powered by the pluggable LLM backend
   (Claude / Ollama / AnythingLLM); falls back to on-device heuristics so it's
   always useful. Nothing it proposes is applied automatically — a nurse decides. */

import { RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { aiSuggest, type AiSource } from '../services/llm';
import type { Circle } from '../types/models';

interface AssistantPanelProps {
  circle: Circle;
  recentNotes: string[];
  openTaskLabels: string[];
  onAddTask: (label: string) => void;
}

export function AssistantPanel({ circle, recentNotes, openTaskLabels, onAddTask }: AssistantPanelProps) {
  const [items, setItems] = useState<string[]>([]);
  const [source, setSource] = useState<AiSource>('mock');
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const reqId = useRef(0);

  const run = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    const { items, source } = await aiSuggest(circle, recentNotes, openTaskLabels);
    if (id !== reqId.current) return; // a newer request superseded this one
    setItems(items);
    setSource(source);
    setAdded(new Set());
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circle.id, circle.status, recentNotes.length, openTaskLabels.length]);

  // Proactively suggest on open and whenever the situation meaningfully changes.
  useEffect(() => {
    void run();
  }, [run]);

  const add = (label: string) => {
    onAddTask(label);
    setAdded((s) => new Set(s).add(label));
  };

  const sourceLabel =
    source === 'ai' ? 'Suggested by Vitali AI' : 'On-device suggestion · connect a model for more';

  return (
    <section className="card card-pad assistant">
      <div className="row between">
        <div className="row gap-2">
          <Sparkles size={16} className="t-cyan" />
          <span className="card-h">Care assistant</span>
        </div>
        <button className="link-btn" onClick={() => void run()} disabled={loading} aria-label="Refresh suggestions">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Thinking…' : 'Refresh'}
        </button>
      </div>

      {loading && items.length === 0 ? (
        <p className="t-faint empty-line">Reading the Circle…</p>
      ) : (
        <div className="assistant-steps">
          {items.map((step) => {
            const isAdded = added.has(step);
            return (
              <div key={step} className="assistant-step">
                <span className="grow">{step}</span>
                <button
                  className={`assistant-add ${isAdded ? 'is-added' : ''}`}
                  onClick={() => add(step)}
                  disabled={isAdded}
                >
                  {isAdded ? 'Added' : '+ Task'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <span className="assistant-foot t-faint">{sourceLabel}</span>
    </section>
  );
}
