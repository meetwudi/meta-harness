"use client";

import { type ReactNode } from "react";

export type TabItem<TabId extends string> = {
  id: TabId;
  label: string;
};

export function Tabs<TabId extends string>({
  items,
  value,
  ariaLabel,
  onValueChange,
}: {
  items: TabItem<TabId>[];
  value: TabId;
  ariaLabel: string;
  onValueChange: (value: TabId) => void;
}) {
  return (
    <div className="quartz-tabs-list" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === value ? "quartz-tab-button is-active" : "quartz-tab-button"}
          role="tab"
          aria-selected={item.id === value}
          onClick={() => onValueChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel<TabId extends string>({
  value,
  activeValue,
  children,
}: {
  value: TabId;
  activeValue: TabId;
  children: ReactNode;
}) {
  if (value !== activeValue) {
    return null;
  }

  return (
    <div className="quartz-tab-panel" role="tabpanel">
      {children}
    </div>
  );
}
