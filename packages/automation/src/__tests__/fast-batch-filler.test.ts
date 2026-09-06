import { describe, it, expect, vi } from 'vitest';
import { executeInstantBatchFormFill } from '../fast-batch-filler.js';
import type { MasterProfile } from '../auto-apply-engine.js';

describe('Instant In-Memory Batch Form Filler (< 15ms)', () => {
  it('executes batch fill and counts text, radio groups, and checkboxes', async () => {
    const mockPage = {
      frames: vi.fn().mockReturnValue([]),
      evaluate: vi.fn().mockResolvedValue({
        filled: 4,
        radios: 3,
        selects: 1,
        checkboxes: 1,
        hasSubmit: true,
      }),
      $$: vi.fn().mockResolvedValue([]),
    } as any;

    const mockProfile: MasterProfile = {
      firstName: 'Sajal',
      lastName: 'Mishra',
      email: 'sajal@nomadic.app',
      phone: '+91 9493833632',
    };

    const result = await executeInstantBatchFormFill(mockPage, mockProfile);
    expect(result.filledCount).toBe(9);
    expect(result.radiosCount).toBe(3);
    expect(result.selectsCount).toBe(1);
    expect(result.checkboxesCount).toBe(1);
    expect(result.submitFound).toBe(true);
  });
});
