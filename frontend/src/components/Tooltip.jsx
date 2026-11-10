import React, { useState } from 'react';

/**
 * Tooltip that triggers ONLY on mouse hover.
 * Automatically wraps children and shows full text in a floating tooltip box.
 */
export default function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = useState(false);

  if (!text) return children;

  return (
    <div
      className="relative inline-flex max-w-full"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 px-3 py-2 text-xs font-normal text-white bg-slate-900 rounded-lg shadow-xl pointer-events-none transition-opacity duration-150 whitespace-normal max-w-xs break-words border border-slate-700/50 ${
            position === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : 'top-full left-1/2 -translate-x-1/2 mt-2'
          }`}
        >
          {text}
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              position === 'top'
                ? 'top-full border-t-slate-900'
                : 'bottom-full border-b-slate-900'
            }`}
          />
        </div>
      )}
    </div>
  );
}

