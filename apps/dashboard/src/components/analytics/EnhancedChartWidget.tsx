'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale,
  ChartOptions,
  Plugin,
  TooltipItem,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import { ChartData, WidgetConfig } from '@/types/analytics';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
  zoomPlugin
);

interface EnhancedChartWidgetProps {
  id: string;
  title: string;
  description?: string;
  data: ChartData;
  config: WidgetConfig;
  className?: string;
  realTimeData?: boolean;
  onDataUpdate?: (id: string) => void;
  onExport?: (id: string, format: 'png' | 'pdf' | 'csv') => void;
  showControls?: boolean;
  annotations?: any[];
  predictiveData?: any;
  comparisonData?: ChartData;
  insights?: {
    trend: 'up' | 'down' | 'stable';
    change: number;
    period: string;
    significance: 'high' | 'medium' | 'low';
    description: string;
  };
}

const customTooltipPlugin: Plugin<'line' | 'bar' | 'scatter'> = {
  id: 'customTooltip',
  afterDraw: (chart) => {
    const tooltip = chart.tooltip;
    if (!tooltip || !tooltip.getActiveElements().length) return;

    const ctx = chart.ctx;
    const position = tooltip.caretPosition;
    
    // Draw custom tooltip background
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(position.x - 60, position.y - 40, 120, 30, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
};

const trendlinePlugin: Plugin<'line' | 'scatter'> = {
  id: 'trendline',
  afterDraw: (chart) => {
    if (!chart.options.plugins?.trendline?.display) return;

    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    if (!dataset || !dataset.data || dataset.data.length < 2) return;

    // Calculate linear regression
    const data = dataset.data as number[];
    const n = data.length;
    const indices = data.map((_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * data[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Draw trend line
    ctx.save();
    ctx.strokeStyle = chart.options.plugins?.trendline?.color || '#10B981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    const meta = chart.getDatasetMeta(0);
    if (meta.data.length >= 2) {
      const firstPoint = meta.data[0];
      const lastPoint = meta.data[meta.data.length - 1];
      
      const startY = chart.scales.y.getPixelForValue(intercept);
      const endY = chart.scales.y.getPixelForValue(intercept + slope * (n - 1));
      
      ctx.beginPath();
      ctx.moveTo(firstPoint.x, startY);
      ctx.lineTo(lastPoint.x, endY);
      ctx.stroke();
    }
    
    ctx.restore();
  },
};

export function EnhancedChartWidget({
  id,
  title,
  description,
  data,
  config,
  className = '',
  realTimeData = false,
  onDataUpdate,
  onExport,
  showControls = true,
  annotations = [],
  predictiveData,
  comparisonData,
  insights,
}: EnhancedChartWidgetProps) {
  const chartRef = useRef<any>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showLegend, setShowLegend] = useState(config.showLegend ?? true);
  const [showGrid, setShowGrid] = useState(config.showGrid ?? true);
  const [showTrendline, setShowTrendline] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Auto-refresh for real-time data
  useEffect(() => {
    if (realTimeData && onDataUpdate) {
      const interval = setInterval(() => {
        onDataUpdate(id);
        setLastUpdate(new Date());
      }, config.refreshInterval ? config.refreshInterval * 1000 : 30000);

      return () => clearInterval(interval);
    }
  }, [realTimeData, onDataUpdate, id, config.refreshInterval]);

  const getEnhancedChartOptions = (): ChartOptions<any> => {
    const baseOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: showLegend,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (context: TooltipItem<any>[]) => {
              return context[0]?.label || '';
            },
            label: (context: TooltipItem<any>) => {
              const label = context.dataset.label || '';
              const value = context.formattedValue;
              
              if (config.chartType === 'pie' || config.chartType === 'doughnut') {
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
              
              return `${label}: ${value}`;
            },
            afterLabel: (context: TooltipItem<any>) => {
              // Add trend information for time series data
              if (config.chartType === 'line' && context.dataIndex > 0) {
                const current = context.parsed.y;
                const previous = (context.dataset.data as number[])[context.dataIndex - 1];
                const change = ((current - previous) / previous * 100).toFixed(1);
                const trend = current > previous ? '↗' : current < previous ? '↘' : '→';
                return `Change: ${change}% ${trend}`;
              }
              return '';
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x',
            onZoomComplete: ({ chart }) => {
              setIsZoomed(chart.getZoomLevel() > 1);
            },
          },
        },
        annotation: {
          annotations: annotations.reduce((acc, annotation, index) => {
            acc[`annotation${index}`] = annotation;
            return acc;
          }, {} as any),
        },
        trendline: {
          display: showTrendline,
          color: '#10B981',
        },
      },
      scales: config.chartType !== 'pie' && config.chartType !== 'doughnut' && config.chartType !== 'radar' ? {
        x: {
          type: config.timeRange ? 'time' : 'category',
          display: true,
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false,
          },
          ticks: {
            font: {
              size: 11,
            },
            maxTicksLimit: 10,
          },
          ...(config.timeRange && {
            time: {
              unit: config.timeRange === 'day' ? 'hour' : 
                    config.timeRange === 'week' ? 'day' :
                    config.timeRange === 'month' ? 'week' : 'month',
              displayFormats: {
                hour: 'HH:mm',
                day: 'MMM d',
                week: 'MMM d',
                month: 'MMM yyyy',
              },
            },
          }),
        },
        y: {
          display: true,
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false,
          },
          ticks: {
            font: {
              size: 11,
            },
            callback: (value: any) => {
              // Format large numbers
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value;
            },
          },
        },
      } : undefined,
      animation: {
        duration: 750,
        easing: 'easeInOutQuart',
      },
    };

    return baseOptions;
  };

  const getEnhancedChartData = (): ChartData => {
    let enhancedData = { ...data };

    // Add comparison data
    if (showComparison && comparisonData && comparisonData.datasets) {
      enhancedData = {
        ...enhancedData,
        datasets: [
          ...enhancedData.datasets,
          ...comparisonData.datasets.map(dataset => ({
            ...dataset,
            label: `${dataset.label} (Comparison)`,
            borderDash: [5, 5],
            backgroundColor: dataset.backgroundColor ? 
              (typeof dataset.backgroundColor === 'string' ? 
                dataset.backgroundColor.replace('1)', '0.3)') : 
                dataset.backgroundColor) : undefined,
          })),
        ],
      };
    }

    // Add predictive data
    if (showPrediction && predictiveData && predictiveData.datasets) {
      enhancedData = {
        ...enhancedData,
        datasets: [
          ...enhancedData.datasets,
          ...predictiveData.datasets.map((dataset: any) => ({
            ...dataset,
            label: `${dataset.label} (Predicted)`,
            borderDash: [10, 5],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            pointStyle: 'triangle',
          })),
        ],
      };
    }

    return enhancedData;
  };

  const handleRefresh = () => {
    if (onDataUpdate) {
      onDataUpdate(id);
      setLastUpdate(new Date());
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  };

  const handleExport = (format: 'png' | 'pdf' | 'csv') => {
    if (format === 'png' && chartRef.current) {
      const canvas = chartRef.current.canvas;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.png`;
      a.href = url;
      a.click();
    } else if (onExport) {
      onExport(id, format);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderChart = () => {
    const chartData = getEnhancedChartData();
    const options = getEnhancedChartOptions();

    // Add plugins
    const plugins: Plugin<any>[] = [];
    if (config.chartType === 'line' || config.chartType === 'scatter') {
      plugins.push(customTooltipPlugin as any);
      if (showTrendline) {
        plugins.push(trendlinePlugin as any);
      }
    }

    const commonProps = {
      ref: chartRef,
      data: chartData,
      options,
      plugins,
    };

    switch (config.chartType) {
      case 'line':
      case 'area':
        return <Line {...commonProps} />;
      case 'bar':
        return <Bar {...commonProps} />;
      case 'pie':
        return <Pie {...commonProps} />;
      case 'doughnut':
        return <Doughnut {...commonProps} />;
      case 'radar':
        return <Radar {...commonProps} />;
      case 'scatter':
        return <Scatter {...commonProps} />;
      default:
        return <Line {...commonProps} />;
    }
  };

  const chartContainerClasses = isFullscreen 
    ? 'fixed inset-0 z-50 bg-white p-6' 
    : `bg-white rounded-lg shadow-sm p-6 ${className}`;

  return (
    <div className={chartContainerClasses}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {realTimeData && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
          {realTimeData && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {/* Controls */}
        {showControls && (
          <div className="flex items-center gap-1">
            {realTimeData && (
              <button
                onClick={handleRefresh}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Refresh data"
              >
                <ArrowPathIcon className="w-4 h-4 text-gray-500" />
              </button>
            )}
            
            {config.chartType === 'line' && (
              <button
                onClick={() => setShowTrendline(!showTrendline)}
                className={`p-1 hover:bg-gray-100 rounded transition-colors ${showTrendline ? 'text-green-600' : 'text-gray-500'}`}
                title="Toggle trendline"
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
              </button>
            )}
            
            {comparisonData && (
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`p-1 hover:bg-gray-100 rounded transition-colors ${showComparison ? 'text-blue-600' : 'text-gray-500'}`}
                title="Toggle comparison"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            )}
            
            {predictiveData && (
              <button
                onClick={() => setShowPrediction(!showPrediction)}
                className={`p-1 hover:bg-gray-100 rounded transition-colors ${showPrediction ? 'text-green-600' : 'text-gray-500'}`}
                title="Toggle predictions"
              >
                <InformationCircleIcon className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`p-1 hover:bg-gray-100 rounded transition-colors ${showLegend ? 'text-gray-700' : 'text-gray-400'}`}
              title="Toggle legend"
            >
              {showLegend ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
            </button>
            
            {isZoomed && (
              <button
                onClick={handleResetZoom}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-blue-600"
                title="Reset zoom"
              >
                <ArrowsPointingOutIcon className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={() => handleExport('png')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Export as PNG"
            >
              <DocumentArrowDownIcon className="w-4 h-4 text-gray-500" />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Toggle fullscreen"
            >
              <ArrowsPointingOutIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {/* Insights */}
      {insights && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {insights.trend === 'up' ? (
              <ArrowUpIcon className="w-4 h-4 text-green-500" />
            ) : insights.trend === 'down' ? (
              <ArrowDownIcon className="w-4 h-4 text-red-500" />
            ) : (
              <div className="w-4 h-4 bg-gray-400 rounded-full" />
            )}
            <span className="text-sm font-medium">
              {insights.change > 0 ? '+' : ''}{insights.change}% {insights.period}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              insights.significance === 'high' ? 'bg-red-100 text-red-700' :
              insights.significance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {insights.significance} impact
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{insights.description}</p>
        </div>
      )}

      {/* Chart */}
      <div className={isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-64'}>
        {renderChart()}
      </div>
      
      {/* Chart Controls */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded"
            />
            Grid
          </label>
          {config.chartType !== 'pie' && config.chartType !== 'doughnut' && (
            <span className="text-gray-400">Scroll to zoom • Drag to pan</span>
          )}
        </div>
        <div>
          {data.datasets.length} dataset{data.datasets.length !== 1 ? 's' : ''} • 
          {data.labels?.length || 0} data points
        </div>
      </div>

      {/* Fullscreen overlay close */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}