/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Parse incoming JSON requests with a high payload limit for resumes
app.use(express.json({ limit: '10mb' }));

// Initialize the Google GenAI SDK
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('WARNING: GEMINI_API_KEY environment variable is missing.');
}

// REST API endpoint for resume tailoring
app.post('/api/tailor', async (req, res) => {
  if (!ai) {
    return res.status(500).json({
      error: 'Gemini API client is not configured. Please add GEMINI_API_KEY to your Secrets.',
    });
  }

  const { masterResume, jobDescription } = req.body;

  if (!masterResume) {
    return res.status(400).json({ error: 'Missing master resume data.' });
  }

  if (!jobDescription || jobDescription.trim() === '') {
    return res.status(400).json({ error: 'Missing job description.' });
  }

  try {
    const systemInstruction = `You are an elite corporate technical recruiter and ATS (Applicant Tracking System) optimization expert. 
Your job is to analyze a candidate's structured master resume (provided as JSON) and a Target Job Description (provided as text).
You will then generate a tailored set of proposed adjustments to the resume to align it precisely with the job description.

NON-NEGOTIABLE CONSTRAINTS & PRINCIPLES:
1. STRICT TRUTH: Do not invent or fabricate ANY job titles, company names, credentials, dates, certifications, degrees, or years of experience. You must only rewrite or reword existing text to emphasize relevant skills, accomplishments, or methodologies already implied or mentioned.
2. ATS ALIGNMENT: Optimize bullet points, summary paragraphs, and technical skills keywords to reflect those found in the Job Description, ensuring key technologies are front and center.
3. SIDE-BY-SIDE CHANGES: You must propose specific field-level changes. For each change, specify the sectionId, entryId, and fieldId, along with the original value, proposed tailored value, and a brief, professional explanation of why the change is beneficial (e.g., "Highlighted expertise with Webpack to align with the core build-tool requirements in the job description").
4. Bullet format: If a field is of type "bullets" (meaning it's an array of strings), proposedValue MUST be a tailored array of strings (bullets). If a field is of type "text" (meaning it's a single string), proposedValue MUST be a tailored string. Do not mix types.
5. QUALITY SCORE: Calculate an ATS keyword match score (0 to 100) based on the overlap between the tailored resume and the job description, listing matching and missing key terms.

You must respond in strictly valid JSON matching the following typescript schema:
{
  "matchScore": number, // an integer between 0 and 100
  "matchingKeywords": string[], // list of key tech/soft skills keywords from the JD that are matched
  "missingKeywords": string[], // list of key tech/soft skills keywords from the JD that are missing
  "proposedChanges": [
    {
      "id": string, // a short unique random ID (e.g., "ch-1", "ch-2")
      "sectionId": string, // must match an existing section id
      "sectionTitle": string, // title of that section
      "entryId": string, // must match the entry id
      "fieldId": string, // must match the field id
      "fieldLabel": string, // label of the field
      "originalValue": string | string[], // exact value from the input resume
      "proposedValue": string | string[], // optimized tailored value (string if original was string, string[] if original was string[])
      "explanation": string // professional reasoning for this change
    }
  ]
}

Only suggest high-impact improvements (typically 3 to 10 changes across work experience achievements, professional summary, and technical skills). If a field does not need adjustment, do not include it in the proposedChanges array. Ensure all JSON string double-quotes are properly escaped and the JSON is fully parseable.`;

    const prompt = `Here is the Master Resume JSON:
${JSON.stringify(masterResume, null, 2)}

Here is the Target Job Description text:
"""
${jobDescription}
"""

Analyze both and return the tailored result in the exact JSON schema requested.`;

    // We can use the responseSchema parameter to guarantee structural compliance!
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['matchScore', 'matchingKeywords', 'missingKeywords', 'proposedChanges'],
          properties: {
            matchScore: {
              type: Type.INTEGER,
              description: 'An integer between 0 and 100 representing the ATS alignment score after tailoring.',
            },
            matchingKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Keywords and phrases found in the job description that are successfully matched in the tailored resume.',
            },
            missingKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Highly relevant keywords/skills from the job description that are missing from the resume.',
            },
            proposedChanges: {
              type: Type.ARRAY,
              description: 'A list of distinct field-level improvements proposed to optimize matching.',
              items: {
                type: Type.OBJECT,
                required: [
                  'id',
                  'sectionId',
                  'sectionTitle',
                  'entryId',
                  'fieldId',
                  'fieldLabel',
                  'originalValue',
                  'proposedValue',
                  'explanation',
                ],
                properties: {
                  id: { type: Type.STRING },
                  sectionId: { type: Type.STRING },
                  sectionTitle: { type: Type.STRING },
                  entryId: { type: Type.STRING },
                  fieldId: { type: Type.STRING },
                  fieldLabel: { type: Type.STRING },
                  originalValue: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Original field value (or string array if it was bullets). Can be a simple string too if original was type text, but list format is used in schema if needed.',
                  },
                  proposedValue: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Tailored field value. If original was string, provide a single item array or a string. If original was list of bullets, provide an optimized list of bullets.',
                  },
                  explanation: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini.');
    }

    // Parse the JSON. Because we specified responseSchema, the structure is guaranteed.
    const tailoredJSON = JSON.parse(resultText);

    // Let's do a post-processing check to ensure types match original types
    // (e.g. if original was string, proposedValue should be a string, and if original was array, it should be an array)
    if (tailoredJSON.proposedChanges && Array.isArray(tailoredJSON.proposedChanges)) {
      tailoredJSON.proposedChanges = tailoredJSON.proposedChanges.map((change: any) => {
        // Find the original field to verify if it is text or bullets
        let originalIsString = true;
        const section = masterResume.sections.find((s: any) => s.id === change.sectionId);
        if (section) {
          const entry = section.entries.find((e: any) => e.id === change.entryId);
          if (entry) {
            const field = entry.fields.find((f: any) => f.id === change.fieldId);
            if (field) {
              originalIsString = field.type === 'text';
            }
          }
        }

        let originalValueProcessed = change.originalValue;
        let proposedValueProcessed = change.proposedValue;

        // If the original field is text:
        if (originalIsString) {
          if (Array.isArray(change.originalValue)) {
            originalValueProcessed = change.originalValue.join('\n');
          }
          if (Array.isArray(change.proposedValue)) {
            proposedValueProcessed = change.proposedValue.join('\n');
          }
        } else {
          // If the original field is bullets, make sure it is an array
          if (typeof change.originalValue === 'string') {
            originalValueProcessed = change.originalValue.split('\n').filter((l: string) => l.trim() !== '');
          }
          if (typeof change.proposedValue === 'string') {
            proposedValueProcessed = change.proposedValue.split('\n').filter((l: string) => l.trim() !== '');
          }
        }

        return {
          ...change,
          originalValue: originalValueProcessed,
          proposedValue: proposedValueProcessed,
        };
      });
    }

    res.json(tailoredJSON);
  } catch (error: any) {
    console.error('Error in tailoring engine:', error);
    res.status(500).json({
      error: 'Fail to optimize resume. Please retry.',
      details: error.message || error,
    });
  }
});

// REST API endpoint for resume parsing from unstructured text
app.post('/api/parse-resume', async (req, res) => {
  if (!ai) {
    return res.status(500).json({
      error: 'Gemini API client is not configured. Please add GEMINI_API_KEY to your Secrets.',
    });
  }

  const { resumeText } = req.body;

  if (!resumeText || resumeText.trim() === '') {
    return res.status(400).json({ error: 'Missing resume text to parse.' });
  }

  try {
    const systemInstruction = `You are an elite expert ATS resume parser. Your job is to convert unstructured, raw resume text into a structured JSON schema that conforms exactly to the provided typescript model.

The schema of the returned JSON MUST be:
{
  "sections": [
    {
      "id": "contact_info" | "summary" | "experience" | "skills" | "education" | string,
      "title": string,
      "type": "single" | "repeatable",
      "entries": [
        {
          "id": string,
          "fields": [
            {
              "id": string,
              "label": string,
              "type": "text" | "bullets",
              "value": string[] // List of strings. For "text" fields, this should have exactly 1 element. For "bullets" fields, multiple elements.
            }
          ]
        }
      ]
    }
  ]
}

STRICT INSTRUCTIONS:
1. Extract ALL information accurately from the provided resume text. Do not hallucinate or omit major pieces of contact information, employment history, skills, or educational history.
2. Map the extracted info to standard sections:
   - For "contact_info" (single): fields MUST include "fullName", "email", "phone", "location", "linkedin", "website".
   - For "summary" (single): field MUST include "summaryText".
   - For "experience" (repeatable): entries for each job. Fields MUST include "company", "role", "dates", "location", and "bullets" (which must be a list of achievements).
   - For "skills" (single): fields can include "technical", "frameworks", "tools", or other categorized skills.
   - For "education" (repeatable): entries for each school/degree. Fields MUST include "institution", "degree", "dates", "location".
3. Return ONLY the JSON matching the response schema.`;

    const prompt = `Convert the following raw unstructured resume text into a perfectly structured JSON following the requested schema:

"""
${resumeText}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['sections'],
          properties: {
            sections: {
              type: Type.ARRAY,
              description: 'List of resume sections extracted from the raw text.',
              items: {
                type: Type.OBJECT,
                required: ['id', 'title', 'type', 'entries'],
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    enum: ['single', 'repeatable'],
                  },
                  entries: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ['id', 'fields'],
                      properties: {
                        id: { type: Type.STRING },
                        fields: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            required: ['id', 'label', 'type', 'value'],
                            properties: {
                              id: { type: Type.STRING },
                              label: { type: Type.STRING },
                              type: {
                                type: Type.STRING,
                                enum: ['text', 'bullets'],
                              },
                              value: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: 'For text fields, a single-item array containing the text. For bullets, an array of bullet items.',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini parser.');
    }

    const parsedJSON = JSON.parse(resultText);

    // Post-processing to convert `value: string[]` to `value: string | string[]` based on type
    if (parsedJSON.sections && Array.isArray(parsedJSON.sections)) {
      parsedJSON.sections = parsedJSON.sections.map((sec: any) => {
        if (sec.entries && Array.isArray(sec.entries)) {
          sec.entries = sec.entries.map((ent: any) => {
            if (ent.fields && Array.isArray(ent.fields)) {
              ent.fields = ent.fields.map((fld: any) => {
                let processedValue: string | string[] = '';
                if (fld.type === 'text') {
                  processedValue = Array.isArray(fld.value)
                    ? fld.value[0] || ''
                    : String(fld.value || '');
                } else {
                  processedValue = Array.isArray(fld.value)
                    ? fld.value
                    : [String(fld.value || '')];
                }
                return {
                  id: fld.id,
                  label: fld.label,
                  type: fld.type,
                  value: processedValue,
                };
              });
            }
            return ent;
          });
        }
        return sec;
      });
    }

    res.json(parsedJSON);
  } catch (error: any) {
    console.error('Error in resume parser engine:', error);
    res.status(500).json({
      error: 'Failed to parse resume text. Please retry or enter manually.',
      details: error.message || error,
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Resume Tailoring App] Server running on http://localhost:${PORT}`);
  });
}

startServer();
