import { Tabs as RadixTabs } from "radix-ui";
import type { ReactNode } from "react";

interface TabsProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  tabs: Array<{ value: T; label: ReactNode }>;
  children: ReactNode;
}

/** Tab strip with arrow-key navigation; render `TabPanel`s as children. */
const Tabs = <T extends string>({ label, value, onChange, tabs, children }: TabsProps<T>) => (
  <RadixTabs.Root value={value} onValueChange={(v) => onChange(v as T)} className="flex flex-col gap-3">
    <RadixTabs.List aria-label={label} className="flex w-fit gap-1 rounded-lg border border-line bg-panel p-1">
      {tabs.map((tab) => (
        <RadixTabs.Trigger
          key={tab.value}
          value={tab.value}
          className="h-7 rounded-md px-3 text-xs font-medium text-muted hover:text-text data-[state=active]:bg-raised data-[state=active]:text-text data-[state=active]:ring-1 data-[state=active]:ring-line-strong"
        >
          {tab.label}
        </RadixTabs.Trigger>
      ))}
    </RadixTabs.List>
    {children}
  </RadixTabs.Root>
);

const TabPanel = ({ value, children }: { value: string; children: ReactNode }) => (
  <RadixTabs.Content value={value} className="flex flex-col gap-3 outline-none">
    {children}
  </RadixTabs.Content>
);

export { TabPanel, Tabs };
