'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  preset?: string;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DateRangePreset[];
  showTimeSelector?: boolean;
  showCustomRange?: boolean;
  className?: string;
  disabled?: boolean;
  maxRange?: number; // days
  minDate?: Date;
  maxDate?: Date;
}

interface DateRangePreset {
  id: string;
  label: string;
  getValue: () => DateRange;
  icon?: React.ReactNode;
}

const DEFAULT_PRESETS: DateRangePreset[] = [
  {
    id: 'today',
    label: 'Today',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: 'Today',
        preset: 'today',
      };
    },
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        label: 'Yesterday',
        preset: 'yesterday',
      };
    },
  },
  {
    id: 'last7days',
    label: 'Last 7 days',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfDay(subDays(now, 6)),
        end: endOfDay(now),
        label: 'Last 7 days',
        preset: 'last7days',
      };
    },
  },
  {
    id: 'last30days',
    label: 'Last 30 days',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
        label: 'Last 30 days',
        preset: 'last30days',
      };
    },
  },
  {
    id: 'thisWeek',
    label: 'This week',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        label: 'This week',
        preset: 'thisWeek',
      };
    },
  },
  {
    id: 'lastWeek',
    label: 'Last week',
    getValue: () => {
      const now = new Date();
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        label: 'Last week',
        preset: 'lastWeek',
      };
    },
  },
  {
    id: 'thisMonth',
    label: 'This month',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: 'This month',
        preset: 'thisMonth',
      };
    },
  },
  {
    id: 'lastMonth',
    label: 'Last month',
    getValue: () => {
      const now = new Date();
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
        label: 'Last month',
        preset: 'lastMonth',
      };
    },
  },
  {
    id: 'last3months',
    label: 'Last 3 months',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfDay(subMonths(now, 3)),
        end: endOfDay(now),
        label: 'Last 3 months',
        preset: 'last3months',
      };
    },
  },
  {
    id: 'last6months',
    label: 'Last 6 months',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfDay(subMonths(now, 6)),
        end: endOfDay(now),
        label: 'Last 6 months',
        preset: 'last6months',
      };
    },
  },
  {
    id: 'thisYear',
    label: 'This year',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        label: 'This year',
        preset: 'thisYear',
      };
    },
  },
  {
    id: 'lastYear',
    label: 'Last year',
    getValue: () => {
      const now = new Date();
      const lastYear = subYears(now, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear),
        label: 'Last year',
        preset: 'lastYear',
      };
    },
  },
];

export function DateRangeSelector({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  showTimeSelector = false,
  showCustomRange = true,
  className = '',
  disabled = false,
  maxRange,
  minDate,
  maxDate,
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState(format(value.start, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(value.end, 'yyyy-MM-dd'));
  const [customStartTime, setCustomStartTime] = useState(format(value.start, 'HH:mm'));
  const [customEndTime, setCustomEndTime] = useState(format(value.end, 'HH:mm'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = preset.getValue();
    onChange(range);
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const handleCustomRangeApply = () => {
    try {
      let start = new Date(customStart);
      let end = new Date(customEnd);

      if (showTimeSelector) {
        const [startHours, startMinutes] = customStartTime.split(':').map(Number);
        const [endHours, endMinutes] = customEndTime.split(':').map(Number);
        
        start.setHours(startHours, startMinutes, 0, 0);
        end.setHours(endHours, endMinutes, 59, 999);
      } else {
        start = startOfDay(start);
        end = endOfDay(end);
      }

      // Validate range
      if (start > end) {
        [start, end] = [end, start];
        setCustomStart(format(start, 'yyyy-MM-dd'));
        setCustomEnd(format(end, 'yyyy-MM-dd'));
      }

      // Check max range
      if (maxRange && (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) > maxRange) {
        start = subDays(end, maxRange);
        setCustomStart(format(start, 'yyyy-MM-dd'));
      }

      // Check min/max dates
      if (minDate && start < minDate) {
        start = minDate;
        setCustomStart(format(start, 'yyyy-MM-dd'));
      }
      if (maxDate && end > maxDate) {
        end = maxDate;
        setCustomEnd(format(end, 'yyyy-MM-dd'));
      }

      const range: DateRange = {
        start,
        end,
        label: `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`,
        preset: 'custom',
      };

      onChange(range);
      setIsOpen(false);
      setIsCustomMode(false);
    } catch (error) {
      console.error('Invalid date range:', error);
    }
  };

  const getDisplayText = () => {
    if (value.preset && value.preset !== 'custom') {
      return value.label;
    }
    
    const startStr = format(value.start, showTimeSelector ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy');
    const endStr = format(value.end, showTimeSelector ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy');
    
    // Show single date if same day
    if (format(value.start, 'yyyy-MM-dd') === format(value.end, 'yyyy-MM-dd')) {
      return startStr;
    }
    
    return `${startStr} - ${endStr}`;
  };

  const isPresetActive = (preset: DateRangePreset) => {
    return value.preset === preset.id;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
          ${isOpen ? 'ring-2 ring-blue-500' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <span className="truncate">{getDisplayText()}</span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[320px] bg-white border border-gray-300 rounded-md shadow-lg">
          {!isCustomMode ? (
            /* Preset List */
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                Quick Select
              </div>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors
                    ${isPresetActive(preset) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{preset.label}</span>
                    {preset.icon && <span className="text-gray-400">{preset.icon}</span>}
                  </div>
                </button>
              ))}
              
              {showCustomRange && (
                <>
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={() => setIsCustomMode(true)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      Custom Range
                    </div>
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Custom Range Form */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Custom Date Range</h3>
                <button
                  onClick={() => setIsCustomMode(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Start Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
                    max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {showTimeSelector && (
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
                    max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {showTimeSelector && (
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              </div>

              {maxRange && (
                <div className="text-xs text-gray-500">
                  Maximum range: {maxRange} days
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCustomRangeApply}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Apply Range
                </button>
                <button
                  onClick={() => {
                    setIsCustomMode(false);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Quick access component for common ranges
export function QuickDateRangeButtons({
  onChange,
  activePreset,
  className = '',
}: {
  onChange: (range: DateRange) => void;
  activePreset?: string;
  className?: string;
}) {
  const quickPresets = DEFAULT_PRESETS.slice(2, 6); // Last 7 days, 30 days, this week, last week

  return (
    <div className={`flex gap-2 ${className}`}>
      {quickPresets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onChange(preset.getValue())}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-colors
            ${activePreset === preset.id
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

// Comparison date range selector for A/B analysis
export function ComparisonDateRangeSelector({
  primaryRange,
  comparisonRange,
  onPrimaryChange,
  onComparisonChange,
  enableComparison = true,
  className = '',
}: {
  primaryRange: DateRange;
  comparisonRange: DateRange | null;
  onPrimaryChange: (range: DateRange) => void;
  onComparisonChange: (range: DateRange | null) => void;
  enableComparison?: boolean;
  className?: string;
}) {
  const [showComparison, setShowComparison] = useState(!!comparisonRange);

  const handleComparisonToggle = (enabled: boolean) => {
    setShowComparison(enabled);
    if (enabled && !comparisonRange) {
      // Auto-select previous period
      const duration = primaryRange.end.getTime() - primaryRange.start.getTime();
      const comparisonEnd = new Date(primaryRange.start.getTime() - 1);
      const comparisonStart = new Date(comparisonEnd.getTime() - duration);
      
      onComparisonChange({
        start: comparisonStart,
        end: comparisonEnd,
        label: 'Previous period',
        preset: 'previous-period',
      });
    } else if (!enabled) {
      onComparisonChange(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <DateRangeSelector
          value={primaryRange}
          onChange={onPrimaryChange}
        />
      </div>

      {/* Comparison Toggle */}
      {enableComparison && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enable-comparison"
            checked={showComparison}
            onChange={(e) => handleComparisonToggle(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="enable-comparison"
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Compare with another period
          </label>
        </div>
      )}

      {/* Comparison Range */}
      {showComparison && comparisonRange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compare to
          </label>
          <DateRangeSelector
            value={comparisonRange}
            onChange={onComparisonChange}
          />
        </div>
      )}
    </div>
  );
}