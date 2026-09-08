import { describe, it, expect } from 'vitest';
import { parseAssistantResponse, isAcademicExploitationQuery } from '../../renderer/utils/assistant-action-parser';

describe('Nomadic Assistant on Steroids Parser Suite', () => {
  it('detects academic cheating / assignment requests', () => {
    expect(isAcademicExploitationQuery('Do my college assignment for me')).toBe(true);
    expect(isAcademicExploitationQuery('Write my university homework essay on database management')).toBe(true);
    expect(isAcademicExploitationQuery('Solve this test question for my school exam')).toBe(true);
    expect(isAcademicExploitationQuery('How do I prepare for a Google system design interview?')).toBe(false);
    expect(isAcademicExploitationQuery('Auto apply to the top 5 full stack jobs')).toBe(false);
  });

  it('parses structured action directives from assistant responses', () => {
    const rawAiOutput = JSON.stringify({
      reply: 'Navigating to your Job Board and filtering for full-time positions.',
      action: { type: 'NAVIGATE', target: 'feed' }
    });
    const parsed = parseAssistantResponse(rawAiOutput);
    expect(parsed.reply).toContain('Navigating');
    expect(parsed.action?.type).toBe('NAVIGATE');
    expect(parsed.action?.target).toBe('feed');
  });

  it('handles embedded json in markdown block', () => {
    const rawMarkdown = `Here is your plan:
\`\`\`json
{
  "reply": "I have found 5 matching positions and prepared auto-apply.",
  "action": { "type": "TRIGGER_APPLY", "target": "top_jobs" }
}
\`\`\``;
    const parsed = parseAssistantResponse(rawMarkdown);
    expect(parsed.reply).toContain('I have found 5 matching positions');
    expect(parsed.action?.type).toBe('TRIGGER_APPLY');
  });
});
