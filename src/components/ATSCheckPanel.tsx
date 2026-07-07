/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { LinterIssue } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, BookOpen, Layers } from 'lucide-react';

interface ATSCheckPanelProps {
  issues: LinterIssue[];
}

export function ATSCheckPanel({ issues }: ATSCheckPanelProps) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'success'>('all');

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'all') return true;
    return issue.severity === filter;
  });

  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;
  const successesCount = issues.filter((i) => i.severity === 'success').length;

  // Compute a health percentage
  const totalWeight = issues.length;
  const errorWeight = errorsCount * 15;
  const warningWeight = warningsCount * 5;
  const scoreRaw = 100 - (errorWeight + warningWeight);
  const healthScore = Math.max(0, Math.min(100, scoreRaw));

  const getScoreColor = () => {
    if (healthScore >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (healthScore >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-6">
      {/* ATS Score Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            ATS Compliancy Linter
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Real-time checking for layouts, standard sections, and content structure.
          </p>
        </div>

        <div className={`flex items-center gap-3 border rounded-xl px-4 py-2 ${getScoreColor()}`}>
          <div className="text-right">
            <span className="text-2xl font-black">{healthScore}%</span>
            <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">ATS Health Score</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100'
          }`}
        >
          All ({issues.length})
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            filter === 'error'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Critical ({errorsCount})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            filter === 'warning'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Warnings ({warningsCount})
        </button>
        <button
          onClick={() => setFilter('success')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            filter === 'success'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Passed ({successesCount})
        </button>
      </div>

      {/* Linter Items */}
      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-gray-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">All clear!</p>
            <p className="text-xs text-gray-500 mt-0.5">No warnings found in this category.</p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const getSeverityStyles = () => {
              switch (issue.severity) {
                case 'error':
                  return {
                    border: 'border-rose-100 bg-rose-50/50',
                    icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
                    titleColor: 'text-rose-900',
                  };
                case 'warning':
                  return {
                    border: 'border-amber-100 bg-amber-50/50',
                    icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
                    titleColor: 'text-amber-950',
                  };
                case 'success':
                default:
                  return {
                    border: 'border-emerald-100 bg-emerald-50/40',
                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
                    titleColor: 'text-emerald-900',
                  };
              }
            };

            const styles = getSeverityStyles();

            return (
              <div
                key={issue.id}
                className={`flex gap-3.5 border rounded-xl p-4 transition-all ${styles.border}`}
              >
                {styles.icon}
                <div className="space-y-1.5">
                  <h4 className={`text-sm font-bold leading-tight ${styles.titleColor}`}>
                    {issue.message}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-light">
                    {issue.suggestion}
                  </p>
                  
                  {/* Category badge */}
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded">
                      {issue.category}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Guide/Resources footer */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3 text-xs text-slate-600">
        <BookOpen className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-700">Why does ATS Compliance matter?</p>
          <p className="leading-relaxed font-light">
            Over 95% of Fortune 500 companies use an ATS (Applicant Tracking System) to automatically parse resumes. Multi-column templates, images, and non-standard text headers are often skipped entirely, causing qualified candidates to be automatically rejected.
          </p>
        </div>
      </div>
    </div>
  );
}
