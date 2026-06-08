import { humanizeError } from '@/lib/orpc-error';

describe('humanizeError', () => {
  it('maps a network failure to a friendly message', () => {
    const msg = humanizeError(new TypeError('Network request failed'));
    expect(msg).toBe("Can't reach the server. Check your connection.");
  });

  it('passes through a known oRPC error message', () => {
    const msg = humanizeError({ message: 'not your theme' });
    expect(msg).toBe('not your theme');
  });

  it('falls back for unknown shapes', () => {
    const msg = humanizeError(null);
    expect(msg).toBe('Something went wrong. Please try again.');
  });
});
