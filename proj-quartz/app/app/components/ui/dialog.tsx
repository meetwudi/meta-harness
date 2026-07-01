"use client";

import { X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
} from "react";
import { createPortal } from "react-dom";

export function Dialog({
  open,
  title,
  description,
  children,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="quartz-dialog-root">
      <button
        type="button"
        className="quartz-dialog-backdrop"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <section
        className="quartz-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="quartz-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button
            type="button"
            className="quartz-dialog-close"
            aria-label="Close dialog"
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden="true" size={17} strokeWidth={1.9} />
          </button>
        </header>
        <div className="quartz-dialog-body">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
