/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ResumeData } from '../types';
import { parsePdf, parseDocx, sendTextToParser } from '../lib/parser';
import { ResumeFormEditor } from './ResumeFormEditor';
import { DEFAULT_RESUME } from '../lib/storage';
import {
  Upload,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface LandingParserProps {
  onConfirm: (data: ResumeData) => void;
  onCancel?: () => void;
  hasExistingData: boolean;
}

type ParseStep = 'idle' | 'extracting' | 'parsing' | 'review' | 'manual-fallback';

export function LandingParser({ onConfirm, onCancel, hasExistingData }: LandingParserProps) {
  const [step, setStep] = useState<ParseStep>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Progress messages for nice feedback
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Storage for extracted text
  const [extractedText, setExtractedText] = useState('');
  
  // Temporary parsed resume data for review
  const [tempResume, setTempResume] = useState<ResumeData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  // Extract text and call parser
  const processUploadedFile = async (file: File) => {
    setErrorMsg(null);
    setStep('extracting');
    setLoadingMessage('Reading file in-browser...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = '';

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setLoadingMessage('Extracting text layer from PDF...');
        text = await parsePdf(arrayBuffer);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        setLoadingMessage('Converting DOCX to clean text...');
        text = await parseDocx(arrayBuffer);
      } else {
        throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
      }

      if (!text || text.trim().length < 50) {
        throw new Error('Extracted text is empty or too short. Your resume might be scanned as an image (OCR required) or secured.');
      }

      setExtractedText(text);
      await runAIParsing(text);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to extract text from file.');
      setStep('manual-fallback');
    }
  };

  // Run the backend AI Parser route
  const runAIParsing = async (textToParse: string) => {
    setStep('parsing');
    setLoadingMessage('Gemini AI is structuring your resume sections...');
    setErrorMsg(null);

    try {
      const parsedResume = await sendTextToParser(textToParse);
      if (parsedResume && Array.isArray(parsedResume.sections)) {
        setTempResume(parsedResume);
        setStep('review');
      } else {
        throw new Error('Response did not contain a valid structured resume schema.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'AI parsing request failed.');
      setStep('manual-fallback');
    }
  };

  // Fallback direct text input handler
  const handleManualTextSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pastedText = formData.get('pastedText') as string;

    if (!pastedText || pastedText.trim().length < 50) {
      setErrorMsg('Please enter at least a few paragraphs of resume details (minimum 50 characters).');
      return;
    }

    setExtractedText(pastedText);
    await runAIParsing(pastedText);
  };

  // Start with fresh default template directly
  const handleStartFromScratch = () => {
    onConfirm(JSON.parse(JSON.stringify(DEFAULT_RESUME)));
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      
      {/* 1. IDLE LANDING STATE */}
      {step === 'idle' && (
        <div className="space-y-8 animate-fade-in text-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-600 mb-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              100% Client-Side Local First
            </div>
            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
              Create an ATS-Optimized Master Resume
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base font-light">
              Import your existing CV to auto-structure standard fields, or build your professional profile from scratch with selectable-text styling guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-3xl mx-auto">
            {/* OPTION A: Start from Scratch */}
            <div
              onClick={handleStartFromScratch}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-500/50 p-8 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between items-center text-center group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
              <div className="bg-slate-100 group-hover:bg-indigo-50 rounded-2xl p-4 mb-4 transition-colors">
                <FileText className="w-8 h-8 text-slate-600 group-hover:text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
                  Start from scratch
                </h3>
                <p className="text-xs text-slate-400 max-w-xs font-light leading-relaxed">
                  Populate a beautiful, highly structured master template with standard ATS single-column sections.
                </p>
              </div>
              <div className="mt-6 text-xs font-bold text-indigo-600 group-hover:underline flex items-center gap-1.5">
                Go to Master Template <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* OPTION B: Drag and Drop Upload */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between items-center text-center relative overflow-hidden group ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/30'
                  : 'border-slate-300 hover:border-indigo-500/50 bg-white'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx"
                className="hidden"
              />
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
              <div className="bg-slate-100 group-hover:bg-emerald-50 rounded-2xl p-4 mb-4 transition-colors">
                <Upload className="w-8 h-8 text-slate-600 group-hover:text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors">
                  Upload existing resume
                </h3>
                <p className="text-xs text-slate-400 max-w-xs font-light leading-relaxed">
                  Support PDF or DOCX format. Extracted in browser and structured automatically using Gemini AI.
                </p>
              </div>
              <div className="mt-6 text-xs font-bold text-emerald-600 group-hover:underline flex items-center gap-1.5">
                Choose PDF or DOCX file <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Quick return button */}
          {hasExistingData && onCancel && (
            <div className="pt-6">
              <button
                onClick={onCancel}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
              >
                Cancel and return to active draft
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. LOADING / PROGRESS STATES */}
      {(step === 'extracting' || step === 'parsing') && (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 shadow-sm text-center space-y-6 max-w-md mx-auto animate-fade-in">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              {step === 'extracting' ? (
                <FileText className="w-6 h-6 text-indigo-500" />
              ) : (
                <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-lg text-slate-800">
              {step === 'extracting' ? 'Extracting Resume Text' : 'AI Analysis & Formatting'}
            </h3>
            <p className="text-xs text-slate-500 font-light max-w-xs mx-auto leading-relaxed">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      {/* 3. MANUAL COPIED TEXT FALLBACK */}
      {step === 'manual-fallback' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 max-w-2xl mx-auto animate-fade-in">
          <div className="flex gap-3 items-start bg-rose-50 border border-rose-100 p-4 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-rose-800">File Extraction Failure</p>
              <p className="text-[11px] text-rose-600 font-light leading-relaxed">
                {errorMsg || 'We encountered issues extracting text from your resume. This usually happens if the file contains scanned images instead of selectable text layer.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-lg text-slate-800">
              Manual Paste Fallback
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Don't worry! Simply copy the text contents of your resume from Word, Google Docs, or PDF, and paste it below. Gemini AI will still structure it perfectly!
            </p>
          </div>

          <form onSubmit={handleManualTextSubmit} className="space-y-4">
            <textarea
              name="pastedText"
              rows={8}
              placeholder="Paste your resume details here (experience details, summary, education, contact info, etc.)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-light leading-relaxed resize-y"
            />
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep('idle');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer"
              >
                Back to Upload
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStartFromScratch}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Start Empty
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 hover:opacity-95 shadow-sm cursor-pointer"
                >
                  Parse Text with AI <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 4. AI STRUCTURING CONFIRM & REVIEW PANEL */}
      {step === 'review' && tempResume && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100/50 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-emerald-500 animate-bounce" />
                AI Structuring Complete!
              </h2>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                We've successfully converted your raw document text into our structured schema. Please review and modify any fields inline below.
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={() => {
                  setTempResume(null);
                  setStep('idle');
                }}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex-1 md:flex-none cursor-pointer text-center"
              >
                Re-upload
              </button>
              <button
                onClick={() => onConfirm(tempResume)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-95 shadow-md flex-1 md:flex-none cursor-pointer"
              >
                Confirm & Save Master Resume
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Render the standard editable form so user can review/edit parsed details */}
          <div className="bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-4 px-1 uppercase tracking-wider">
              Verify Fields Inline
            </h3>
            <ResumeFormEditor
              data={tempResume}
              onChange={(updated) => setTempResume(updated)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setTempResume(null);
                setStep('idle');
              }}
              className="px-5 py-2.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel and Start Over
            </button>
            <button
              onClick={() => onConfirm(tempResume)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1"
            >
              Confirm & Save Master Resume <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
