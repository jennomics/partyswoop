import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanFridgePhotos } from '../ai';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('scanFridgePhotos', () => {
  const testImage = Buffer.from('fake-image-data');

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns friendly error when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      error: 'Photo scanning is not configured. Please add drinks manually.',
    });
  });

  it('returns friendly error when API call fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      error: 'Could not identify drinks from the photos. Please add drinks manually.',
    });
  });

  it('returns friendly error when response has no content', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      error: 'Could not identify drinks from the photos. Please add drinks manually.',
    });
  });

  it('returns friendly error when response is not valid JSON array', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'I cannot identify any drinks.' } }] }),
    });
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      error: 'Could not identify drinks from the photos. Please add drinks manually.',
    });
  });

  it('returns friendly error when parsed array is empty', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '[]' } }] }),
    });
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      error: 'Could not identify drinks from the photos. Please add drinks manually.',
    });
  });

  it('returns friendly error when fetch throws network error', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      error: 'Could not identify drinks from the photos. Please add drinks manually.',
    });
  });

  it('returns drinks array on successful parse', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '["Coca-Cola", "Bud Light", "La Croix Lime"]' } }],
      }),
    });
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      drinks: ['Coca-Cola', 'Bud Light', 'La Croix Lime'],
    });
  });

  it('filters out invalid entries from parsed array', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '["Coca-Cola", 42, "", "  ", "Sprite"]' } }],
      }),
    });
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      drinks: ['Coca-Cola', 'Sprite'],
    });
  });

  it('trims whitespace from drink names', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '["  Coca-Cola  ", " Bud Light "]' } }],
      }),
    });
    const result = await scanFridgePhotos([testImage]);
    expect(result).toEqual({
      drinks: ['Coca-Cola', 'Bud Light'],
    });
  });
});
