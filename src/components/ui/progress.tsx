import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100
  indicatorColor?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorColor, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value));

    // Dynamic color based on progress percentage if not specified
    let autoColor = "bg-clinic-500";
    if (clamped >= 100) {
      autoColor = "bg-slate-400";
    } else if (clamped >= 75) {
      autoColor = "bg-amber-500";
    } else {
      autoColor = "bg-emerald-500";
    }

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            indicatorColor || autoColor
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
