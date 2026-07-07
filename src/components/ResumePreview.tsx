/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ResumeData } from '../types';
import { PDFExportOptions } from '../lib/pdfGenerator';

interface ResumePreviewProps {
  data: ResumeData;
  options: PDFExportOptions;
}

export function ResumePreview({ data, options }: ResumePreviewProps) {
  // Map standard font selections to tailwind style
  const getFontFamilyClass = () => {
    switch (options.fontFamily) {
      case 'Times New Roman':
        return 'font-serif';
      case 'Georgia':
        return 'font-serif';
      case 'Calibri':
      case 'Arial':
      case 'Helvetica':
      default:
        return 'font-sans';
    }
  };

  const getMarginClass = () => {
    switch (options.marginSize) {
      case 'compact':
        return 'p-6 md:p-8';
      case 'relaxed':
        return 'p-12 md:p-16';
      case 'standard':
      default:
        return 'p-8 md:p-12';
    }
  };

  const getFontSizeClass = () => {
    switch (options.fontSizeScale) {
      case 'compact':
        return 'text-xs';
      case 'relaxed':
        return 'text-base';
      case 'standard':
      default:
        return 'text-sm';
    }
  };

  const contactSection = data.sections.find((s) => s.id === 'contact_info');
  const otherSections = data.sections.filter((s) => s.id !== 'contact_info');

  return (
    <div className="w-full bg-slate-100 rounded-xl p-4 md:p-6 shadow-inner flex justify-center items-start overflow-auto max-h-[85vh]">
      {/* Simulation of a physical Letter paper */}
      <div
        id="resume-paper-preview"
        className={`w-full max-w-[800px] min-h-[1050px] bg-white text-gray-800 shadow-md transition-all duration-200 border border-gray-200 ${getFontFamilyClass()} ${getMarginClass()} ${getFontSizeClass()}`}
        style={{ fontFamily: options.fontFamily }}
      >
        {/* Contact Header Section */}
        {contactSection && contactSection.entries.length > 0 && (
          <div className="mb-6 border-b border-transparent pb-2">
            {contactSection.entries[0].fields.map((field) => {
              if (field.id === 'fullName') {
                return (
                  <h1
                    key={field.id}
                    className="font-bold text-3xl tracking-tight text-slate-900 leading-tight mb-2"
                  >
                    {String(field.value) || 'Jane Doe'}
                  </h1>
                );
              }
              return null;
            })}

            {/* Other contact fields list separated by dividers */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-xs md:text-sm font-light mt-1">
              {contactSection.entries[0].fields
                .filter((f) => f.id !== 'fullName' && String(f.value).trim() !== '')
                .map((field, index, arr) => (
                  <React.Fragment key={field.id}>
                    <span>{String(field.value)}</span>
                    {index < arr.length - 1 && <span className="text-gray-300">|</span>}
                  </React.Fragment>
                ))}
            </div>
          </div>
        )}

        {/* Dynamic content sections */}
        <div className="space-y-6">
          {otherSections.map((section) => {
            if (section.entries.length === 0) return null;

            return (
              <div key={section.id} className="group">
                {/* Section Header */}
                <div className="mb-2">
                  <h2
                    className="font-bold uppercase tracking-wider text-sm md:text-base mb-1"
                    style={{ color: options.themeColor }}
                  >
                    {section.title || 'Untitled Section'}
                  </h2>
                  {options.showSectionLines && (
                    <div className="h-[1px] w-full bg-gray-200" />
                  )}
                </div>

                {/* Section Entries */}
                <div className="space-y-4">
                  {section.entries.map((entry, entryIdx) => {
                    if (section.type === 'repeatable') {
                      // Work Experience / Education dynamic layout
                      const fields = entry.fields;
                      const getFieldValue = (keys: string[]) => {
                        const f = fields.find((field) =>
                          keys.some(
                            (k) =>
                              field.id.toLowerCase() === k ||
                              field.label.toLowerCase().includes(k)
                          )
                        );
                        return f ? String(f.value).trim() : '';
                      };

                      const primary = getFieldValue([
                        'company',
                        'institution',
                        'school',
                        'organization',
                        'employer',
                      ]);
                      const secondary = getFieldValue([
                        'role',
                        'degree',
                        'title',
                        'position',
                        'major',
                      ]);
                      const dates = getFieldValue([
                        'dates',
                        'duration',
                        'time',
                        'period',
                      ]);
                      const location = getFieldValue(['location', 'city', 'address']);

                      // Other custom fields not rendered in the main layout block
                      const customFields = fields.filter(
                        (f) =>
                          ![
                            'company',
                            'institution',
                            'school',
                            'organization',
                            'employer',
                            'role',
                            'degree',
                            'title',
                            'position',
                            'major',
                            'dates',
                            'duration',
                            'time',
                            'period',
                            'location',
                            'city',
                            'address',
                          ].some(
                            (k) => f.id.toLowerCase() === k || f.label.toLowerCase().includes(k)
                          )
                      );

                      return (
                        <div key={entry.id} className="text-gray-700">
                          {/* Row 1: Company / School & Dates */}
                          <div className="flex justify-between items-baseline font-semibold text-slate-800 text-sm md:text-base">
                            <span>{primary || 'Name'}</span>
                            <span className="text-gray-500 font-normal text-xs md:text-sm">
                              {dates}
                            </span>
                          </div>

                          {/* Row 2: Role / Degree & Location */}
                          <div className="flex justify-between items-baseline text-xs md:text-sm text-gray-500 italic mt-0.5 mb-2">
                            <span>{secondary || 'Position'}</span>
                            <span>{location}</span>
                          </div>

                          {/* Custom fields & bullet lists */}
                          {customFields.map((field) => {
                            if (field.type === 'bullets' && Array.isArray(field.value)) {
                              return (
                                <ul
                                  key={field.id}
                                  className="list-disc list-outside pl-5 space-y-1 text-xs md:text-sm text-gray-600 font-light"
                                >
                                  {field.value
                                    .filter((bullet) => bullet.trim() !== '')
                                    .map((bullet, idx) => (
                                      <li key={idx} className="leading-relaxed">
                                        {bullet}
                                      </li>
                                    ))}
                                </ul>
                              );
                            }

                            return (
                              <div
                                key={field.id}
                                className="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed"
                              >
                                {field.label.toLowerCase() !== 'summary' &&
                                field.label.toLowerCase() !== 'details' && (
                                  <span className="font-medium mr-1">{field.label}:</span>
                                )}
                                <span>{String(field.value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      // Single block layout (e.g. Summary, Skills)
                      return (
                        <div key={entry.id} className="space-y-3">
                          {entry.fields.map((field) => {
                            if (field.type === 'bullets' && Array.isArray(field.value)) {
                              return (
                                <ul
                                  key={field.id}
                                  className="list-disc list-outside pl-5 space-y-1 text-xs md:text-sm text-gray-600 font-light"
                                >
                                  {field.value
                                    .filter((bullet) => bullet.trim() !== '')
                                    .map((bullet, idx) => (
                                      <li key={idx} className="leading-relaxed">
                                        {bullet}
                                      </li>
                                    ))}
                                </ul>
                              );
                            }

                            const val = String(field.value).trim();
                            if (val === '') return null;

                            return (
                              <div
                                key={field.id}
                                className="text-xs md:text-sm text-gray-600 leading-relaxed font-light"
                              >
                                {field.label.toLowerCase() !== 'summary' &&
                                  field.label.toLowerCase() !== 'details' &&
                                  field.label.trim() !== '' && (
                                    <span className="font-semibold text-gray-700 mr-1.5">
                                      {field.label}:
                                    </span>
                                  )}
                                <span className="whitespace-pre-wrap">{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
