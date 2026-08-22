import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  answerCustomQuestionWithGroq,
  matchResumeWithJob,
  generateCoverLetter,
} from '../groq-ai.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Groq AI Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('answerCustomQuestionWithGroq', () => {
    it('should return fallback response when API key is missing', async () => {
      const result = await answerCustomQuestionWithGroq('', 'Test question', 'Test context');
      expect(result).toBe('Detailed experience provided upon request in accordance with candidate profile.');
    });

    it('should return fallback response when API key is undefined', async () => {
      const result = await answerCustomQuestionWithGroq(undefined as any, 'Test question', 'Test context');
      expect(result).toBe('Detailed experience provided upon request in accordance with candidate profile.');
    });

    it('should return successful response from Groq API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'AI generated answer based on profile.' } }],
        }),
      });

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Describe your experience', 'Software engineer with 5 years experience');
      expect(result).toBe('AI generated answer based on profile.');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Test question', 'Test context');
      expect(result).toBe('Experience aligns with job description requirements.');
    });

    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Test question', 'Test context');
      expect(result).toBe('Experience aligns with job description requirements.');
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Test question', 'Test context');
      expect(result).toBe('Experience aligns with job description requirements.');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Test question', 'Test context');
      expect(result).toBe('Experience aligns with job description requirements.');
    });

    it('should handle empty response from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Test question', 'Test context');
      expect(result).toBe('');
    });

    it('should handle missing choices in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Test question', 'Test context');
      expect(result).toBe('');
    });

    it('should handle malformed response structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{}],
        }),
      });

      const result = await answerCustomQuestionWithGroq('test-api-key', 'Test question', 'Test context');
      expect(result).toBe('');
    });

    it('should send correct request payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test answer' } }],
        }),
      });

      await answerCustomQuestionWithGroq('test-api-key', 'Why do you want this job?', 'Experienced developer');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: 'You are an executive job candidate assistant. Answer the job application question concisely, professionally, and accurately in first-person based ONLY on candidate details provided.',
              },
              {
                role: 'user',
                content: 'Candidate Context:\nExperienced developer\n\nJob Application Question:\nWhy do you want this job?',
              },
            ],
            temperature: 0.2,
            max_tokens: 250,
          }),
        })
      );
    });
  });

  describe('matchResumeWithJob', () => {
    it('should return estimated score when API key is missing', async () => {
      const result = await matchResumeWithJob('', 'Resume text', 'Job description');
      expect(result).toEqual({
        score: 75,
        explanation: 'Score estimated -- Groq API key not configured.',
      });
    });

    it('should return estimated score when API key is undefined', async () => {
      const result = await matchResumeWithJob(undefined as any, 'Resume text', 'Job description');
      expect(result).toEqual({
        score: 75,
        explanation: 'Score estimated -- Groq API key not configured.',
      });
    });

    it('should return successful match score from Groq API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"score": 85, "explanation": "Strong match for senior role"}' } }],
        }),
      });

      const result = await matchResumeWithJob('test-api-key', 'Resume text', 'Job description');
      expect(result).toEqual({
        score: 85,
        explanation: 'Strong match for senior role',
      });
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await matchResumeWithJob('test-api-key', 'Resume text', 'Job description');
      expect(result).toEqual({
        score: 70,
        explanation: 'Groq API unavailable.',
      });
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Not valid JSON' } }],
        }),
      });

      const result = await matchResumeWithJob('test-api-key', 'Resume text', 'Job description');
      expect(result).toEqual({
        score: 70,
        explanation: 'Could not parse match score.',
      });
    });

    it('should handle missing score in parsed JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"explanation": "Good match"}' } }],
        }),
      });

      const result = await matchResumeWithJob('test-api-key', 'Resume text', 'Job description');
      expect(result).toEqual({
        score: 70,
        explanation: 'Good match',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await matchResumeWithJob('test-api-key', 'Resume text', 'Job description');
      expect(result).toEqual({
        score: 70,
        explanation: 'Could not parse match score.',
      });
    });

    it('should send correct request payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"score": 90, "explanation": "Excellent fit"}' } }],
        }),
      });

      await matchResumeWithJob('test-api-key', 'Software engineer resume', 'Senior developer job');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: 'You are a senior technical recruiter. Score the candidate resume against the job description on a 0-100 scale. Respond ONLY with valid JSON: {"score": <number>, "explanation": "<one_sentence>"}',
              },
              {
                role: 'user',
                content: 'Resume:\nSoftware engineer resume\n\nJob Description:\nSenior developer job',
              },
            ],
            temperature: 0.1,
            max_tokens: 150,
          }),
        })
      );
    });
  });

  describe('generateCoverLetter', () => {
    it('should return fallback cover letter when API key is missing', async () => {
      const result = await generateCoverLetter('', 'Candidate context', 'Job description', 'Acme Corp');
      expect(result).toBe(
        'Dear Hiring Manager at Acme Corp,\n\nI am excited to apply for this role. My background aligns closely with the requirements listed, and I am eager to contribute to your team\'s success.\n\nBest regards'
      );
    });

    it('should return fallback cover letter when API key is undefined', async () => {
      const result = await generateCoverLetter(undefined as any, 'Candidate context', 'Job description', 'Acme Corp');
      expect(result).toContain('Dear Hiring Manager at Acme Corp');
    });

    it('should return successful cover letter from Groq API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Dear Hiring Manager at Acme Corp,\n\nI am writing to express my interest...\n\nBest regards' } }],
        }),
      });

      const result = await generateCoverLetter('test-api-key', 'Candidate context', 'Job description', 'Acme Corp');
      expect(result).toBe('Dear Hiring Manager at Acme Corp,\n\nI am writing to express my interest...\n\nBest regards');
    });

    it('should return fallback on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await generateCoverLetter('test-api-key', 'Candidate context', 'Job description', 'Acme Corp');
      expect(result).toBe(
        'Dear Hiring Manager at Acme Corp,\n\nI am excited to apply. My experience aligns well with this role.\n\nBest regards'
      );
    });

    it('should return fallback on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await generateCoverLetter('test-api-key', 'Candidate context', 'Job description', 'Acme Corp');
      expect(result).toBe(
        'Dear Hiring Manager at Acme Corp,\n\nI am excited to apply. My experience aligns well with this role.\n\nBest regards'
      );
    });

    it('should handle empty response from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      const result = await generateCoverLetter('test-api-key', 'Candidate context', 'Job description', 'Acme Corp');
      expect(result).toBe('');
    });

    it('should send correct request payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Cover letter content' } }],
        }),
      });

      await generateCoverLetter('test-api-key', 'Experienced developer', 'Job description', 'TechCorp');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: 'You are an expert cover letter writer. Write a concise, compelling 3-paragraph cover letter in first person. Do not use placeholder text. Return only the letter body, no subject line.',
              },
              {
                role: 'user',
                content: 'Candidate Profile:\nExperienced developer\n\nJob Description:\nJob description\n\nCompany: TechCorp',
              },
            ],
            temperature: 0.4,
            max_tokens: 400,
          }),
        })
      );
    });
  });
});