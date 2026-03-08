import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  /** Whether to show avatar placeholder in first column */
  showAvatar?: boolean;
}

const TableSkeleton = ({ columns, rows = 8, showAvatar = false }: TableSkeletonProps) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="grid gap-2 p-4 border-b border-border/50 items-center animate-pulse"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            animationDelay: `${rowIdx * 75}ms`,
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => {
            if (colIdx === 0 && showAvatar) {
              return (
                <div key={colIdx} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-24" />
                </div>
              );
            }
            // Vary widths for visual interest
            const widths = ["w-16", "w-20", "w-12", "w-24", "w-14"];
            return (
              <Skeleton
                key={colIdx}
                className={`h-4 ${widths[colIdx % widths.length]} ${colIdx > 0 ? "mx-auto" : ""}`}
              />
            );
          })}
        </div>
      ))}
    </>
  );
};

export default TableSkeleton;
