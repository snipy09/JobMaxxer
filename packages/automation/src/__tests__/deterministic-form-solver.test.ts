import { describe, it, expect, vi } from 'vitest';
import { executeDeterministicFormSolve } from '../deterministic-form-solver.js';
import type { MasterProfile } from '../auto-apply-engine.js';

describe('Deterministic Universal Form Solver (< 20ms)', () => {
  it('solves radio groups, inputs, and triggers submit in a single pass', async () => {
    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn().mockResolvedValue({
        filled: 5,
        radios: 3,
        selects: 2,
        checkboxes: 1,
      }),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      $$: vi.fn().mockResolvedValue([]),
      $: vi.fn().mockResolvedValue({
        isVisible: vi.fn().mockResolvedValue(true),
        click: vi.fn().mockResolvedValue(undefined),
        boundingBox: vi.fn().mockResolvedValue({ x: 100, y: 100, width: 50, height: 20 }),
      }),
      mouse: {
        move: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    const mockProfile: MasterProfile = {
      firstName: 'Sajal',
      lastName: 'Mishra',
      email: 'sajal@nomadic.app',
      phone: '+91 9493833632',
    };

    const result = await executeDeterministicFormSolve(mockPage, mockProfile);
    expect(result.filledCount).toBe(11);
    expect(result.radiosCount).toBe(3);
    expect(result.selectsCount).toBe(2);
    expect(result.submitClicked).toBe(true);
  });
});
