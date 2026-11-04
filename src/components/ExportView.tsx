import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Check, 
  Eye,
  Sliders
} from 'lucide-react';

interface ExportViewProps {
  threshold: number;
}

export const ExportView: React.FC<ExportViewProps> = ({
  threshold,
}) => {
  const [selectedReport, setSelectedReport] = useState<'completion' | 'inactivity' | 'activity'>('completion');
  const [inactivityDays, setInactivityDays] = useState(threshold);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const reports = [
    {
      id: 'completion' as const,
      name: 'Course Completion Report',
      description: 'Course completion percentages with eligible enrolment denominators, excluded counts, and formulas.',
      endpoint: '/api/reports/course-completion?format=csv',
      filename: 'course_completion_report.csv',
    },
    {
      id: 'inactivity' as const,
      name: 'Inactivity Monitor Report',
      description: 'Enrolments evaluated against observation window, days since last activity, and operational flags.',
      endpoint: `/api/reports/inactive-enrollments?format=csv&threshold=${inactivityDays}`,
      filename: `inactivity_report_${inactivityDays}d.csv`,
    },
    {
      id: 'activity' as const,
      name: 'Learning Activity Log',
      description: 'Complete audit event stream with timestamps, activity types, lessons, and completion statuses.',
      endpoint: '/api/reports/activity?format=csv',
      filename: 'learning_activity_log.csv',
    },
  ];

  const currentReportObj = reports.find((r) => r.id === selectedReport)!;

  const handleFetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch(currentReportObj.endpoint);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();
      if (contentType.includes('text/html') || text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        throw new Error('Server returned an unexpected HTML page instead of CSV data. Check report endpoint configuration.');
      }
      setPreviewContent(text);
    } catch (err: any) {
      setPreviewContent(`Error loading CSV preview: ${err.message || 'Unknown network error'}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentReportObj.endpoint;
    link.setAttribute('download', currentReportObj.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Data Export & Sanitized CSV</h1>
          <p className="text-xs text-[#64748B]">
            Export administrative and analytical datasets in secure, spreadsheet-compliant CSV formats.
          </p>
        </div>
      </div>

      {/* Full Project Codebase Export for GitHub */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#2563EB]/30 bg-[#F5F8FF] p-4 text-xs shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#123B73] p-2 text-white">
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-[#123B73]">GitHub Repository Codebase Package (.ZIP)</div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Complete source code bundle ready for GitHub (React 19 + TypeScript, Express server, Python analytics, SQL schemas, and test suite).
            </p>
          </div>
        </div>
        <a
          href="/E-Learning-Course-Analytics-System.zip"
          download="E-Learning-Course-Analytics-System.zip"
          className="flex items-center gap-2 rounded-lg bg-[#123B73] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition-colors shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download GitHub ZIP (227 KB)</span>
        </a>
      </div>

      {/* Security & Sanitization Callout */}
      <div className="flex items-start gap-3 rounded-xl border border-[#15803D]/20 bg-[#15803D]/5 p-4 text-xs text-[#172B4D] shadow-2xs">
        <ShieldCheck className="h-5 w-5 text-[#15803D] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[#15803D]">CSV Formula Injection Protection Enforced</div>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            All text fields containing characters that could trigger spreadsheet formula execution (<code className="bg-white px-1 py-0.5 rounded border border-[#DCE6F2] font-mono">=, +, -, @, \t, \r</code>) are automatically prepended with a single quote (<code className="bg-white px-1 py-0.5 rounded border border-[#DCE6F2] font-mono">&apos;</code>) per security guidelines.
          </p>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {reports.map((rep) => (
          <div
            key={rep.id}
            onClick={() => {
              setSelectedReport(rep.id);
              setPreviewContent('');
            }}
            className={`cursor-pointer rounded-xl border p-4 transition-all shadow-2xs ${
              selectedReport === rep.id
                ? 'border-[#2563EB] bg-[#F5F8FF] ring-2 ring-[#2563EB]/20'
                : 'border-[#DCE6F2] bg-white hover:border-[#2563EB]/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <FileSpreadsheet className={`h-5 w-5 ${selectedReport === rep.id ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
              {selectedReport === rep.id && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <h3 className="mt-2.5 text-xs font-bold text-[#172B4D]">{rep.name}</h3>
            <p className="mt-1 text-[11px] text-[#64748B] leading-normal">{rep.description}</p>
          </div>
        ))}
      </div>

      {/* Export Options & Actions */}
      <div className="rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#DCE6F2] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#172B4D]">Export Configuration: {currentReportObj.name}</h2>
            <p className="text-[11px] text-[#64748B]">Preview data stream or trigger instant download</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFetchPreview}
              disabled={loadingPreview}
              className="flex items-center gap-1.5 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3.5 py-2 text-xs font-semibold text-[#172B4D] hover:bg-white hover:border-[#2563EB] transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>{loadingPreview ? 'Loading...' : 'Preview Raw CSV'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV File</span>
            </button>
          </div>
        </div>

        {selectedReport === 'inactivity' && (
          <div className="flex items-center gap-3 text-xs text-[#172B4D]">
            <span className="font-semibold text-[#123B73]">Inactivity Threshold Filter:</span>
            <select
              value={inactivityDays}
              onChange={(e) => {
                setInactivityDays(Number(e.target.value));
                setPreviewContent('');
              }}
              className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
            >
              <option value={7}>7 Days Window</option>
              <option value={14}>14 Days Window (Default)</option>
              <option value={21}>21 Days Window</option>
              <option value={30}>30 Days Window</option>
            </select>
          </div>
        )}

        {/* Preview Box */}
        {previewContent && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#64748B]">CSV File Content Preview:</div>
            <pre className="max-h-60 overflow-x-auto overflow-y-auto rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3 text-[11px] font-mono text-[#172B4D] whitespace-pre">
              {previewContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
