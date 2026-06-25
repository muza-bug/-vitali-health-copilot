/* Sticky top bar for pushed screens: optional back button, title, right slot. */

import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface ScreenHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  /** Where back should go; defaults to browser history. */
  backTo?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, back, backTo, right }: ScreenHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="screen-header">
      {back && (
        <button
          className="icon-btn"
          aria-label="Go back"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="screen-header-titles grow">
        <h1 className="screen-header-title truncate">{title}</h1>
        {subtitle && <div className="screen-header-sub truncate t-dim">{subtitle}</div>}
      </div>
      {right && <div className="screen-header-right">{right}</div>}
    </header>
  );
}
