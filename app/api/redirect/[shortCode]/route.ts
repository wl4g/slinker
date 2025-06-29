import { NextRequest, NextResponse } from 'next/server'
import { getShortenedUrl, incrementClicks, initializeDatabase } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  const { shortCode } = params

  try {
    // Initialize database
    await initializeDatabase()

    // Find the URL in database
    const urlData = await getShortenedUrl(shortCode)

    if (!urlData) {
      return NextResponse.json(
        { error: 'Short URL not found' },
        { status: 404 }
      )
    }

    // Increment click counter
    await incrementClicks(shortCode)

    // Return redirect response
    return NextResponse.redirect(urlData.original_url, { status: 302 })
  } catch (error) {
    console.error('Error redirecting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}