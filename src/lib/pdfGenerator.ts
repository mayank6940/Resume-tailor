/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { ResumeData } from '../types';

export interface PDFExportOptions {
  fontFamily: 'Arial' | 'Helvetica' | 'Times New Roman' | 'Calibri' | 'Georgia';
  fontSizeScale: 'compact' | 'standard' | 'relaxed';
  marginSize: 'compact' | 'standard' | 'relaxed';
  themeColor: string; // Hex color for lines, headers, etc.
  showSectionLines: boolean;
}

export function generateResumePDF(resumeData: ResumeData, options: PDFExportOptions): jsPDF {
  // 1. Initialize jsPDF (Standard Letter size: 8.5 x 11 inches)
  // Unit: pt (points). Letter width = 612 pt, height = 792 pt
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
    compress: true,
  });

  const pageWidth = 612;
  const pageHeight = 792;

  // Map font families to jsPDF core fonts
  let pdfFont = 'helvetica';
  if (options.fontFamily === 'Times New Roman' || options.fontFamily === 'Georgia') {
    pdfFont = 'times';
  } else {
    pdfFont = 'helvetica'; // Fallback for Arial, Calibri, Helvetica
  }

  // Define Sizes
  let baseMargin = 54; // standard 0.75 in
  if (options.marginSize === 'compact') baseMargin = 36; // 0.5 in
  if (options.marginSize === 'relaxed') baseMargin = 72; // 1.0 in

  let scaleMultiplier = 1.0;
  if (options.fontSizeScale === 'compact') scaleMultiplier = 0.9;
  if (options.fontSizeScale === 'relaxed') scaleMultiplier = 1.1;

  const fontSizes = {
    name: Math.round(22 * scaleMultiplier),
    title: Math.round(13 * scaleMultiplier),
    sectionHeader: Math.round(11 * scaleMultiplier),
    subHeader: Math.round(10 * scaleMultiplier),
    body: Math.round(9.5 * scaleMultiplier),
    bullets: Math.round(9.5 * scaleMultiplier),
  };

  const lineHeights = {
    name: fontSizes.name * 1.2,
    title: fontSizes.title * 1.3,
    sectionHeader: fontSizes.sectionHeader * 1.4,
    subHeader: fontSizes.subHeader * 1.3,
    body: fontSizes.body * 1.35,
    bullets: fontSizes.bullets * 1.4,
  };

  const contentWidth = pageWidth - 2 * baseMargin;
  let currentY = baseMargin;

  // Helper: check page space, append page if necessary
  function checkSpace(neededHeight: number) {
    if (currentY + neededHeight > pageHeight - baseMargin) {
      doc.addPage();
      currentY = baseMargin;
      return true;
    }
    return false;
  }

  // --- RENDERING PIPELINE ---

  // 1. CONTACT INFO SECTION (Must be at the very top, in document body for ATS)
  const contactSection = resumeData.sections.find((s) => s.id === 'contact_info');
  if (contactSection && contactSection.entries.length > 0) {
    const fields = contactSection.entries[0].fields;
    
    // Find Name
    const nameField = fields.find((f) => f.id === 'fullName');
    const nameText = nameField ? String(nameField.value).trim() : 'Jane Doe';

    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(fontSizes.name);
    doc.setTextColor(33, 33, 33);
    
    doc.text(nameText, baseMargin, currentY);
    currentY += lineHeights.name + 4;

    // Contact Metadata Row (Email | Phone | Location | LinkedIn | Website)
    const otherFields = fields.filter((f) => f.id !== 'fullName');
    const contactParts: string[] = [];
    
    otherFields.forEach((field) => {
      const val = String(field.value).trim();
      if (val !== '') {
        contactParts.push(val);
      }
    });

    const contactStr = contactParts.join('  |  ');
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(fontSizes.body);
    doc.setTextColor(100, 100, 100);

    const wrappedContact = doc.splitTextToSize(contactStr, contentWidth);
    wrappedContact.forEach((line: string) => {
      checkSpace(lineHeights.body);
      doc.text(line, baseMargin, currentY);
      currentY += lineHeights.body;
    });

    currentY += 12; // Gap under header
  }

  // 2. OTHER SECTIONS (Summary, Experience, Skills, Education, etc.)
  const otherSections = resumeData.sections.filter((s) => s.id !== 'contact_info');

  otherSections.forEach((section) => {
    // Skip completely empty sections
    if (section.entries.length === 0) return;

    // Estimate height for section header
    checkSpace(lineHeights.sectionHeader + 12);

    // Section Header Title
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(fontSizes.sectionHeader);
    
    // Use theme color for headings if standard hex format, otherwise charcoal
    if (options.themeColor && options.themeColor.startsWith('#')) {
      doc.setTextColor(options.themeColor);
    } else {
      doc.setTextColor(33, 33, 33);
    }
    
    doc.text(section.title.toUpperCase(), baseMargin, currentY);
    currentY += 4;

    // Thin section divider line
    if (options.showSectionLines) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.line(baseMargin, currentY, pageWidth - baseMargin, currentY);
    }
    currentY += lineHeights.sectionHeader - 4;

    // Render Section Entries
    section.entries.forEach((entry, entryIdx) => {
      // Small gap between entries in repeatable sections
      if (section.type === 'repeatable' && entryIdx > 0) {
        currentY += 8;
      }

      // 1. repeatable entry layout (e.g. Work Experience, Education)
      if (section.type === 'repeatable') {
        // We typically look for company, role, dates, location, and bullets/details
        const fields = entry.fields;
        
        // Find main fields dynamically by ID or label keyword
        const getFieldValue = (keys: string[]) => {
          const f = fields.find((field) => keys.some((k) => field.id.toLowerCase() === k || field.label.toLowerCase().includes(k)));
          return f ? String(f.value).trim() : '';
        };

        const company = getFieldValue(['company', 'institution', 'school', 'organization', 'employer']);
        const role = getFieldValue(['role', 'degree', 'title', 'position', 'major']);
        const dates = getFieldValue(['dates', 'duration', 'time', 'period']);
        const location = getFieldValue(['location', 'city', 'address']);

        // Check space needed for entry headers
        checkSpace(lineHeights.body * 2 + 4);

        // Line 1: Company / Institution (Bold) on Left, Dates (Regular) on Right
        doc.setFont(pdfFont, 'bold');
        doc.setFontSize(fontSizes.body);
        doc.setTextColor(33, 33, 33);
        doc.text(company, baseMargin, currentY);

        if (dates !== '') {
          doc.setFont(pdfFont, 'normal');
          const datesWidth = doc.getTextWidth(dates);
          doc.text(dates, pageWidth - baseMargin - datesWidth, currentY);
        }
        currentY += lineHeights.body;

        // Line 2: Role / Degree (Italic/Regular) on Left, Location (Regular/Italic) on Right
        doc.setFont(pdfFont, 'normal');
        doc.setFontSize(fontSizes.subHeader);
        doc.setTextColor(80, 80, 80);
        doc.text(role, baseMargin, currentY);

        if (location !== '') {
          const locWidth = doc.getTextWidth(location);
          doc.text(location, pageWidth - baseMargin - locWidth, currentY);
        }
        currentY += lineHeights.body + 4;

        // Draw rest of the custom fields in this entry (bullets or text)
        const drawnFieldIds = ['company', 'institution', 'school', 'organization', 'employer', 'role', 'degree', 'title', 'position', 'major', 'dates', 'duration', 'time', 'period', 'location', 'city', 'address'];
        const remainingFields = fields.filter((f) => !drawnFieldIds.some((id) => f.id.toLowerCase() === id || f.label.toLowerCase().includes(id)));

        remainingFields.forEach((field) => {
          if (field.type === 'bullets' && Array.isArray(field.value)) {
            const bullets = field.value.filter((b) => b.trim() !== '');
            bullets.forEach((bullet) => {
              doc.setFont(pdfFont, 'normal');
              doc.setFontSize(fontSizes.bullets);
              doc.setTextColor(60, 60, 60);

              // Indent bullet text by 12 points
              const bulletMarker = '• ';
              const bulletMarkerWidth = doc.getTextWidth(bulletMarker);
              const wrapWidth = contentWidth - 14;

              const lines = doc.splitTextToSize(bullet, wrapWidth);
              
              lines.forEach((line: string, lineIdx: number) => {
                checkSpace(lineHeights.bullets);
                if (lineIdx === 0) {
                  doc.text(bulletMarker, baseMargin + 4, currentY);
                  doc.text(line, baseMargin + 4 + bulletMarkerWidth, currentY);
                } else {
                  doc.text(line, baseMargin + 4 + bulletMarkerWidth, currentY);
                }
                currentY += lineHeights.bullets;
              });
            });
          } else {
            // Standard Text Field
            const textVal = String(field.value).trim();
            if (textVal !== '') {
              doc.setFont(pdfFont, 'normal');
              doc.setFontSize(fontSizes.body);
              doc.setTextColor(60, 60, 60);

              // Prefix with field label if it is not summary or simple block
              const showLabel = !field.label.toLowerCase().includes('summary') && !field.label.toLowerCase().includes('details');
              const textLine = showLabel ? `${field.label}: ${textVal}` : textVal;

              const lines = doc.splitTextToSize(textLine, contentWidth);
              lines.forEach((line: string) => {
                checkSpace(lineHeights.body);
                doc.text(line, baseMargin, currentY);
                currentY += lineHeights.body;
              });
            }
          }
        });

      } else {
        // 2. single entry layout (e.g. Summary, Skills, directly containing fields)
        const fields = entry.fields;
        fields.forEach((field) => {
          if (field.type === 'bullets' && Array.isArray(field.value)) {
            const bullets = field.value.filter((b) => b.trim() !== '');
            bullets.forEach((bullet) => {
              doc.setFont(pdfFont, 'normal');
              doc.setFontSize(fontSizes.bullets);
              doc.setTextColor(60, 60, 60);

              const bulletMarker = '• ';
              const bulletMarkerWidth = doc.getTextWidth(bulletMarker);
              const wrapWidth = contentWidth - 14;

              const lines = doc.splitTextToSize(bullet, wrapWidth);
              lines.forEach((line: string, lineIdx: number) => {
                checkSpace(lineHeights.bullets);
                if (lineIdx === 0) {
                  doc.text(bulletMarker, baseMargin + 4, currentY);
                  doc.text(line, baseMargin + 4 + bulletMarkerWidth, currentY);
                } else {
                  doc.text(line, baseMargin + 4 + bulletMarkerWidth, currentY);
                }
                currentY += lineHeights.bullets;
              });
            });
          } else {
            // Standard Text Field
            const textVal = String(field.value).trim();
            if (textVal !== '') {
              doc.setFont(pdfFont, 'normal');
              doc.setFontSize(fontSizes.body);
              doc.setTextColor(60, 60, 60);

              const showLabel = !field.label.toLowerCase().includes('summary') && !field.label.toLowerCase().includes('details') && field.label.trim() !== '';
              const textLine = showLabel ? `${field.label}: ${textVal}` : textVal;

              const lines = doc.splitTextToSize(textLine, contentWidth);
              lines.forEach((line: string) => {
                checkSpace(lineHeights.body);
                doc.text(line, baseMargin, currentY);
                currentY += lineHeights.body;
              });
              currentY += 2; // minor spacing between simple fields
            }
          }
        });
      }
    });

    currentY += 10; // spacing between sections
  });

  return doc;
}
