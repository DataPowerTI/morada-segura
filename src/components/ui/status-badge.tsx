import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'pending' | 'collected' | 'active' | 'inactive';
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    className: 'status-pending',
  },
  collected: {
    label: 'Retirada',
    className: 'status-collected',
  },
  active: {
    label: 'No local',
    className: 'status-active',
  },
  inactive: {
    label: 'Saiu',
    className: 'bg-muted text-muted-foreground border border-border',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
