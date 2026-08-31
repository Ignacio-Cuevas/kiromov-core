import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-clinic-600 text-white shadow hover:bg-clinic-700",
        secondary:
          "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive:
          "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
        outline: "text-slate-700 border-slate-300",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 font-medium",
        info: "border-sky-200 bg-sky-50 text-sky-700 font-medium",
        neutral: "border-slate-200 bg-slate-100 text-slate-600 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function EstadoPlanBadge({ estado }: { estado: string }) {
  switch (estado) {
    case "Plan Vigente":
      return (
        <Badge variant="success" className="gap-1.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Plan Vigente
        </Badge>
      );
    case "Por Renovar (1 restante)":
      return (
        <Badge variant="warning" className="gap-1.5 py-1 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Por Renovar (1 rest.)
        </Badge>
      );
    case "Plan Finalizado":
      return (
        <Badge variant="neutral" className="gap-1.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Plan Finalizado
        </Badge>
      );
    case "Sin Plan Activo":
    default:
      return (
        <Badge variant="outline" className="gap-1.5 py-1 bg-slate-50 text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          Sin Plan Activo
        </Badge>
      );
  }
}

export { Badge, badgeVariants };
