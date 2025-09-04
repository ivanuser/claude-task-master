import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, ReportFilters, AnalyticsSummary, ProjectMetrics, TaskMetrics } from '@/types/analytics';
import { Task } from '@/types/task';
import { Project } from '@/types/project';

export class ExportService {
  // Export to CSV
  static exportToCSV(
    data: any[],
    filename: string = 'report.csv'
  ): void {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Export to JSON
  static exportToJSON(
    data: any,
    filename: string = 'report.json'
  ): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Export to PDF
  static async exportToPDF(
    report: {
      title: string;
      subtitle?: string;
      summary?: AnalyticsSummary;
      projects?: ProjectMetrics[];
      tasks?: Task[];
      filters?: ReportFilters;
    },
    filename: string = 'report.pdf'
  ): Promise<void> {
    const pdf = new jsPDF();
    let yPosition = 20;
    
    // Add title
    pdf.setFontSize(20);
    pdf.text(report.title, 20, yPosition);
    yPosition += 10;
    
    if (report.subtitle) {
      pdf.setFontSize(12);
      pdf.text(report.subtitle, 20, yPosition);
      yPosition += 10;
    }
    
    // Add generation date
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 15;
    
    // Add filters if present
    if (report.filters) {
      pdf.setFontSize(12);
      pdf.text('Report Filters:', 20, yPosition);
      yPosition += 7;
      
      pdf.setFontSize(10);
      if (report.filters.dateRange) {
        pdf.text(
          `Date Range: ${new Date(report.filters.dateRange.start).toLocaleDateString()} - ${new Date(report.filters.dateRange.end).toLocaleDateString()}`,
          25,
          yPosition
        );
        yPosition += 5;
      }
      
      if (report.filters.projects && report.filters.projects.length > 0) {
        pdf.text(`Projects: ${report.filters.projects.join(', ')}`, 25, yPosition);
        yPosition += 5;
      }
      
      if (report.filters.taskStatuses && report.filters.taskStatuses.length > 0) {
        pdf.text(`Task Statuses: ${report.filters.taskStatuses.join(', ')}`, 25, yPosition);
        yPosition += 5;
      }
      
      yPosition += 10;
    }
    
    // Add summary section
    if (report.summary) {
      pdf.setFontSize(14);
      pdf.text('Executive Summary', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      const summaryData = [
        ['Total Projects', report.summary.overview.totalProjects.toString()],
        ['Active Projects', report.summary.overview.activeProjects.toString()],
        ['Total Tasks', report.summary.overview.totalTasks.toString()],
        ['Completed Tasks', report.summary.overview.completedTasks.toString()],
        ['Completion Rate', `${report.summary.performance.completionRate.toFixed(1)}%`],
        ['Average Velocity', `${report.summary.performance.averageVelocity.toFixed(1)} tasks/day`],
        ['Productivity Trend', report.summary.performance.productivityTrend],
        ['Health Score', `${report.summary.overview.overallHealthScore.toFixed(0)}/100`],
      ];
      
      autoTable(pdf, {
        head: [['Metric', 'Value']],
        body: summaryData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 40 },
        },
      });
      
      yPosition = (pdf as any).lastAutoTable.finalY + 15;
    }
    
    // Add project metrics
    if (report.projects && report.projects.length > 0) {
      // Check if we need a new page
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.text('Project Metrics', 20, yPosition);
      yPosition += 10;
      
      const projectData = report.projects.map(p => [
        p.projectName,
        p.totalTasks.toString(),
        p.completedTasks.toString(),
        `${p.completionRate.toFixed(1)}%`,
        `${p.velocity.toFixed(1)}`,
        `${p.healthScore}/100`,
        p.trending,
      ]);
      
      autoTable(pdf, {
        head: [['Project', 'Total', 'Done', 'Rate', 'Velocity', 'Health', 'Trend']],
        body: projectData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20 },
        styles: { fontSize: 9 },
      });
      
      yPosition = (pdf as any).lastAutoTable.finalY + 15;
    }
    
    // Add task list if included
    if (report.tasks && report.tasks.length > 0) {
      // Check if we need a new page
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.text('Task Details', 20, yPosition);
      yPosition += 10;
      
      const taskData = report.tasks.slice(0, 50).map(t => [
        t.id,
        t.title.substring(0, 30),
        t.status,
        t.priority,
        t.assignedTo || 'Unassigned',
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-',
      ]);
      
      autoTable(pdf, {
        head: [['ID', 'Title', 'Status', 'Priority', 'Assigned', 'Due Date']],
        body: taskData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 50 },
        },
      });
      
      if (report.tasks.length > 50) {
        yPosition = (pdf as any).lastAutoTable.finalY + 5;
        pdf.setFontSize(10);
        pdf.text(`... and ${report.tasks.length - 50} more tasks`, 20, yPosition);
      }
    }
    
    // Add insights section
    if (report.summary?.insights && report.summary.insights.length > 0) {
      // Check if we need a new page
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.text('Key Insights', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      report.summary.insights.forEach(insight => {
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`• ${insight.title}`, 20, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition += 5;
        
        const lines = pdf.splitTextToSize(insight.description, 170);
        lines.forEach((line: string) => {
          pdf.text(line, 25, yPosition);
          yPosition += 5;
        });
        
        yPosition += 5;
      });
    }
    
    // Add recommendations
    if (report.summary?.recommendations && report.summary.recommendations.length > 0) {
      // Check if we need a new page
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.text('Recommendations', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      report.summary.recommendations.forEach(rec => {
        if (yPosition > 240) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${rec.priority.toUpperCase()}: ${rec.title}`, 20, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition += 5;
        
        const lines = pdf.splitTextToSize(rec.description, 170);
        lines.forEach((line: string) => {
          pdf.text(line, 25, yPosition);
          yPosition += 5;
        });
        
        if (rec.actionItems && rec.actionItems.length > 0) {
          rec.actionItems.forEach(item => {
            if (yPosition > 260) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(`  - ${item}`, 30, yPosition);
            yPosition += 5;
          });
        }
        
        yPosition += 5;
      });
    }
    
    // Save the PDF
    pdf.save(filename);
  }
  
  // Export to Excel (using CSV format with .xls extension for compatibility)
  static exportToExcel(
    data: {
      sheets: Array<{
        name: string;
        data: any[];
      }>;
    },
    filename: string = 'report.xls'
  ): void {
    // For a true Excel export, we would need a library like xlsx
    // For now, we'll create a CSV that Excel can open
    if (data.sheets.length > 0) {
      const csvContent = this.convertToCSV(data.sheets[0].data);
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  // Helper function to convert data to CSV format
  private static convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    // Convert each object to CSV row
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }
  
  // Generate a comprehensive report
  static async generateReport(
    type: 'project' | 'team' | 'personal' | 'custom',
    filters: ReportFilters,
    data: {
      summary?: AnalyticsSummary;
      projects?: Project[];
      tasks?: Task[];
      projectMetrics?: ProjectMetrics[];
      taskMetrics?: TaskMetrics;
    }
  ): Promise<Report> {
    const report: Report = {
      id: `report-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
      description: `Generated ${type} report with filters`,
      type,
      generatedAt: new Date().toISOString(),
      generatedBy: 'current-user', // Would come from auth context
      format: 'json',
      data,
      filters,
    };
    
    return report;
  }
  
  // Schedule a report for automatic generation
  static scheduleReport(
    report: Report,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      time?: string;
      recipients: string[];
    }
  ): void {
    // In a real implementation, this would create a scheduled job
    // on the backend to generate and send reports
    console.log('Report scheduled:', { report, schedule });
  }
}