import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ChartData, Report, ReportFilters, ProjectMetrics, TaskMetrics, TeamMetrics, AnalyticsSummary } from '@/types/analytics';
import { AnalyticsService } from './analytics.service';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json' | 'excel';
  includeCharts?: boolean;
  includeRawData?: boolean;
  template?: 'standard' | 'executive' | 'detailed' | 'custom';
  branding?: {
    logo?: string;
    companyName?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: ReportFilters;
}

export interface ChartExportData {
  title: string;
  type: string;
  data: ChartData;
  canvas?: HTMLCanvasElement;
  base64Image?: string;
}

class ReportExportService {
  private static instance: ReportExportService;

  private constructor() {}

  static getInstance(): ReportExportService {
    if (!ReportExportService.instance) {
      ReportExportService.instance = new ReportExportService();
    }
    return ReportExportService.instance;
  }

  // Generate and export comprehensive analytics report
  async exportAnalyticsReport(
    data: {
      summary: AnalyticsSummary;
      projectMetrics: ProjectMetrics[];
      taskMetrics: TaskMetrics;
      teamMetrics: TeamMetrics[];
      charts?: ChartExportData[];
    },
    options: ExportOptions
  ): Promise<void> {
    switch (options.format) {
      case 'pdf':
        await this.exportToPDF(data, options);
        break;
      case 'csv':
        await this.exportToCSV(data, options);
        break;
      case 'json':
        await this.exportToJSON(data, options);
        break;
      case 'excel':
        await this.exportToExcel(data, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  // Export to PDF with charts and tables
  private async exportToPDF(
    data: any,
    options: ExportOptions
  ): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 20;

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }
    };

    // Header with branding
    if (options.branding?.logo) {
      try {
        pdf.addImage(options.branding.logo, 'PNG', 20, 10, 30, 15);
        currentY = 30;
      } catch (error) {
        console.warn('Failed to add logo to PDF:', error);
      }
    }

    // Company name and title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    const title = options.branding?.companyName 
      ? `${options.branding.companyName} - Analytics Report`
      : 'Analytics Report';
    pdf.text(title, 20, currentY);
    currentY += 15;

    // Date range
    if (options.dateRange) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const dateRange = `Report Period: ${options.dateRange.start.toLocaleDateString()} - ${options.dateRange.end.toLocaleDateString()}`;
      pdf.text(dateRange, 20, currentY);
      currentY += 10;
    }

    // Generated date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, currentY);
    currentY += 15;

    // Executive Summary
    checkPageBreak(40);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Executive Summary', 20, currentY);
    currentY += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const summaryData = [
      ['Total Projects', data.summary.overview.totalProjects.toString()],
      ['Active Projects', data.summary.overview.activeProjects.toString()],
      ['Total Tasks', data.summary.overview.totalTasks.toString()],
      ['Completed Tasks', data.summary.overview.completedTasks.toString()],
      ['Team Members', data.summary.overview.totalMembers.toString()],
      ['Overall Health Score', `${data.summary.overview.overallHealthScore.toFixed(1)}%`],
      ['Completion Rate', `${data.summary.performance.completionRate.toFixed(1)}%`],
      ['Average Velocity', `${data.summary.performance.averageVelocity.toFixed(2)} tasks/day`],
      ['Productivity Trend', data.summary.performance.productivityTrend],
    ];

    pdf.autoTable({
      startY: currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: options.branding?.colors?.primary || [41, 128, 185] },
      margin: { left: 20 },
      tableWidth: pageWidth - 40,
    });

    currentY = pdf.lastAutoTable.finalY + 15;

    // Project Metrics Table
    if (data.projectMetrics && data.projectMetrics.length > 0) {
      checkPageBreak(50);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Project Performance', 20, currentY);
      currentY += 10;

      const projectData = data.projectMetrics.map((project: ProjectMetrics) => [
        project.projectName,
        project.totalTasks.toString(),
        project.completedTasks.toString(),
        `${project.completionRate.toFixed(1)}%`,
        `${project.velocity.toFixed(2)}`,
        `${project.healthScore.toFixed(0)}%`,
        project.trending,
      ]);

      pdf.autoTable({
        startY: currentY,
        head: [['Project', 'Total Tasks', 'Completed', 'Completion %', 'Velocity', 'Health', 'Trend']],
        body: projectData,
        theme: 'striped',
        headStyles: { fillColor: options.branding?.colors?.secondary || [52, 152, 219] },
        margin: { left: 20 },
        tableWidth: pageWidth - 40,
        styles: { fontSize: 9 },
      });

      currentY = pdf.lastAutoTable.finalY + 15;
    }

    // Task Status Distribution
    if (data.taskMetrics) {
      checkPageBreak(40);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Task Distribution', 20, currentY);
      currentY += 10;

      const taskStatusData = Object.entries(data.taskMetrics.byStatus).map(([status, count]) => [
        status.charAt(0).toUpperCase() + status.slice(1).replace(/([A-Z])/g, ' $1'),
        count.toString(),
        `${((count as number / data.taskMetrics.totalTasks) * 100).toFixed(1)}%`,
      ]);

      pdf.autoTable({
        startY: currentY,
        head: [['Status', 'Count', 'Percentage']],
        body: taskStatusData,
        theme: 'grid',
        headStyles: { fillColor: [155, 89, 182] },
        margin: { left: 20 },
        tableWidth: pageWidth - 40,
      });

      currentY = pdf.lastAutoTable.finalY + 15;
    }

    // Charts
    if (options.includeCharts && data.charts && data.charts.length > 0) {
      for (const chart of data.charts) {
        checkPageBreak(80);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(chart.title, 20, currentY);
        currentY += 10;

        if (chart.base64Image) {
          try {
            const imgWidth = pageWidth - 40;
            const imgHeight = 60;
            pdf.addImage(chart.base64Image, 'PNG', 20, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
          } catch (error) {
            console.warn('Failed to add chart image:', error);
            pdf.text('Chart could not be rendered', 20, currentY);
            currentY += 10;
          }
        }
      }
    }

    // Insights and Recommendations
    if (data.summary.insights && data.summary.insights.length > 0) {
      checkPageBreak(40);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Insights', 20, currentY);
      currentY += 10;

      data.summary.insights.forEach((insight: any, index: number) => {
        checkPageBreak(15);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${insight.title}`, 20, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        const description = pdf.splitTextToSize(insight.description, pageWidth - 40);
        pdf.text(description, 25, currentY);
        currentY += description.length * 4 + 5;
      });
    }

    if (data.summary.recommendations && data.summary.recommendations.length > 0) {
      checkPageBreak(40);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recommendations', 20, currentY);
      currentY += 10;

      data.summary.recommendations.forEach((rec: any, index: number) => {
        checkPageBreak(20);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${rec.title}`, 20, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        const description = pdf.splitTextToSize(rec.description, pageWidth - 40);
        pdf.text(description, 25, currentY);
        currentY += description.length * 4 + 5;
      });
    }

    // Footer with page numbers
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
    }

    // Save the PDF
    const fileName = `analytics_report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  }

  // Export to CSV format
  private async exportToCSV(data: any, options: ExportOptions): Promise<void> {
    let csvContent = '';

    // Header
    csvContent += `Analytics Report\n`;
    csvContent += `Generated: ${new Date().toISOString()}\n`;
    if (options.dateRange) {
      csvContent += `Period: ${options.dateRange.start.toISOString()} - ${options.dateRange.end.toISOString()}\n`;
    }
    csvContent += `\n`;

    // Summary metrics
    csvContent += `Summary\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Projects,${data.summary.overview.totalProjects}\n`;
    csvContent += `Active Projects,${data.summary.overview.activeProjects}\n`;
    csvContent += `Total Tasks,${data.summary.overview.totalTasks}\n`;
    csvContent += `Completed Tasks,${data.summary.overview.completedTasks}\n`;
    csvContent += `Team Members,${data.summary.overview.totalMembers}\n`;
    csvContent += `Overall Health Score,${data.summary.overview.overallHealthScore}\n`;
    csvContent += `Completion Rate,${data.summary.performance.completionRate}\n`;
    csvContent += `Average Velocity,${data.summary.performance.averageVelocity}\n`;
    csvContent += `\n`;

    // Project metrics
    if (data.projectMetrics && data.projectMetrics.length > 0) {
      csvContent += `Project Metrics\n`;
      csvContent += `Project Name,Total Tasks,Completed Tasks,Completion Rate,Velocity,Health Score,Trending\n`;
      
      data.projectMetrics.forEach((project: ProjectMetrics) => {
        csvContent += `"${project.projectName}",${project.totalTasks},${project.completedTasks},${project.completionRate},${project.velocity},${project.healthScore},${project.trending}\n`;
      });
      csvContent += `\n`;
    }

    // Task status distribution
    if (data.taskMetrics) {
      csvContent += `Task Status Distribution\n`;
      csvContent += `Status,Count,Percentage\n`;
      
      Object.entries(data.taskMetrics.byStatus).forEach(([status, count]) => {
        const percentage = ((count as number) / data.taskMetrics.totalTasks) * 100;
        csvContent += `${status},${count},${percentage.toFixed(2)}\n`;
      });
      csvContent += `\n`;
    }

    // Task priority distribution
    if (data.taskMetrics && data.taskMetrics.byPriority) {
      csvContent += `Task Priority Distribution\n`;
      csvContent += `Priority,Count,Percentage\n`;
      
      Object.entries(data.taskMetrics.byPriority).forEach(([priority, count]) => {
        const percentage = ((count as number) / data.taskMetrics.totalTasks) * 100;
        csvContent += `${priority},${count},${percentage.toFixed(2)}\n`;
      });
      csvContent += `\n`;
    }

    // Team metrics
    if (data.teamMetrics && data.teamMetrics.length > 0) {
      csvContent += `Team Metrics\n`;
      csvContent += `Team,Size,Active Members,Tasks Completed,Avg Tasks per Member,Collaboration Score\n`;
      
      data.teamMetrics.forEach((team: TeamMetrics) => {
        csvContent += `"Team",${team.teamSize},${team.activeMembers},${team.totalTasksCompleted},${team.averageTasksPerMember},${team.collaborationScore}\n`;
      });
      csvContent += `\n`;
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export to JSON format
  private async exportToJSON(data: any, options: ExportOptions): Promise<void> {
    const jsonData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: options.dateRange,
        filters: options.filters,
        exportOptions: options,
      },
      summary: data.summary,
      projectMetrics: data.projectMetrics,
      taskMetrics: data.taskMetrics,
      teamMetrics: data.teamMetrics,
      charts: options.includeRawData ? data.charts : undefined,
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export to Excel format (using CSV for now, could be enhanced with SheetJS)
  private async exportToExcel(data: any, options: ExportOptions): Promise<void> {
    // For now, use CSV format but with .xlsx extension
    // In a real implementation, you'd use libraries like SheetJS (xlsx) for proper Excel format
    await this.exportToCSV(data, options);
  }

  // Convert chart canvas to base64 image
  convertChartToImage(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png', 1.0);
  }

  // Batch export multiple charts
  async exportChartsAsImages(charts: ChartExportData[]): Promise<ChartExportData[]> {
    return charts.map(chart => ({
      ...chart,
      base64Image: chart.canvas ? this.convertChartToImage(chart.canvas) : chart.base64Image,
    }));
  }

  // Generate report preview (for UI)
  generateReportPreview(data: any, options: ExportOptions): {
    pageCount: number;
    sections: string[];
    estimatedSize: string;
  } {
    const sections = ['Executive Summary', 'Project Performance'];
    
    if (data.taskMetrics) {
      sections.push('Task Distribution');
    }
    
    if (data.teamMetrics && data.teamMetrics.length > 0) {
      sections.push('Team Metrics');
    }
    
    if (options.includeCharts && data.charts && data.charts.length > 0) {
      sections.push('Charts and Visualizations');
    }
    
    if (data.summary.insights && data.summary.insights.length > 0) {
      sections.push('Insights and Recommendations');
    }

    const pageCount = Math.ceil(sections.length * 1.5); // Rough estimate
    const estimatedSize = options.format === 'pdf' ? '1-3 MB' : '50-200 KB';

    return {
      pageCount,
      sections,
      estimatedSize,
    };
  }

  // Validate export data
  validateExportData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.summary) {
      errors.push('Summary data is required');
    }

    if (!data.projectMetrics || !Array.isArray(data.projectMetrics)) {
      errors.push('Project metrics data is required');
    }

    if (!data.taskMetrics) {
      errors.push('Task metrics data is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const reportExportService = ReportExportService.getInstance();