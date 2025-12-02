import { cn } from "@/lib/utils";
import { OrderStatus } from "@/lib/mock-data";

export function StatusBadge({ status, className }: { status: OrderStatus, className?: string }) {
  const styles = {
    CREATED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    FAILED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    EXPIRED: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wide", styles[status], className)}>
      {status}
    </span>
  );
}
