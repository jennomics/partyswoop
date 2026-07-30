/**
 * Scan fridge/cooler photos using OpenAI Vision API (GPT-4o-mini).
 * Uses direct fetch - no SDK dependency needed.
 */
export async function scanFridgePhotos(
  images: Buffer[]
): Promise<{ drinks: string[] } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      error: 'Photo scanning is not configured. Please add drinks manually.',
    };
  }

  try {
    const imageContent = images.map((buffer) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/jpeg;base64,${buffer.toString('base64')}`,
        detail: 'low' as const,
      },
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Look at these photos of a fridge or cooler. Identify all visible drink names/brands. Return ONLY a JSON array of drink name strings, e.g. ["Coca-Cola", "Bud Light", "La Croix Lime"]. If you cannot identify any drinks, return an empty array [].',
              },
              ...imageContent,
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return {
        error: 'Could not identify drinks from the photos. Please add drinks manually.',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        error: 'Could not identify drinks from the photos. Please add drinks manually.',
      };
    }

    // Try to parse the JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        error: 'Could not identify drinks from the photos. Please add drinks manually.',
      };
    }

    const drinks: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(drinks) || drinks.length === 0) {
      return {
        error: 'Could not identify drinks from the photos. Please add drinks manually.',
      };
    }

    // Filter to only valid strings
    const validDrinks = drinks
      .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      .map((d) => d.trim());

    if (validDrinks.length === 0) {
      return {
        error: 'Could not identify drinks from the photos. Please add drinks manually.',
      };
    }

    return { drinks: validDrinks };
  } catch {
    return {
      error: 'Could not identify drinks from the photos. Please add drinks manually.',
    };
  }
}
