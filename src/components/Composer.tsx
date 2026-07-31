/* Compact one-tap composer for adding a timeline update. */

import { Send } from 'lucide-react';
import { useState } from 'react';

interface ComposerProps {
  placeholder?: string;
  onSubmit: (text: string) => void | Promise<void>;
}

export function Composer({ placeholder = 'Add an update…', onSubmit }: ComposerProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await onSubmit(value);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        className="composer-input"
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        className="composer-send"
        disabled={!text.trim() || busy}
        aria-label="Send update"
      >
        <Send size={18} strokeWidth={2.2} />
      </button>
    </form>
  );
}
