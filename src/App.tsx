/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ResumeData, VersionItem, LinterIssue } from './types';
import { storage } from './lib/storage';
import { lintResume } from './lib/linter';
import { generateResumePDF, PDFExportOptions } from './lib/pdfGenerator';
import { ResumeFormEditor } from './components/ResumeFormEditor';
import { ResumePreview } from './components/ResumePreview';
import { ATSCheckPanel } from './components/ATSCheckPanel';
import { TailorPanel } from './components/TailorPanel';
import { VersionHistory } from './components/VersionHistory';
import { LandingParser } from './components/LandingParser';

import {
  FileText,
  Sparkles,
  CheckCircle,
  History,
  Undo2,
  Redo2,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  FileDown,
  Info,
  Settings,
  Grid
} from 'lucide-react';

export default function App() {
  // Theme state (Dark / Light Mode)
  const [darkMode, setDarkMode] = useState(false);

  // Landing/parsing state
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    const hasMaster = !!localStorage.getItem('resume_tailoring_master_local-user');
    return !hasMaster;
  });

  // Active resume data model state
  const [resumeData, setResumeData] = useState<ResumeData>(() => storage.getDraftResume());

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<ResumeData[]>([]);
  const [redoStack, setRedoStack] = useState<ResumeData[]>([]);

  // Version History State
  const [versionHistory, setVersionHistory] = useState<VersionItem[]>(() => storage.listVersions());

  // Active Tab: 'editor' | 'ai' | 'linter' | 'history'
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'linter' | 'history'>('editor');

  // PDF Export and Styling Options
  const [pdfOptions, setPdfOptions] = useState<PDFExportOptions>({
    fontFamily: 'Arial',
    fontSizeScale: 'standard',
    marginSize: 'standard',
    themeColor: '#4f46e5', // indigo-600
    showSectionLines: true,
  });

  // Re-run ATS linter automatically whenever resume data or styling options change
  const [linterIssues, setLinterIssues] = useState<LinterIssue[]>([]);
  useEffect(() => {
    setLinterIssues(lintResume(resumeData, pdfOptions.fontFamily));
  }, [resumeData, pdfOptions.fontFamily]);

  // Handle active resume updates with undo/redo stacking
  const handleUpdateResume = (newResume: ResumeData, isHistoryAction = false) => {
    if (!isHistoryAction) {
      setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(resumeData))]);
      setRedoStack([]); // Clear redo stack on new action
    }
    setResumeData(newResume);
    storage.saveDraftResume(newResume);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [JSON.parse(JSON.stringify(resumeData)), ...prev]);
    setUndoStack((prev) => prev.slice(0, -1));
    handleUpdateResume(previous, true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(resumeData))]);
    setRedoStack((prev) => prev.slice(1));
    handleUpdateResume(next, true);
  };

  // Reset to default master template
  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Are you sure you want to restore the default master template? This will clear your current draft changes.'
      )
    ) {
      const defaultTemplate = storage.getMasterResume('default-fallback'); // loads fresh default
      setUndoStack([]);
      setRedoStack([]);
      handleUpdateResume(defaultTemplate);
    }
  };

  // Import JSON Resume Backup
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.sections)) {
          handleUpdateResume(parsed);
          alert('Resume backup imported successfully!');
        } else {
          alert('Invalid resume JSON schema. Must contain a sections array.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Export JSON Resume Backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(resumeData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'master_resume_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export ATS-Friendly PDF (Selectable text)
  const handleExportPDF = () => {
    try {
      const doc = generateResumePDF(resumeData, pdfOptions);
      const fullNameField = resumeData.sections
        .find((s) => s.id === 'contact_info')
        ?.entries[0]?.fields.find((f) => f.id === 'fullName');
      const candidateName = fullNameField ? String(fullNameField.value).trim().replace(/\s+/g, '_') : 'Resume';
      doc.save(`${candidateName}_ATS_Optimized.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to render PDF.');
    }
  };

  // Save tailored version history
  const handleSaveVersion = (version: VersionItem) => {
    const updatedHistory = storage.saveVersion(version);
    setVersionHistory(updatedHistory);
  };

  // Restore historic tailored version
  const handleRestoreVersion = (version: VersionItem) => {
    if (
      window.confirm(
        `Load resume tailored for "${version.jobTitle}" at "${version.companyName}" into the active editor? This will overwrite your active draft.`
      )
    ) {
      handleUpdateResume(version.resumeData);
      setActiveTab('editor'); // switch back to editor to view restored state
    }
  };

  // Delete history version
  const handleDeleteVersion = (id: string) => {
    const updated = storage.deleteVersion(id);
    setVersionHistory(updated);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Navigation / Control Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 md:px-6 shadow-sm transition-colors">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              ATS Resume Tailor
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
              Craft, optimize, and check ATS compliance for custom job-specific resumes.
            </p>
          </div>

          {/* Action Toolbar buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Undo / Redo */}
            <div className="flex items-center border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30 cursor-pointer transition-all"
                title="Undo edit"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30 cursor-pointer transition-all"
                title="Redo edit"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Import / Export JSON Backups */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Import JSON Resume"
            >
              <Upload className="w-4 h-4 text-indigo-500" />
              Import
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Backup JSON Resume"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              Backup
            </button>

            {/* Restore / Reset template */}
            <button
              onClick={handleResetToDefault}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset resume"
            >
              <RotateCcw className="w-4 h-4 text-rose-500" />
              Reset
            </button>

            {/* Upload/Parse New Resume */}
            <button
              onClick={() => setShowLanding(true)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Upload PDF/DOCX to parse"
            >
              <Upload className="w-4 h-4 text-indigo-500" />
              Upload / Start Over
            </button>

            {/* Dark/Light Mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Export PDF with Selectable text */}
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 hover:opacity-95 shadow-sm transition-all cursor-pointer grow lg:grow-0 justify-center"
            >
              <FileDown className="w-4 h-4" />
              Export Selectable PDF
            </button>
          </div>
        </header>

        {/* Workspace Grid Layout */}
        {showLanding ? (
          <LandingParser
            onConfirm={(newData) => {
              storage.saveMasterResume(newData);
              handleUpdateResume(newData);
              setShowLanding(false);
            }}
            onCancel={
              localStorage.getItem('resume_tailoring_master_local-user')
                ? () => setShowLanding(false)
                : undefined
            }
            hasExistingData={!!localStorage.getItem('resume_tailoring_master_local-user')}
          />
        ) : (
          <main className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR: Active Form Controls, AI Matching, Linter */}
          <div className="xl:col-span-6 space-y-6">
            
            {/* Secondary Tab selector */}
            <div className="flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white shadow'
                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                Resume Editor
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'ai'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white shadow'
                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                AI Job Matcher
              </button>

              <button
                onClick={() => setActiveTab('linter')}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'linter'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white shadow'
                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                ATS Checker
                {linterIssues.filter((i) => i.severity === 'error').length > 0 && (
                  <span className="absolute top-2 right-4 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white shadow'
                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <History className="w-4 h-4 text-amber-500" />
                History
              </button>
            </div>

            {/* Tab Panels */}
            <div className="transition-all duration-200">
              {activeTab === 'editor' && (
                <ResumeFormEditor data={resumeData} onChange={handleUpdateResume} />
              )}
              {activeTab === 'ai' && (
                <TailorPanel
                  activeResume={resumeData}
                  onUpdateResume={handleUpdateResume}
                  onSaveVersion={handleSaveVersion}
                />
              )}
              {activeTab === 'linter' && <ATSCheckPanel issues={linterIssues} />}
              {activeTab === 'history' && (
                <VersionHistory
                  history={versionHistory}
                  onRestore={handleRestoreVersion}
                  onDelete={handleDeleteVersion}
                  exportOptions={pdfOptions}
                />
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: Paper Preview with visual styles configuration */}
          <div className="xl:col-span-6 space-y-6">
            
            {/* Visual styling controls bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
              <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-4.5 h-4.5 text-indigo-500" />
                Live PDF Styling & Template Controls
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Font selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Font Style</label>
                  <select
                    value={pdfOptions.fontFamily}
                    onChange={(e) =>
                      setPdfOptions((prev) => ({ ...prev, fontFamily: e.target.value as any }))
                    }
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:outline-none"
                  >
                    <option value="Arial">Arial (Sans-Serif)</option>
                    <option value="Helvetica">Helvetica (Sans-Serif)</option>
                    <option value="Times New Roman">Times New Roman (Serif)</option>
                    <option value="Calibri">Calibri (Sans-Serif)</option>
                    <option value="Georgia">Georgia (Serif)</option>
                  </select>
                </div>

                {/* Font scale */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Text Density</label>
                  <select
                    value={pdfOptions.fontSizeScale}
                    onChange={(e) =>
                      setPdfOptions((prev) => ({ ...prev, fontSizeScale: e.target.value as any }))
                    }
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:outline-none"
                  >
                    <option value="compact">Compact (9pt)</option>
                    <option value="standard">Standard (10pt)</option>
                    <option value="relaxed">Relaxed (11pt)</option>
                  </select>
                </div>

                {/* Margin scale */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Margin Spacing</label>
                  <select
                    value={pdfOptions.marginSize}
                    onChange={(e) =>
                      setPdfOptions((prev) => ({ ...prev, marginSize: e.target.value as any }))
                    }
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:outline-none"
                  >
                    <option value="compact">Narrow (0.5 in)</option>
                    <option value="standard">Normal (0.75 in)</option>
                    <option value="relaxed">Wide (1.0 in)</option>
                  </select>
                </div>

                {/* Theme Accents picker */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Header Accent</label>
                  <div className="flex items-center gap-1.5 h-8">
                    <input
                      type="color"
                      value={pdfOptions.themeColor}
                      onChange={(e) =>
                        setPdfOptions((prev) => ({ ...prev, themeColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded-md border border-gray-200 cursor-pointer overflow-hidden"
                      title="Custom accent hex picker"
                    />
                    <select
                      value={pdfOptions.themeColor}
                      onChange={(e) =>
                        setPdfOptions((prev) => ({ ...prev, themeColor: e.target.value }))
                      }
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 h-8 px-1 focus:outline-none"
                    >
                      <option value="#1e293b">Slate Blue</option>
                      <option value="#4f46e5">Indigo Core</option>
                      <option value="#059669">Emerald Safe</option>
                      <option value="#0284c7">Sky Blue</option>
                      <option value="#dc2626">Crimson</option>
                      <option value={pdfOptions.themeColor}>Custom Accent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Extra check toggles */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="toggleLines"
                    checked={pdfOptions.showSectionLines}
                    onChange={(e) =>
                      setPdfOptions((prev) => ({ ...prev, showSectionLines: e.target.checked }))
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-4.5 h-4.5"
                  />
                  <label htmlFor="toggleLines" className="text-xs text-slate-600 dark:text-gray-300 font-semibold cursor-pointer select-none">
                    Show Section Divider Lines
                  </label>
                </div>

                <div className="hidden md:flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 italic">
                  <Info className="w-3.5 h-3.5" />
                  Visual choices conform to strict ATS single-column safety guidelines.
                </div>
              </div>
            </div>

            {/* Simulated Paper WYSIWYG Resume paper */}
            <ResumePreview data={resumeData} options={pdfOptions} />

          </div>
        </main>
        )}
      </div>
    </div>
  );
}
