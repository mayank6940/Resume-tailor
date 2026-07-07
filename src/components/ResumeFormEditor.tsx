/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ResumeData, ResumeSection, ResumeEntry, ResumeField, FieldType } from '../types';
import {
  Trash2,
  Copy,
  Plus,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  FileText,
  List,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ResumeFormEditorProps {
  data: ResumeData;
  onChange: (updatedData: ResumeData) => void;
}

const STANDARD_HEADERS_LOWER = [
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

export function ResumeFormEditor({ data, onChange }: ResumeFormEditorProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  
  // Modal / Inline states for adding custom fields
  const [addingFieldTo, setAddingFieldTo] = useState<{ sectionId: string; entryId: string } | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  // Inline state for adding custom sections
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionType, setNewSectionType] = useState<'single' | 'repeatable'>('repeatable');

  // Deep copy handler
  const emitChange = (updated: ResumeData) => {
    onChange(JSON.parse(JSON.stringify(updated)));
  };

  const toggleSectionCollapse = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. REORDER SECTIONS
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...data.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    // Swap
    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;

    emitChange({ ...data, sections });
  };

  // 2. DELETE SECTION
  const deleteSection = (sectionId: string) => {
    if (window.confirm('Are you sure you want to delete this entire section?')) {
      const sections = data.sections.filter((s) => s.id !== sectionId);
      emitChange({ ...data, sections });
    }
  };

  // 3. RENAME SECTION
  const renameSection = (sectionId: string, newTitle: string) => {
    const sections = data.sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, title: newTitle };
      }
      return s;
    });
    emitChange({ ...data, sections });
  };

  // 4. ADD CUSTOM SECTION
  const handleAddCustomSection = () => {
    if (!newSectionTitle.trim()) return;

    const newSecId = `sec_${Date.now()}`;
    const newSection: ResumeSection = {
      id: newSecId,
      title: newSectionTitle.trim(),
      type: newSectionType,
      entries: [
        {
          id: `ent_${Date.now()}`,
          fields: [
            newSectionType === 'single'
              ? { id: `fld_${Date.now()}`, label: 'Details', type: 'text', value: '' }
              : { id: `fld_${Date.now()}`, label: 'Title', type: 'text', value: '' },
          ],
        },
      ],
    };

    emitChange({
      ...data,
      sections: [...data.sections, newSection],
    });

    setNewSectionTitle('');
    setIsAddingSection(false);
  };

  // 5. UPDATE FIELD VALUES
  const handleFieldChange = (
    sectionId: string,
    entryId: string,
    fieldId: string,
    newValue: string | string[]
  ) => {
    const sections = data.sections.map((sec) => {
      if (sec.id === sectionId) {
        const entries = sec.entries.map((ent) => {
          if (ent.id === entryId) {
            const fields = ent.fields.map((fld) => {
              if (fld.id === fieldId) {
                return { ...fld, value: newValue };
              }
              return fld;
            });
            return { ...ent, fields };
          }
          return ent;
        });
        return { ...sec, entries };
      }
      return sec;
    });
    emitChange({ ...data, sections });
  };

  // 6. ADD REPEATABLE ENTRY
  const handleAddEntry = (sectionId: string) => {
    const section = data.sections.find((s) => s.id === sectionId);
    if (!section) return;

    // Duplicate structure of first entry or make default
    let fieldsTemplate: ResumeField[] = [];
    if (section.entries.length > 0) {
      fieldsTemplate = section.entries[0].fields.map((f) => ({
        id: `fld_${Math.random().toString(36).substr(2, 9)}`,
        label: f.label,
        type: f.type,
        value: f.type === 'bullets' ? [''] : '',
      }));
    } else {
      fieldsTemplate = [
        { id: `fld_${Date.now()}_1`, label: 'Header', type: 'text', value: '' },
        { id: `fld_${Date.now()}_2`, label: 'Subheader', type: 'text', value: '' },
        { id: `fld_${Date.now()}_3`, label: 'Bullets', type: 'bullets', value: [''] },
      ];
    }

    const newEntry: ResumeEntry = {
      id: `ent_${Date.now()}`,
      fields: fieldsTemplate,
    };

    const sections = data.sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, entries: [...s.entries, newEntry] };
      }
      return s;
    });

    emitChange({ ...data, sections });
  };

  // 7. DUPLICATE ENTRY (Cloning)
  const handleDuplicateEntry = (sectionId: string, entry: ResumeEntry) => {
    const clonedEntry: ResumeEntry = JSON.parse(JSON.stringify(entry));
    clonedEntry.id = `ent_${Date.now()}_clone`;
    // Re-generate field IDs to be unique
    clonedEntry.fields.forEach((f) => {
      f.id = `fld_${Math.random().toString(36).substr(2, 9)}`;
    });

    const sections = data.sections.map((s) => {
      if (s.id === sectionId) {
        const idx = s.entries.findIndex((e) => e.id === entry.id);
        const updatedEntries = [...s.entries];
        updatedEntries.splice(idx + 1, 0, clonedEntry); // insert cloned immediately after
        return { ...s, entries: updatedEntries };
      }
      return s;
    });

    emitChange({ ...data, sections });
  };

  // 8. DELETE REPEATABLE ENTRY
  const handleDeleteEntry = (sectionId: string, entryId: string) => {
    const section = data.sections.find((s) => s.id === sectionId);
    if (!section) return;

    if (section.entries.length <= 1) {
      alert('A section must contain at least one entry. Consider deleting the entire section instead.');
      return;
    }

    const sections = data.sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, entries: s.entries.filter((e) => e.id !== entryId) };
      }
      return s;
    });

    emitChange({ ...data, sections });
  };

  // 9. REORDER REPEATABLE ENTRIES
  const moveEntry = (sectionId: string, index: number, direction: 'up' | 'down') => {
    const section = data.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const entries = [...section.entries];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= entries.length) return;

    // Swap
    const temp = entries[index];
    entries[index] = entries[targetIdx];
    entries[targetIdx] = temp;

    const sections = data.sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, entries };
      }
      return s;
    });

    emitChange({ ...data, sections });
  };

  // 10. ADD FIELD TO ENTRY
  const handleAddCustomField = () => {
    if (!addingFieldTo || !newFieldName.trim()) return;
    const { sectionId, entryId } = addingFieldTo;

    const newField: ResumeField = {
      id: `fld_custom_${Date.now()}`,
      label: newFieldName.trim(),
      type: newFieldType,
      value: newFieldType === 'bullets' ? [''] : '',
    };

    const sections = data.sections.map((sec) => {
      if (sec.id === sectionId) {
        const entries = sec.entries.map((ent) => {
          if (ent.id === entryId) {
            return { ...ent, fields: [...ent.fields, newField] };
          }
          return ent;
        });
        return { ...sec, entries };
      }
      return sec;
    });

    emitChange({ ...data, sections });

    // Reset state
    setNewFieldName('');
    setAddingFieldTo(null);
  };

  // 11. DELETE FIELD
  const handleDeleteField = (sectionId: string, entryId: string, fieldId: string) => {
    if (window.confirm('Delete this field?')) {
      const sections = data.sections.map((sec) => {
        if (sec.id === sectionId) {
          const entries = sec.entries.map((ent) => {
            if (ent.id === entryId) {
              return { ...ent, fields: ent.fields.filter((f) => f.id !== fieldId) };
            }
            return ent;
          });
          return { ...sec, entries };
        }
        return sec;
      });
      emitChange({ ...data, sections });
    }
  };

  // Helpers for bullets editing
  const handleBulletChange = (
    sectionId: string,
    entryId: string,
    fieldId: string,
    bulletIndex: number,
    text: string,
    bulletsArr: string[]
  ) => {
    const updated = [...bulletsArr];
    updated[bulletIndex] = text;
    handleFieldChange(sectionId, entryId, fieldId, updated);
  };

  const handleAddBulletLine = (
    sectionId: string,
    entryId: string,
    fieldId: string,
    bulletsArr: string[]
  ) => {
    const updated = [...bulletsArr, ''];
    handleFieldChange(sectionId, entryId, fieldId, updated);
  };

  const handleRemoveBulletLine = (
    sectionId: string,
    entryId: string,
    fieldId: string,
    bulletIndex: number,
    bulletsArr: string[]
  ) => {
    const updated = bulletsArr.filter((_, i) => i !== bulletIndex);
    handleFieldChange(sectionId, entryId, fieldId, updated);
  };

  return (
    <div className="space-y-6">
      {/* Loop Resume Sections */}
      {data.sections.map((section, secIdx) => {
        const isCollapsed = collapsedSections[section.id];
        const titleLower = section.title.toLowerCase().trim();
        const isHeadingStandard =
          STANDARD_HEADERS_LOWER.some((std) => titleLower === std || titleLower.includes(std)) ||
          section.title === '';

        return (
          <div
            key={section.id}
            className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm space-y-4 transition-all hover:shadow-md"
          >
            {/* Section Controls Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 grow max-w-md">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="p-1 hover:bg-slate-100 rounded text-gray-500 cursor-pointer"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                
                <div className="space-y-1 w-full">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => renameSection(section.id, e.target.value)}
                    placeholder="Section Title"
                    disabled={section.id === 'contact_info'} // Contact details heading is fixed
                    className="font-bold text-base text-slate-800 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none py-0.5 px-1 rounded w-full shrink-0"
                  />
                  {!isHeadingStandard && (
                    <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Non-standard heading. Recommend standard titles for ATS.
                    </p>
                  )}
                </div>
              </div>

              {/* Section Tools: Up, Down, Delete */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveSection(secIdx, 'up')}
                  disabled={secIdx === 0}
                  className="p-1.5 hover:bg-slate-100 rounded text-gray-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Move Section Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(secIdx, 'down')}
                  disabled={secIdx === data.sections.length - 1}
                  className="p-1.5 hover:bg-slate-100 rounded text-gray-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Move Section Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                {section.id !== 'contact_info' && section.id !== 'summary' && (
                  <button
                    type="button"
                    onClick={() => deleteSection(section.id)}
                    className="p-1.5 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
                    title="Delete Section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Section Entries (Only visible if not collapsed) */}
            {!isCollapsed && (
              <div className="space-y-6">
                {section.entries.map((entry, entIdx) => (
                  <div
                    key={entry.id}
                    className={`space-y-4 ${
                      section.type === 'repeatable'
                        ? 'p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/20 hover:bg-slate-50/40 relative group'
                        : ''
                    }`}
                  >
                    {/* Repeatable entry management bar */}
                    {section.type === 'repeatable' && (
                      <div className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-lg shadow-sm">
                        <span className="text-xs font-bold text-slate-500">
                          Entry #{entIdx + 1}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveEntry(section.id, entIdx, 'up')}
                            disabled={entIdx === 0}
                            className="p-1 hover:bg-slate-100 rounded text-gray-500 disabled:opacity-30 cursor-pointer"
                            title="Move Entry Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveEntry(section.id, entIdx, 'down')}
                            disabled={entIdx === section.entries.length - 1}
                            className="p-1 hover:bg-slate-100 rounded text-gray-500 disabled:opacity-30 cursor-pointer"
                            title="Move Entry Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateEntry(section.id, entry)}
                            className="p-1 hover:bg-indigo-50 text-indigo-600 rounded cursor-pointer"
                            title="Duplicate / Clone Entry"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(section.id, entry.id)}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                            title="Remove Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Entry fields */}
                    <div className="space-y-4">
                      {entry.fields.map((field) => {
                        const isBulletType = field.type === 'bullets';
                        const isFixedHeaderField =
                          section.id === 'contact_info' || section.id === 'summary';

                        return (
                          <div key={field.id} className="space-y-1.5">
                            <div className="flex justify-between items-baseline">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                {field.label}
                              </label>
                              
                              {/* Can delete custom fields inside custom repeatable entries */}
                              {!isFixedHeaderField &&
                                !['company', 'institution', 'role', 'degree', 'dates', 'location'].includes(field.id) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteField(section.id, entry.id, field.id)}
                                    className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                                  >
                                    Delete Field
                                  </button>
                                )}
                            </div>

                            {/* Render Text field */}
                            {!isBulletType ? (
                              field.label.toLowerCase().includes('summary') || field.label.toLowerCase().includes('details') ? (
                                <textarea
                                  rows={4}
                                  value={String(field.value)}
                                  onChange={(e) =>
                                    handleFieldChange(section.id, entry.id, field.id, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-light resize-y leading-relaxed"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={String(field.value)}
                                  onChange={(e) =>
                                    handleFieldChange(section.id, entry.id, field.id, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-light"
                                />
                              )
                            ) : (
                              // Render Bullet list field
                              <div className="space-y-2">
                                {Array.isArray(field.value) &&
                                  field.value.map((bullet, bIdx) => (
                                    <div key={bIdx} className="flex gap-2 items-center">
                                      <span className="text-gray-400 text-sm shrink-0">&bull;</span>
                                      <input
                                        type="text"
                                        value={bullet}
                                        onChange={(e) =>
                                          handleBulletChange(
                                            section.id,
                                            entry.id,
                                            field.id,
                                            bIdx,
                                            e.target.value,
                                            field.value as string[]
                                          )
                                        }
                                        placeholder="Implemented responsive features..."
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-light"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveBulletLine(
                                            section.id,
                                            entry.id,
                                            field.id,
                                            bIdx,
                                            field.value as string[]
                                          )
                                        }
                                        className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                                        title="Delete Bullet Line"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddBulletLine(
                                      section.id,
                                      entry.id,
                                      field.id,
                                      field.value as string[]
                                    )
                                  }
                                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Bullet Achievement
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add custom field controls inline per entry */}
                    {addingFieldTo?.sectionId === section.id && addingFieldTo?.entryId === entry.id ? (
                      <div className="p-3 border border-indigo-100 bg-indigo-50/10 rounded-xl space-y-3">
                        <p className="text-xs font-bold text-slate-800">Add Custom Field</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500">Field Label</label>
                            <input
                              type="text"
                              placeholder="e.g., Portfolio URL"
                              value={newFieldName}
                              onChange={(e) => setNewFieldName(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500">Field Type</label>
                            <select
                              value={newFieldType}
                              onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="text">Single Text</option>
                              <option value="bullets">Bullet List</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAddingFieldTo(null)}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-slate-50 font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddCustomField}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            Save Field
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingFieldTo({ sectionId: section.id, entryId: entry.id })}
                        className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Custom Field to Entry
                      </button>
                    )}
                  </div>
                ))}

                {/* Add entry for repeatable sections */}
                {section.type === 'repeatable' && (
                  <button
                    type="button"
                    onClick={() => handleAddEntry(section.id)}
                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <PlusCircle className="w-4 h-4 text-indigo-500" />
                    Add New {section.title.replace(/s$/, '') || 'Entry'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Custom Section controls */}
      {isAddingSection ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4.5 h-4.5 text-indigo-500" />
            Create Custom Section
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Section Title</label>
              <input
                type="text"
                placeholder="e.g., Publications or Awards"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Structure Type</label>
              <select
                value={newSectionType}
                onChange={(e) => setNewSectionType(e.target.value as 'single' | 'repeatable')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
              >
                <option value="repeatable">Repeatable Blocks (Work history/Schools)</option>
                <option value="single">Single List of Fields (Skills/Summary)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingSection(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-slate-100 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCustomSection}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Create Section
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingSection(true)}
          className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-95 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          Add Custom Section
        </button>
      )}
    </div>
  );
}
