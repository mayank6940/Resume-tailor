/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up the PDF.js worker using a standard, highly available CDN to avoid bundler conflicts in Vite.
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

/**
 * Extracts raw selectable text from an uploaded PDF file buffer.
 */
export async function parsePdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Joint the text segments of the page with a space to preserve words separation
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Extracts raw text from an uploaded Word DOCX file buffer.
 */
export async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Parse endpoint caller to send extracted text to our backend parsing service.
 */
export async function sendTextToParser(resumeText: string) {
  const response = await fetch('/api/parse-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resumeText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned status ${response.status}`);
  }

  return await response.json();
}
