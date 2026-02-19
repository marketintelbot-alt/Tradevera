import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeKey, onChange }: TabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition",
            tab.key === activeKey ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
          )}
          onClick={() => onChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
