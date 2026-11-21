"use client";

import { useState } from "react";
import { PrimeExplorer } from "@/components/prime-explorer";
import { UlamCircle } from "@/components/ulam-circle";

type TabId = "formula" | "graph";

const TABS: { id: TabId; label: string }[] = [
  { id: "formula", label: "Formula testing" },
  { id: "graph", label: "Graphical distribution" },
];

export function AppTabs() {
  const [tab, setTab] = useState<TabId>("formula");

  return (
    <div>
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-8">
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Project Prime</h1>
        <div role="tablist" aria-label="Views" className="mt-6 flex gap-2 border-b border-[#e4dccb]">
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                className={`-mb-px border-b-2 px-3 py-2 text-sm sm:text-base ${
                  selected
                    ? "border-[#1c1915] text-[#1c1915]"
                    : "border-transparent text-[#5c564c]"
                }`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "formula" ? <PrimeExplorer /> : <UlamCircle />}
      </div>
    </div>
  );
}
