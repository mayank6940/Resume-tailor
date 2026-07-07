/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResumeData, LinterIssue } from '../types';

const STANDARD_HEADERS = [
  'experience',
  'professional experience',
  'work experience',
  'employment history',
  'education',
  'skills',
  'technical skills',
  'core skills',
  'certifications',
  'licenses',
  'projects',
  'personal projects',
  'summary',
  'professional summary',
  'executive summary',
  'contact',
  'contact info',
  'contact information',
];

export function lintResume(resume: ResumeData, selectedFont: string): LinterIssue[] {
  const issues: LinterIssue[] = [];

  // 1. Layout Linter Checks (always single column in our PDF generator - highlight as success/info)
  issues.push({
    id: 'layout-column',
    severity: 'success',
    category: 'layout',
    message: 'Single-column structure detected.',
    suggestion: 'Your PDF will export in a single-column format, which is the most reliable structure for ATS parsers.',
  });

  // 2. Font Check
  const safeFonts = ['Arial', 'Calibri', 'Georgia', 'Times New Roman', 'Helvetica'];
  if (safeFonts.includes(selectedFont)) {
    issues.push({
      id: 'font-safety',
      severity: 'success',
      category: 'fonts',
      message: `ATS-Safe Font: ${selectedFont}`,
      suggestion: 'This font is highly readable and fully compatible with all modern resume parsers.',
    });
  } else {
    issues.push({
      id: 'font-safety-warning',
      severity: 'warning',
      category: 'fonts',
      message: `Non-standard font '${selectedFont}' selected.`,
      suggestion: 'Consider using one of the proven ATS-safe fonts (Arial, Calibri, Georgia, Times New Roman, Helvetica) to prevent rendering failures.',
    });
  }

  // 3. Section Heading Verification
  const sectionTitles = resume.sections.map((s) => s.title.toLowerCase().trim());

  let hasExperience = false;
  let hasEducation = false;
  let hasSkills = false;

  resume.sections.forEach((section) => {
    const titleLower = section.title.toLowerCase().trim();

    // Check if it's experience-related
    if (titleLower.includes('experience') || titleLower.includes('history') || titleLower.includes('employment')) {
      hasExperience = true;
    }
    // Check if education-related
    if (titleLower.includes('education') || titleLower.includes('academic')) {
      hasEducation = true;
    }
    // Check if skills-related
    if (titleLower.includes('skills')) {
      hasSkills = true;
    }

    // Verify if this section title is standard
    const isStandard = STANDARD_HEADERS.some((std) => titleLower === std || titleLower.includes(std));
    if (!isStandard && titleLower !== '') {
      issues.push({
        id: `heading-${section.id}`,
        severity: 'warning',
        category: 'headings',
        message: `Non-standard section header: "${section.title}"`,
        suggestion: `ATS parsers may struggle to categorize this. Consider renaming it closer to standard titles like "Work Experience", "Education", "Skills", "Certifications", or "Projects".`,
      });
    }
  });

  // Check critical sections presence
  if (!hasExperience) {
    issues.push({
      id: 'missing-experience',
      severity: 'error',
      category: 'headings',
      message: 'Missing Work Experience section.',
      suggestion: 'Add an "Experience" section to outline your professional work history, which is critical for resume review.',
    });
  }
  if (!hasEducation) {
    issues.push({
      id: 'missing-education',
      severity: 'warning',
      category: 'headings',
      message: 'Missing Education section.',
      suggestion: 'We recommend adding an "Education" section to summarize your degrees or certifications.',
    });
  }
  if (!hasSkills) {
    issues.push({
      id: 'missing-skills',
      severity: 'warning',
      category: 'headings',
      message: 'Missing Skills section.',
      suggestion: 'Add a "Skills" section so ATS parsers can quickly find and index your core competencies.',
    });
  }

  // 4. Contact Details Linter Checks
  let foundEmail = false;
  let foundPhone = false;

  // Search contact fields
  resume.sections.forEach((section) => {
    section.entries.forEach((entry) => {
      entry.fields.forEach((field) => {
        const valStr = String(field.value).trim();
        const labelLower = field.label.toLowerCase();

        if (labelLower.includes('email')) {
          foundEmail = true;
          if (valStr === '') {
            issues.push({
              id: 'empty-email',
              severity: 'error',
              category: 'content',
              message: 'Email address field is empty.',
              suggestion: 'Provide your email so recruiters and ATS software can automatically reach out to you.',
            });
          } else if (!valStr.includes('@') || !valStr.includes('.')) {
            issues.push({
              id: 'invalid-email',
              severity: 'error',
              category: 'content',
              message: 'Invalid email format.',
              suggestion: 'Ensure your email address is correctly formatted (e.g., name@domain.com).',
            });
          }
        }

        if (labelLower.includes('phone') || labelLower.includes('mobile') || labelLower.includes('contact')) {
          foundPhone = true;
          if (valStr === '') {
            issues.push({
              id: 'empty-phone',
              severity: 'warning',
              category: 'content',
              message: 'Phone number field is empty.',
              suggestion: 'Include your phone number so hiring teams have a direct way to schedule interviews.',
            });
          }
        }
      });
    });
  });

  if (!foundEmail) {
    issues.push({
      id: 'missing-email-field',
      severity: 'error',
      category: 'content',
      message: 'No email contact field found.',
      suggestion: 'Ensure there is a text field containing "Email" in your contact section.',
    });
  }
  if (!foundPhone) {
    issues.push({
      id: 'missing-phone-field',
      severity: 'warning',
      category: 'content',
      message: 'No phone number field found.',
      suggestion: 'Create a phone contact field so employers can call you.',
    });
  }

  // 5. Bullet Points Verification
  resume.sections.forEach((section) => {
    section.entries.forEach((entry, entryIndex) => {
      entry.fields.forEach((field) => {
        if (field.type === 'bullets' && Array.isArray(field.value)) {
          const bullets = field.value;

          if (bullets.length === 0) {
            issues.push({
              id: `empty-bullets-${entry.id}-${field.id}`,
              severity: 'warning',
              category: 'content',
              message: `Empty achievements list in "${section.title}".`,
              suggestion: 'Add at least 3-4 bullet points demonstrating specific business impact or technical achievements.',
            });
          } else {
            bullets.forEach((bullet, bIdx) => {
              const trimmed = bullet.trim();
              if (trimmed === '') {
                issues.push({
                  id: `empty-bullet-${entry.id}-${field.id}-${bIdx}`,
                  severity: 'warning',
                  category: 'content',
                  message: `Empty bullet point in "${section.title}" (Entry #${entryIndex + 1}).`,
                  suggestion: 'Fill in this bullet point or remove it to maintain clean visual styling.',
                });
              } else if (trimmed.length < 15) {
                issues.push({
                  id: `short-bullet-${entry.id}-${field.id}-${bIdx}`,
                  severity: 'warning',
                  category: 'content',
                  message: `Very short bullet point (${trimmed.length} chars) in "${section.title}".`,
                  suggestion: 'Expand your bullet point using the STAR method (Situation, Task, Action, Result) to demonstrate impact.',
                });
              }
            });
          }
        }
      });
    });
  });

  return issues;
}
