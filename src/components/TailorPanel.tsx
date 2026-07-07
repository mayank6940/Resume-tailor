/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ResumeData, TailoringResult, ProposedFieldChange, VersionItem } from '../types';
import { tailorResume } from '../lib/llmClient';
import { storage } from '../lib/storage';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  Edit3,
  Undo,
  ThumbsUp,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  BookmarkCheck,
  Save,
  Check,
  X,
  RefreshCw
} from 'lucide-react';

interface TailorPanelProps {
  activeResume: ResumeData;
  onUpdateResume: (updatedResume: ResumeData) => void;
  onSaveVersion: (version: VersionItem) => void;
}

const RECRUITER_QUOTES = [
  'Analyzing job description requirements...',
  'Extracting technical skill keywords...',
  'Scanning professional achievements for alignment...',
  'Re-phrasing bullets to highlight business outcomes...',
  'Polishing professional summary with tailored keywords...',
  'Performing ATS compliance matching...',
];

export function TailorPanel({ activeResume, onUpdateResume, onSaveVersion }: TailorPanelProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingQuoteIndex, setLoadingQuoteIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [tailoringResult, setTailoringResult] = useState<TailoringResult | null>(null);
  
  // Track status of each proposed change: 'pending' | 'accepted' | 'rejected' | 'editing'
  const [changeStates, setChangeStates] = useState<Record<string, {
    status: 'pending' | 'accepted' | 'rejected';
    currentValue: string | string[];
    isEditing: boolean;
  }>>({});

  // Cycle through quotes while loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingQuoteIndex((prev) => (prev + 1) % RECRUITER_QUOTES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleTailor = async () => {
    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTailoringResult(null);
    setLoadingQuoteIndex(0);

    try {
      const result = await tailorResume(activeResume, jobDescription);
      setTailoringResult(result);

      // Initialize states for each change
      const initialStates: typeof changeStates = {};
      result.proposedChanges.forEach((change) => {
        initialStates[change.id] = {
          status: 'pending',
          currentValue: JSON.parse(JSON.stringify(change.proposedValue)), // deep clone
          isEditing: false,
        };
      });
      setChangeStates(initialStates);

      // Create a version item and save it to history
      const newVersion: VersionItem = {
        id: `ver-${Date.now()}`,
        timestamp: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        jobTitle: jobTitle.trim() || 'Software Engineer',
        companyName: companyName.trim() || 'Target Company',
        jobDescription: jobDescription,
        matchScore: result.matchScore,
        resumeData: JSON.parse(JSON.stringify(activeResume)),
      };
      
      // Notify parent to save version in history
      onSaveVersion(newVersion);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to communicate with Gemini. Please verify your GEMINI_API_KEY.');
    } finally {
      setIsLoading(false);
    }
  };

  // Live match score calculation based on accepted/rejected changes
  const getLiveMatchScore = () => {
    if (!tailoringResult) return 0;
    const totalChanges = tailoringResult.proposedChanges.length;
    if (totalChanges === 0) return tailoringResult.matchScore;

    const acceptedChanges = Object.keys(changeStates).filter(
      (key) => changeStates[key].status === 'accepted'
    ).length;

    // Linearly scale from initial match score to +15% more if all changes are accepted
    const bonus = Math.round((acceptedChanges / totalChanges) * 15);
    return Math.min(100, tailoringResult.matchScore + bonus);
  };

  const handleAcceptChange = (change: ProposedFieldChange) => {
    const state = changeStates[change.id];
    if (!state) return;

    // Create a deep copy of current resume
    const resumeCopy: ResumeData = JSON.parse(JSON.stringify(activeResume));

    // Find and update the field in the copy
    const section = resumeCopy.sections.find((s) => s.id === change.sectionId);
    if (section) {
      const entry = section.entries.find((e) => e.id === change.entryId);
      if (entry) {
        const field = entry.fields.find((f) => f.id === change.fieldId);
        if (field) {
          field.value = JSON.parse(JSON.stringify(state.currentValue));
        }
      }
    }

    // Apply updated resume
    onUpdateResume(resumeCopy);

    // Update state to accepted
    setChangeStates((prev) => ({
      ...prev,
      [change.id]: {
        ...prev[change.id],
        status: 'accepted',
        isEditing: false,
      },
    }));
  };

  const handleRejectChange = (change: ProposedFieldChange) => {
    const state = changeStates[change.id];
    if (!state) return;

    // If it was already accepted, we need to revert the field value in the resume
    if (state.status === 'accepted') {
      const resumeCopy: ResumeData = JSON.parse(JSON.stringify(activeResume));
      const section = resumeCopy.sections.find((s) => s.id === change.sectionId);
      if (section) {
        const entry = section.entries.find((e) => e.id === change.entryId);
        if (entry) {
          const field = entry.fields.find((f) => f.id === change.fieldId);
          if (field) {
            field.value = JSON.parse(JSON.stringify(change.originalValue));
          }
        }
      }
      onUpdateResume(resumeCopy);
    }

    // Update state to rejected
    setChangeStates((prev) => ({
      ...prev,
      [change.id]: {
        ...prev[change.id],
        status: 'rejected',
        isEditing: false,
      },
    }));
  };

  const handleStartEdit = (changeId: string) => {
    setChangeStates((prev) => ({
      ...prev,
      [changeId]: {
        ...prev[changeId],
        isEditing: true,
      },
    }));
  };

  const handleCancelEdit = (changeId: string) => {
    setChangeStates((prev) => ({
      ...prev,
      [changeId]: {
        ...prev[changeId],
        isEditing: false,
      },
    }));
  };

  const handleSaveEdit = (changeId: string, newValue: string | string[]) => {
    setChangeStates((prev) => ({
      ...prev,
      [changeId]: {
        ...prev[changeId],
        currentValue: newValue,
        isEditing: false,
      },
    }));
  };

  // Helper render for values (handles string vs bullets)
  const renderValueBlock = (val: string | string[], type: 'text' | 'bullets') => {
    if (Array.isArray(val)) {
      return (
        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600 font-light leading-relaxed">
          {val.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="text-xs text-gray-600 font-light leading-relaxed whitespace-pre-wrap">{val}</p>;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-6">
      <div className="border-b border-gray-100 pb-5">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          AI Job Matcher & Optimizer
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Paste a target job description and use Gemini to rewrite bullets, optimize summaries, and check keywords.
        </p>
      </div>

      {!tailoringResult && !isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Company Name (Optional)</label>
              <input
                type="text"
                placeholder="Google"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Job Title (Optional)</label>
              <input
                type="text"
                placeholder="Senior React Developer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Job Description</label>
            <textarea
              placeholder="Paste the full job post requirements, roles, responsibilities, and required technologies here..."
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-light resize-y"
            />
          </div>

          <button
            onClick={handleTailor}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Optimize with Gemini Flash
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 px-6 flex flex-col items-center justify-center space-y-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <div className="space-y-1.5 max-w-sm">
            <p className="text-sm font-semibold text-slate-800">Recruiter AI is tailoring your resume...</p>
            <p className="text-xs text-indigo-600 font-medium h-5 transition-all duration-300">
              {RECRUITER_QUOTES[loadingQuoteIndex]}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 border border-rose-100 bg-rose-50/50 rounded-xl space-y-3">
          <div className="flex gap-2 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">Tailoring Failed</p>
              <p className="font-light leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            onClick={handleTailor}
            className="w-full py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Optimization
          </button>
        </div>
      )}

      {/* Results View */}
      {tailoringResult && !isLoading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Match Score overview */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-indigo-100 bg-indigo-50/40 rounded-xl">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                Tailoring Complete!
              </h4>
              <p className="text-xs text-gray-500 font-light">
                Review and accept changes to elevate your ATS match score.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-3xl font-black text-indigo-600">{getLiveMatchScore()}%</span>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Live Match Score</p>
              </div>
            </div>
          </div>

          {/* Keywords Check */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 border border-emerald-100 bg-emerald-50/20 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Matched Keywords
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tailoringResult.matchingKeywords.length === 0 ? (
                  <span className="text-[10px] text-gray-400">None detected</span>
                ) : (
                  tailoringResult.matchingKeywords.map((kw, i) => (
                    <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                      {kw}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="p-3.5 border border-amber-100 bg-amber-50/20 rounded-xl space-y-2">
              <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Recommended Keywords
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tailoringResult.missingKeywords.length === 0 ? (
                  <span className="text-[10px] text-gray-400">None recommended</span>
                ) : (
                  tailoringResult.missingKeywords.map((kw, i) => (
                    <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                      {kw}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Side-by-Side Proposed Changes */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Proposed Changes ({tailoringResult.proposedChanges.length})
              </h4>
              <button
                onClick={() => {
                  setTailoringResult(null);
                  setError(null);
                }}
                className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                Start Over
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {tailoringResult.proposedChanges.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Perfectly Tailored!</p>
                  <p className="text-xs text-gray-500 mt-1">Your resume is already optimal for this position.</p>
                </div>
              ) : (
                tailoringResult.proposedChanges.map((change) => {
                  const state = changeStates[change.id] || { status: 'pending', currentValue: change.proposedValue, isEditing: false };

                  return (
                    <div
                      key={change.id}
                      className={`border rounded-xl transition-all ${
                        state.status === 'accepted'
                          ? 'border-emerald-200 bg-emerald-50/10'
                          : state.status === 'rejected'
                          ? 'border-slate-100 bg-slate-50/20 opacity-65'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {/* Section tag / Label heading */}
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 rounded-t-xl flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          {change.sectionTitle} &rsaquo; {change.fieldLabel}
                        </span>
                        
                        {/* Status tag */}
                        <div className="flex items-center gap-1.5">
                          {state.status === 'accepted' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                              Accepted
                            </span>
                          )}
                          {state.status === 'rejected' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-gray-600 rounded">
                              Rejected
                            </span>
                          )}
                          {state.status === 'pending' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                              Review Required
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content panel */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Original Value */}
                          <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Original</span>
                            {renderValueBlock(change.originalValue, Array.isArray(change.originalValue) ? 'bullets' : 'text')}
                          </div>

                          {/* Proposed Value / Editable Block */}
                          <div className="space-y-1 bg-indigo-50/10 p-3 rounded-lg border border-indigo-50">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Tailored</span>
                            
                            {state.isEditing ? (
                              <EditProposedValueForm
                                initialValue={state.currentValue}
                                isBullets={Array.isArray(change.originalValue)}
                                onCancel={() => handleCancelEdit(change.id)}
                                onSave={(newVal) => handleSaveEdit(change.id, newVal)}
                              />
                            ) : (
                              <div className="relative group/val">
                                {renderValueBlock(state.currentValue, Array.isArray(change.originalValue) ? 'bullets' : 'text')}
                                {state.status === 'pending' && (
                                  <button
                                    onClick={() => handleStartEdit(change.id)}
                                    className="absolute top-0 right-0 p-1 bg-white hover:bg-slate-50 rounded border border-gray-200 text-gray-500 hover:text-slate-800 opacity-0 group-hover/val:opacity-100 transition-all cursor-pointer"
                                    title="Edit AI Proposal"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rationale explanation */}
                        <div className="pt-2 border-t border-dashed border-gray-100 flex gap-2 text-[11px] text-gray-500 italic font-light leading-relaxed">
                          <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span>Gemini reasoning: {change.explanation}</span>
                        </div>

                        {/* Controls bar */}
                        {!state.isEditing && (
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            {state.status !== 'rejected' && (
                              <button
                                onClick={() => handleRejectChange(change)}
                                className="px-3 py-1.5 border border-gray-200 hover:bg-slate-50 text-gray-600 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <X className="w-3.5 h-3.5 text-rose-500" />
                                {state.status === 'accepted' ? 'Revert to Original' : 'Reject Change'}
                              </button>
                            )}

                            {state.status !== 'accepted' && (
                              <button
                                onClick={() => handleAcceptChange(change)}
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Accept Proposal
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Sub-component for editing proposals */
interface EditProposedValueFormProps {
  initialValue: string | string[];
  isBullets: boolean;
  onCancel: () => void;
  onSave: (val: string | string[]) => void;
}

function EditProposedValueForm({ initialValue, isBullets, onCancel, onSave }: EditProposedValueFormProps) {
  const [textValue, setTextValue] = useState('');
  const [bulletsList, setBulletsList] = useState<string[]>([]);

  useEffect(() => {
    if (isBullets && Array.isArray(initialValue)) {
      setBulletsList([...initialValue]);
    } else {
      setTextValue(String(initialValue));
    }
  }, [initialValue, isBullets]);

  const handleBulletChange = (idx: number, text: string) => {
    const updated = [...bulletsList];
    updated[idx] = text;
    setBulletsList(updated);
  };

  const handleAddBullet = () => {
    setBulletsList((prev) => [...prev, '']);
  };

  const handleRemoveBullet = (idx: number) => {
    setBulletsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (isBullets) {
      // Remove entirely empty bullets upon saving
      const cleaned = bulletsList.filter((b) => b.trim() !== '');
      onSave(cleaned);
    } else {
      onSave(textValue);
    }
  };

  if (isBullets) {
    return (
      <div className="space-y-2 mt-1">
        {bulletsList.map((bullet, idx) => (
          <div key={idx} className="flex gap-1.5 items-center">
            <span className="text-gray-400 text-xs shrink-0">•</span>
            <input
              type="text"
              value={bullet}
              onChange={(e) => handleBulletChange(idx, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleRemoveBullet(idx)}
              className="p-1 hover:bg-rose-50 text-rose-500 rounded border border-transparent hover:border-rose-100 shrink-0 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-1.5">
          <button
            type="button"
            onClick={handleAddBullet}
            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            + Add Bullet Line
          </button>
        </div>
        <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 text-[10px] font-bold border border-gray-200 hover:bg-slate-50 text-gray-600 rounded cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            Keep
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-1">
      <textarea
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        rows={5}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 resize-y"
      />
      <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-[10px] font-bold border border-gray-200 hover:bg-slate-50 text-gray-600 rounded cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer flex items-center gap-1"
        >
          <Save className="w-3 h-3" />
          Keep
        </button>
      </div>
    </div>
  );
}
