/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VersionItem } from '../types';
import { History, Trash2, ArrowUpRight, Calendar, Bookmark, Briefcase, FileDown, CheckSquare } from 'lucide-react';
import { generateResumePDF, PDFExportOptions } from '../lib/pdfGenerator';

interface VersionHistoryProps {
  history: VersionItem[];
  onRestore: (version: VersionItem) => void;
  onDelete: (id: string) => void;
  exportOptions: PDFExportOptions;
}

export function VersionHistory({ history, onRestore, onDelete, exportOptions }: VersionHistoryProps) {
  const handleExportPDF = (version: VersionItem) => {
    const doc = generateResumePDF(version.resumeData, exportOptions);
    doc.save(`${version.companyName.replace(/\s+/g, '_')}_Tailored_Resume.pdf`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-5">
      <div className="border-b border-gray-100 pb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          Version History
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Review or restore previous versions optimized for target job descriptions.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-dashed border-gray-200 rounded-xl">
          <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-gray-600">No optimized versions saved yet.</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Optimize your resume against a job post to record versions.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {history.map((version) => (
            <div
              key={version.id}
              className="border border-slate-100 hover:border-slate-200 bg-slate-50/20 hover:bg-slate-50/40 rounded-xl p-4 space-y-3 transition-all"
            >
              {/* Job / Company Meta */}
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 leading-snug">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    {version.jobTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">{version.companyName}</span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {version.timestamp}
                    </span>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 px-2 py-1 rounded text-right shrink-0">
                  <p className="text-xs font-black text-indigo-700 leading-none">{version.matchScore}%</p>
                  <p className="text-[9px] text-indigo-500 font-semibold uppercase tracking-wider mt-0.5">Score</p>
                </div>
              </div>

              {/* Collapsed JD snippet */}
              {version.jobDescription && (
                <div className="bg-white/80 border border-slate-100 p-2.5 rounded-lg text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                  <span className="font-semibold text-slate-700 uppercase tracking-wide mr-1 text-[9px]">Target JD:</span>
                  {version.jobDescription}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => onDelete(version.id)}
                  className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportPDF(version)}
                    className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    PDF
                  </button>

                  <button
                    onClick={() => onRestore(version)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Load to Editor
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
