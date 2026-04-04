export const mockDelay = (ms = 300): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
