import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  trend,
  icon,
  color = 'blue',
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-primary',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-primary',
  };

  const trendIcon = trend === 'up' ? (
    <ArrowUpIcon className="w-4 h-4 text-green-500" />
  ) : trend === 'down' ? (
    <ArrowDownIcon className="w-4 h-4 text-red-500" />
  ) : (
    <MinusIcon className="w-4 h-4 text-muted-foreground" />
  );

  const changeColor = 
    change && change > 0 ? 'text-green-600' :
    change && change < 0 ? 'text-red-600' :
    'text-muted-foreground';

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {(change !== undefined || changeLabel) && (
            <div className="mt-2 flex items-center space-x-1">
              {trend && trendIcon}
              {change !== undefined && (
                <span className={`text-sm font-medium ${changeColor}`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              )}
              {changeLabel && (
                <span className="text-sm text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
            <div className={`w-8 h-8 ${colorClasses[color].replace('bg-', 'text-')}`}>
              {typeof icon === 'object' && icon !== null && React.isValidElement(icon) ? icon : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}