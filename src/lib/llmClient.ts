/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResumeData, TailoringResult } from '../types';

export interface TailoringOptions {
  // Can add options such as temperature, focus areas, etc.
  focusArea?: string;
}

/**
 * Sends the master resume and job description to the API backend
 * to optimize and align the resume with the target job.
 */
export async function tailorResume(
  masterResume: ResumeData,
  jobDescription: string,
  options?: TailoringOptions
): Promise<TailoringResult> {
  const response = await fetch('/api/tailor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      masterResume,
      jobDescription,
      options,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned status ${response.status}`);
  }

  const result: TailoringResult = await response.json();
  return result;
}
