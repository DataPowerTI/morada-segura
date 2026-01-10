import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
  },
};

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend,
  variant = 'default' 
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="stats-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p className={cn(
              "text-sm font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}% em relação ao mês passado
            </p>
          )}
        </div>
        <div className={cn("stats-card-icon", styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
