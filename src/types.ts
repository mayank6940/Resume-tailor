/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FieldType = 'text' | 'bullets';

export interface ResumeField {
  id: string;
  label: string;
  type: FieldType;
  value: string | string[]; // string for 'text', string[] for 'bullets'
}

export interface ResumeEntry {
  id: string;
  fields: ResumeField[];
}

export interface ResumeSection {
  id: string;
  title: string;
  type: 'repeatable' | 'single';
  entries: ResumeEntry[];
}

export interface ResumeData {
  sections: ResumeSection[];
}

// Diff Engine types
export interface ProposedFieldChange {
  id: string; // unique ID for tracking the change state (e.g., accepted, rejected)
  sectionId: string;
  sectionTitle: string;
  entryId: string;
  fieldId: string;
  fieldLabel: string;
  originalValue: string | string[];
  proposedValue: string | string[];
  explanation: string;
}

export interface TailoringResult {
  matchScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  proposedChanges: ProposedFieldChange[];
}

// ATS Linter Issue
export interface LinterIssue {
  id: string;
  severity: 'warning' | 'error' | 'success';
  category: 'layout' | 'headings' | 'content' | 'fonts' | 'format';
  message: string;
  suggestion: string;
}

// Version History Item
export interface VersionItem {
  id: string;
  timestamp: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  matchScore: number;
  resumeData: ResumeData;
}
