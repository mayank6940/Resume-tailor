/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResumeData, VersionItem } from '../types';

// Hardcoded userId for our single-user local-first architecture (hosting-ready)
export const DEFAULT_USER_ID = 'local-user';

// Keys for localStorage
const KEY_MASTER_RESUME = (userId: string) => `resume_tailoring_master_${userId}`;
const KEY_DRAFT_RESUME = (userId: string) => `resume_tailoring_draft_${userId}`;
const KEY_VERSION_HISTORY = (userId: string) => `resume_tailoring_history_${userId}`;

export const DEFAULT_RESUME: ResumeData = {
  sections: [
    {
      id: 'contact_info',
      title: 'Contact Information',
      type: 'single',
      entries: [
        {
          id: 'contact_entry',
          fields: [
            { id: 'fullName', label: 'Full Name', type: 'text', value: 'Jane Doe' },
            { id: 'email', label: 'Email Address', type: 'text', value: 'jane.doe@example.com' },
            { id: 'phone', label: 'Phone Number', type: 'text', value: '+1 (555) 019-2834' },
            { id: 'location', label: 'Location', type: 'text', value: 'San Francisco, CA' },
            { id: 'linkedin', label: 'LinkedIn URL', type: 'text', value: 'linkedin.com/in/janedoe' },
            { id: 'website', label: 'Portfolio Website', type: 'text', value: 'janedoe.dev' },
          ]
        }
      ]
    },
    {
      id: 'summary',
      title: 'Professional Summary',
      type: 'single',
      entries: [
        {
          id: 'summary_entry',
          fields: [
            {
              id: 'summaryText',
              label: 'Summary',
              type: 'text',
              value: 'Versatile Software Engineer with 5+ years of experience specializing in building highly performant web applications, responsive interfaces, and full-stack cloud systems. Expert in React, TypeScript, Node.js, and cloud-native architectures with a passion for clean code and user-centered design.'
            }
          ]
        }
      ]
    },
    {
      id: 'experience',
      title: 'Work Experience',
      type: 'repeatable',
      entries: [
        {
          id: 'exp_1',
          fields: [
            { id: 'company', label: 'Company Name', type: 'text', value: 'TechCorp Industries' },
            { id: 'role', label: 'Job Title', type: 'text', value: 'Senior Software Engineer' },
            { id: 'dates', label: 'Dates / Duration', type: 'text', value: 'Jan 2023 - Present' },
            { id: 'location', label: 'Location', type: 'text', value: 'San Francisco, CA' },
            {
              id: 'bullets',
              label: 'Key Achievements & Responsibilities',
              type: 'bullets',
              value: [
                'Led development of a high-traffic React dashboard, reducing initial page load times by 40% and enhancing Core Web Vitals.',
                'Architected and implemented responsive frontend interfaces using Tailwind CSS and modern state management, serving 500k+ active users.',
                'Collaborated closely with product managers and designer teams to translate wireframes into pixel-perfect production code.',
                'Mentored 4 junior developers and established code quality standards, including unit testing coverage up to 90%.'
              ]
            }
          ]
        },
        {
          id: 'exp_2',
          fields: [
            { id: 'company', label: 'Company Name', type: 'text', value: 'LaunchPad Systems' },
            { id: 'role', label: 'Job Title', type: 'text', value: 'Software Engineer II' },
            { id: 'dates', label: 'Dates / Duration', type: 'text', value: 'Aug 2021 - Dec 2022' },
            { id: 'location', label: 'Location', type: 'text', value: 'Austin, TX' },
            {
              id: 'bullets',
              label: 'Key Achievements & Responsibilities',
              type: 'bullets',
              value: [
                'Built and maintained scalable API endpoints using Node.js and Express, supporting high-throughput messaging pipelines.',
                'Implemented automated continuous integration (CI/CD) pipelines, reducing deployment error rates by 25%.',
                'Designed reusable component library in React, increasing cross-team frontend development speed by 35%.'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'skills',
      title: 'Skills',
      type: 'single',
      entries: [
        {
          id: 'skills_entry',
          fields: [
            { id: 'technical', label: 'Technical Skills', type: 'text', value: 'TypeScript, JavaScript, Python, HTML5, CSS3, SQL' },
            { id: 'frameworks', label: 'Frameworks & Libraries', type: 'text', value: 'React, Node.js, Express, Next.js, Redux, Tailwind CSS' },
            { id: 'tools', label: 'Tools & Platforms', type: 'text', value: 'Git, Docker, AWS, Google Cloud, Firebase, Jest' }
          ]
        }
      ]
    },
    {
      id: 'education',
      title: 'Education',
      type: 'repeatable',
      entries: [
        {
          id: 'edu_1',
          fields: [
            { id: 'institution', label: 'Institution Name', type: 'text', value: 'University of California, Berkeley' },
            { id: 'degree', label: 'Degree / Major', type: 'text', value: 'B.S. in Computer Science' },
            { id: 'dates', label: 'Dates / Duration', type: 'text', value: 'Sep 2017 - May 2021' },
            { id: 'location', label: 'Location', type: 'text', value: 'Berkeley, CA' }
          ]
        }
      ]
    }
  ]
};

export const storage = {
  /**
   * Fetch the master resume
   */
  getMasterResume(userId: string = DEFAULT_USER_ID): ResumeData {
    try {
      const data = localStorage.getItem(KEY_MASTER_RESUME(userId));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading master resume from localStorage:', e);
    }
    // Fallback to default template
    return JSON.parse(JSON.stringify(DEFAULT_RESUME));
  },

  /**
   * Save the master resume
   */
  saveMasterResume(data: ResumeData, userId: string = DEFAULT_USER_ID): void {
    try {
      localStorage.setItem(KEY_MASTER_RESUME(userId), JSON.stringify(data));
    } catch (e) {
      console.error('Error saving master resume to localStorage:', e);
    }
  },

  /**
   * Get the auto-saved draft (which matches live session changes)
   */
  getDraftResume(userId: string = DEFAULT_USER_ID): ResumeData {
    try {
      const data = localStorage.getItem(KEY_DRAFT_RESUME(userId));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading draft resume from localStorage:', e);
    }
    return this.getMasterResume(userId);
  },

  /**
   * Save the current session as draft
   */
  saveDraftResume(data: ResumeData, userId: string = DEFAULT_USER_ID): void {
    try {
      localStorage.setItem(KEY_DRAFT_RESUME(userId), JSON.stringify(data));
    } catch (e) {
      console.error('Error saving draft resume to localStorage:', e);
    }
  },

  /**
   * Clear the draft resume
   */
  clearDraftResume(userId: string = DEFAULT_USER_ID): void {
    try {
      localStorage.removeItem(KEY_DRAFT_RESUME(userId));
    } catch (e) {
      console.error('Error clearing draft resume from localStorage:', e);
    }
  },

  /**
   * Fetch versions history
   */
  listVersions(userId: string = DEFAULT_USER_ID): VersionItem[] {
    try {
      const data = localStorage.getItem(KEY_VERSION_HISTORY(userId));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading version history from localStorage:', e);
    }
    return [];
  },

  /**
   * Save a new tailored version
   */
  saveVersion(version: VersionItem, userId: string = DEFAULT_USER_ID): VersionItem[] {
    try {
      const history = this.listVersions(userId);
      // Insert at the beginning of the array
      const updated = [version, ...history].slice(0, 50); // Limit to last 50 versions
      localStorage.setItem(KEY_VERSION_HISTORY(userId), JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving version to history:', e);
      return [];
    }
  },

  /**
   * Delete a version
   */
  deleteVersion(versionId: string, userId: string = DEFAULT_USER_ID): VersionItem[] {
    try {
      const history = this.listVersions(userId);
      const updated = history.filter((v) => v.id !== versionId);
      localStorage.setItem(KEY_VERSION_HISTORY(userId), JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error deleting version from history:', e);
      return [];
    }
  }
};
