import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { scanFridgePhotos } from '@/lib/ai';

export async function POST(
  request: Request,
  { params }: { params: { hostCode: string } }
) {
  try {
    const party = await prisma.party.findUnique({
      where: { hostCode: params.hostCode },
      select: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
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

    // Convert files to buffers
    const imageBuffers: Buffer[] = [];
    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Invalid file format.' },
          { status: 400 }
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
    const message = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json(
      { error: 'Could not identify drinks from the photos. Please add drinks manually.', fallback: true },
      { status: 200 }
    );
  }
}
