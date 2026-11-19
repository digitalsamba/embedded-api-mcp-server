import { getToolAnnotations } from '../../src/tool-annotations';

describe('getToolAnnotations', () => {
  it('marks ordinary get-/list-/export- tools read-only', () => {
    for (const name of ['get-session-details', 'list-rooms', 'export-chat-messages']) {
      expect(getToolAnnotations(name).readOnlyHint).toBe(true);
    }
  });

  it('does not mark get-session-summary read-only: the first call starts an AI summary job', () => {
    const annotations = getToolAnnotations('get-session-summary');
    expect(annotations.readOnlyHint).toBe(false);
    expect(annotations.idempotentHint).toBe(false);
    expect(annotations.destructiveHint).toBe(false);
  });
});
