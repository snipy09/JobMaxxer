import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractJsonFromAiResponse,
  generateAIVisionActionPlan,
  type SemanticElement,
  type AIFormActionPlan
} from '../groq-ai.js';
import {
  capturePageVisionAndDOM,
  executeNomadicFill,
  executeNomadicSelect,
  executeNomadicClick
} from '../ai-vision-inspector.js';

describe('AI Vision Inspector & Semantic DOM Decision Loop', () => {

  it('extracts structured JSON action plans from markdown fenced responses', () => {
    const rawAiOutput = `
      Here is the action plan for this job application:
      \`\`\`json
      {
        "pageState": "application_form",
        "fillActions": [
          { "elementId": "nomadic_node_1", "value": "Sajal Mishra", "fieldPurpose": "full_name" },
          { "elementId": "nomadic_node_2", "value": "sajal@example.com", "fieldPurpose": "email" }
        ],
        "selectActions": [
          { "elementId": "nomadic_node_3", "selectedOption": "Yes" }
        ],
        "checkboxActions": [
          { "elementId": "nomadic_node_4", "checked": true }
        ],
        "uploadResumeElementId": "nomadic_node_5",
        "clickActionElementId": "nomadic_node_6",
        "nextStepType": "submit_application",
        "statusMessage": "Submitting application details"
      }
      \`\`\`
    `;

    const plan = extractJsonFromAiResponse<AIFormActionPlan>(rawAiOutput);
    expect(plan).not.toBeNull();
    expect(plan?.pageState).toBe('application_form');
    expect(plan?.fillActions.length).toBe(2);
    expect(plan?.fillActions[0].value).toBe('Sajal Mishra');
    expect(plan?.selectActions[0].selectedOption).toBe('Yes');
    expect(plan?.uploadResumeElementId).toBe('nomadic_node_5');
    expect(plan?.nextStepType).toBe('submit_application');
  });

  it('extracts raw un-fenced JSON responses', () => {
    const rawJson = JSON.stringify({
      pageState: 'login_required',
      fillActions: [],
      selectActions: [],
      checkboxActions: [],
      statusMessage: 'Portal login is required'
    });

    const plan = extractJsonFromAiResponse<AIFormActionPlan>(rawJson);
    expect(plan).not.toBeNull();
    expect(plan?.pageState).toBe('login_required');
  });

  it('captures DOM and tags elements with data-nomadic-id', async () => {
    const mockPage = {
      screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-image-bytes')),
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn().mockResolvedValue([
        {
          id: 'nomadic_node_0_abc',
          tag: 'input',
          type: 'text',
          name: 'first_name',
          label: 'First Name',
          placeholder: 'First name',
        },
        {
          id: 'nomadic_node_1_xyz',
          tag: 'input',
          type: 'email',
          name: 'email',
          label: 'Email',
          placeholder: 'email@domain.com',
        }
      ])
    } as any;

    const capture = await capturePageVisionAndDOM(mockPage);
    expect(capture).toBeDefined();
    expect(capture.screenshotBase64).toBeDefined();
    expect(capture.elements.length).toBe(2);
    expect(capture.elements[0].id).toBe('nomadic_node_0_abc');
    expect(capture.elements[0].name).toBe('first_name');
  });

  it('executes nomadic fill on elements found by data-nomadic-id', async () => {
    const mockElement = {
      isVisible: vi.fn().mockResolvedValue(true),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      dispatchEvent: vi.fn().mockResolvedValue(undefined),
    };

    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      $: vi.fn().mockResolvedValue(mockElement),
    } as any;

    const ok = await executeNomadicFill(mockPage, 'nomadic_node_123', 'John Doe');
    expect(ok).toBe(true);
    expect(mockElement.fill).toHaveBeenCalledWith('John Doe');
  });

  it('executes nomadic click on submit buttons found by data-nomadic-id', async () => {
    const mockButton = {
      isVisible: vi.fn().mockResolvedValue(true),
      isEnabled: vi.fn().mockResolvedValue(true),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
    };

    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      $: vi.fn().mockResolvedValue(mockButton),
    } as any;

    const ok = await executeNomadicClick(mockPage, 'nomadic_btn_submit');
    expect(ok).toBe(true);
    expect(mockButton.click).toHaveBeenCalled();
  });

});
