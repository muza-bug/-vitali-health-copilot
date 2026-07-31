/* The AI care assistant — a proactive agent that reads a Circle's live context
   (status, vitals, recent notes, open tasks), proposes prioritized next steps
   the team can accept with one tap, and answers questions grounded in this
   patient's record ("Ask Vitali"). Powered by the pluggable LLM backend
   (Claude / Ollama / AnythingLLM); falls back to on-device heuristics so it's
   always useful. Nothing it proposes is applied automatically — a nurse decides. */

import { AlertTriangle, RefreshCw, Send, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aiAsk,
  aiSuggest,
  getAiHealth,
  subscribeAiHealth,
  type AiSource,
} from '../services/llm';
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

  // Ask Vitali — one grounded Q&A at a time.
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ text: string; source: AiSource } | null>(null);
  const [asking, setAsking] = useState(false);
  const [credits, setCredits] = useState(getAiHealth().creditsExhausted);

  useEffect(() => subscribeAiHealth((h) => setCredits(h.creditsExhausted)), []);

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

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    const res = await aiAsk(circle, recentNotes, openTaskLabels, q);
    setAnswer(res);
    setAsking(false);
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

      {credits && (
        <div className="credits-banner">
          <AlertTriangle size={15} />
          <span>
            Out of Claude credits — running on on-device fallbacks. Top up in the Claude Console
            dashboard to restore full AI.
          </span>
        </div>
      )}

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

      {/* Ask Vitali — answers grounded in this patient's record only */}
      <div className="ask-box">
        <div className="input-icon">
          <Sparkles size={15} className="t-dim" />
          <input
            className="input has-icon"
            placeholder="Ask about this patient…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void ask()}
            aria-label="Ask the assistant about this patient"
          />
          <button
            className="inline-btn"
            onClick={() => void ask()}
            disabled={asking || !question.trim()}
            aria-label="Send question"
          >
            {asking ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
          </button>
        </div>
        {answer && (
          <div className="ask-answer">
            <p>{answer.text}</p>
            <span className="t-faint">
              {answer.source === 'ai'
                ? 'Vitali AI · grounded in this Circle only — verify against protocol'
                : 'On-device fallback · connect a model for real answers'}
            </span>
          </div>
        )}
      </div>

      <span className="assistant-foot t-faint">{sourceLabel}</span>
    </section>
  );
}
