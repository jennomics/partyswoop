import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties } from '@/lib/schema';
import { scanFridgePhotos } from '@/lib/ai';
import { checkRateLimit } from '@/lib/rateLimit';
import { eq } from 'drizzle-orm';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hostCode: string }> }
) {
  try {
    const { hostCode } = await params;
    const db = getDb();

    const party = await db.query.parties.findFirst({
      where: eq(parties.hostCode, hostCode),
      columns: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > new Date(party.expiresAt)) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    // Rate limit: 3 scans per party (lifetime, using a long window)
    const rateLimitResult = await checkRateLimit(db, `fridge-scan:${party.id}`, 86_400_000, 3);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Scan limit reached for this party. Please add drinks manually.' },
        { status: 429 }
      );
    }

    // Check for API key early
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Photo scanning is not configured. Please add drinks manually.', fallback: true },
        { status: 200 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('images');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required.' },
        { status: 400 }
      );
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Maximum of 5 images allowed.' },
        { status: 400 }
      );
    }

    // Convert files to buffers with per-file size and MIME type validation
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
    const imageBuffers: Buffer[] = [];
    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Invalid file format.' },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid image type. Only JPEG, PNG, and WebP are accepted.' },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Each image must be under 5MB. Please resize or compress your photos and try again.' },
          { status: 413 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      imageBuffers.push(Buffer.from(arrayBuffer));
    }

    // Call AI scan - image data is discarded after this call
    const result = await scanFridgePhotos(imageBuffers);

    // Explicitly clear image buffers
    imageBuffers.length = 0;

    if ('error' in result) {
      return NextResponse.json({ error: result.error, fallback: true }, { status: 200 });
    }

    // Never auto-publish - just return the detected drinks
    return NextResponse.json({ drinks: result.drinks });
  } catch (error) {
    console.error('Fridge scan failed:', error);
    return NextResponse.json(
      { error: 'Could not identify drinks from the photos. Please add drinks manually.', fallback: true },
      { status: 200 }
    );
  }
}
