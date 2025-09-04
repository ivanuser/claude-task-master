'use client';

import React, { useState, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { PlusIcon, XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { ChartWidget } from './ChartWidget';
import { MetricCard } from './MetricCard';
import { DashboardWidget, WidgetConfig } from '@/types/analytics';
import { AnalyticsService } from '@/lib/services/analytics.service';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface CustomizableDashboardProps {
  initialWidgets?: DashboardWidget[];
  onSave?: (widgets: DashboardWidget[]) => void;
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'tasks-status',
    type: 'chart',
    title: 'Tasks by Status',
    description: 'Current task distribution',
    data: null,
    config: {
      chartType: 'doughnut',
      showLegend: true,
      timeRange: 'all',
    },
    position: { x: 0, y: 0, w: 6, h: 4 },
  },
  {
    id: 'velocity',
    type: 'chart',
    title: 'Team Velocity',
    description: 'Tasks completed over time',
    data: null,
    config: {
      chartType: 'line',
      showLegend: false,
      showGrid: true,
      timeRange: 'month',
    },
    position: { x: 6, y: 0, w: 6, h: 4 },
  },
  {
    id: 'completion-rate',
    type: 'metric',
    title: 'Completion Rate',
    data: { value: '64%', change: 5.2, trend: 'up' },
    config: {},
    position: { x: 0, y: 4, w: 3, h: 2 },
  },
  {
    id: 'active-tasks',
    type: 'metric',
    title: 'Active Tasks',
    data: { value: 42, changeLabel: 'in progress' },
    config: {},
    position: { x: 3, y: 4, w: 3, h: 2 },
  },
  {
    id: 'blocked-tasks',
    type: 'metric',
    title: 'Blocked Tasks',
    data: { value: 5, change: -2, trend: 'down' },
    config: {},
    position: { x: 6, y: 4, w: 3, h: 2 },
  },
  {
    id: 'team-members',
    type: 'metric',
    title: 'Team Members',
    data: { value: 8, changeLabel: 'active' },
    config: {},
    position: { x: 9, y: 4, w: 3, h: 2 },
  },
];

const availableWidgetTypes = [
  { id: 'chart-line', type: 'chart', title: 'Line Chart', config: { chartType: 'line' } },
  { id: 'chart-bar', type: 'chart', title: 'Bar Chart', config: { chartType: 'bar' } },
  { id: 'chart-pie', type: 'chart', title: 'Pie Chart', config: { chartType: 'pie' } },
  { id: 'chart-doughnut', type: 'chart', title: 'Doughnut Chart', config: { chartType: 'doughnut' } },
  { id: 'metric', type: 'metric', title: 'Metric Card', config: {} },
  { id: 'list', type: 'list', title: 'Task List', config: {} },
  { id: 'table', type: 'table', title: 'Data Table', config: {} },
];

export function CustomizableDashboard({
  initialWidgets = defaultWidgets,
  onSave,
}: CustomizableDashboardProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleLayoutChange = useCallback((layout: any[]) => {
    if (isDragging) return;
    
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        const layoutItem = layout.find(l => l.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            },
          };
        }
        return widget;
      })
    );
  }, [isDragging]);

  const addWidget = (type: any) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: type.type,
      title: type.title,
      data: null,
      config: type.config,
      position: {
        x: 0,
        y: 0,
        w: type.type === 'metric' ? 3 : 6,
        h: type.type === 'metric' ? 2 : 4,
      },
    };
    
    setWidgets([...widgets, newWidget]);
    setIsAddingWidget(false);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets(widgets.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    ));
    setEditingWidget(null);
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'chart':
        // Generate mock chart data
        const chartData = {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: widget.title,
            data: [12, 19, 3, 5, 2, 3, 9],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
          }],
        };
        
        return (
          <ChartWidget
            title={widget.title}
            description={widget.description}
            data={widget.data || chartData}
            config={widget.config}
          />
        );
      
      case 'metric':
        return (
          <MetricCard
            title={widget.title}
            value={widget.data?.value || 0}
            change={widget.data?.change}
            changeLabel={widget.data?.changeLabel}
            trend={widget.data?.trend}
          />
        );
      
      case 'list':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 h-full">
            <h3 className="text-lg font-semibold mb-4">{widget.title}</h3>
            <ul className="space-y-2">
              <li className="text-sm text-gray-600">• Task Item 1</li>
              <li className="text-sm text-gray-600">• Task Item 2</li>
              <li className="text-sm text-gray-600">• Task Item 3</li>
            </ul>
          </div>
        );
      
      case 'table':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 h-full overflow-auto">
            <h3 className="text-lg font-semibold mb-4">{widget.title}</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900">Sample Task 1</td>
                  <td className="px-4 py-2 text-sm text-gray-500">In Progress</td>
                  <td className="px-4 py-2 text-sm text-gray-500">High</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 h-full">
            <h3 className="text-lg font-semibold">{widget.title}</h3>
          </div>
        );
    }
  };

  const layouts = {
    lg: widgets.map(w => ({
      i: w.id,
      x: w.position.x,
      y: w.position.y,
      w: w.position.w,
      h: w.position.h,
      minW: w.type === 'metric' ? 2 : 3,
      minH: w.type === 'metric' ? 2 : 3,
    })),
  };

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-xl font-semibold">Custom Dashboard</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsAddingWidget(true)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Widget
          </button>
          {onSave && (
            <button
              onClick={() => onSave(widgets)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Save Layout
            </button>
          )}
        </div>
      </div>

      {/* Add Widget Modal */}
      {isAddingWidget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setIsAddingWidget(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium mb-4">Add Widget</h3>
              <div className="grid grid-cols-2 gap-3">
                {availableWidgetTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => addWidget(type)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                  >
                    <span className="font-medium">{type.title}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsAddingWidget(false)}
                className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={true}
        isResizable={true}
        onLayoutChange={handleLayoutChange}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        onResizeStart={() => setIsDragging(true)}
        onResizeStop={() => setIsDragging(false)}
      >
        {widgets.map(widget => (
          <div key={widget.id} className="relative group">
            {/* Widget Controls */}
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
              <button
                onClick={() => setEditingWidget(widget.id)}
                className="p-1 bg-white rounded-md shadow-sm hover:bg-gray-100"
              >
                <Cog6ToothIcon className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => removeWidget(widget.id)}
                className="p-1 bg-white rounded-md shadow-sm hover:bg-gray-100"
              >
                <XMarkIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {renderWidget(widget)}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Edit Widget Modal */}
      {editingWidget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setEditingWidget(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium mb-4">Edit Widget</h3>
              {/* Widget edit form would go here */}
              <p className="text-sm text-gray-500">
                Widget configuration options would appear here
              </p>
              <button
                onClick={() => setEditingWidget(null)}
                className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}