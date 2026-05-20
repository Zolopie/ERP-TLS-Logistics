import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Active: "bg-[hsl(var(--status-active-bg))] text-[hsl(var(--status-active-fg))]",
  Inactive: "bg-[hsl(var(--status-inactive-bg))] text-[hsl(var(--status-inactive-fg))]",
  Pending: "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))]",
  "Pending Approval": "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))]",
  Rejected: "bg-[hsl(var(--status-critical-bg))] text-[hsl(var(--status-critical-fg))]",
  Approved: "bg-[hsl(var(--status-approved-bg))] text-[hsl(var(--status-approved-fg))]",
  Delivered: "bg-[hsl(var(--status-delivered-bg))] text-[hsl(var(--status-delivered-fg))]",
  Completed: "bg-[hsl(var(--status-completed-bg))] text-[hsl(var(--status-completed-fg))]",
  Processing: "bg-[hsl(var(--status-processing-bg))] text-[hsl(var(--status-processing-fg))]",
  Shipped: "bg-[hsl(var(--status-shipped-bg))] text-[hsl(var(--status-shipped-fg))]",
  Critical: "bg-[hsl(var(--status-critical-bg))] text-[hsl(var(--status-critical-fg))]",
  Low: "bg-[hsl(var(--status-low-bg))] text-[hsl(var(--status-low-fg))]",
  "In Stock": "bg-[hsl(var(--status-instock-bg))] text-[hsl(var(--status-instock-fg))]",
};

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", map[status] || "bg-muted text-muted-foreground")}>
    {status}
  </span>
);

export const stockStatus = (current: number, min: number) => {
  if (current >= min) return "In Stock";
  if (current < min * 0.4) return "Critical";
  return "Low";
};
