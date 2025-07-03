import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { 
  initializeDatabase, 
  createShortenedUrl, 
  shortCodeExists, 
  getAllShortenedUrls,
  checkDatabaseConnection,
  deleteShortenedUrlByUser
} from '@/lib/db'
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  try {
    // Initialize database
    await initializeDatabase()

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Generate unique short code
    let shortCode: string
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    do {
      shortCode = nanoid(8)
      isUnique = !(await shortCodeExists(shortCode))
      attempts++
    } while (!isUnique && attempts < maxAttempts)

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique short code' },
        { status: 500 }
      )
    }

    // Insert into database
    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 401 }
      );
    }
    const data = await createShortenedUrl(url, shortCode, userEmail)

    return NextResponse.json({
      id: data.id.toString(),
      originalUrl: data.original_url,
      shortCode: data.short_code,
      createdAt: data.created_at,
      clicks: data.clicks
    })
  } catch (error) {
    console.error('Error shortening URL:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json(
      { error: 'userEmail is required' },
      { status: 401 }
    );
  }
  try {
    // Check database connection
    const isConnected = await checkDatabaseConnection()
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Initialize database
    await initializeDatabase()

    const data = await getAllShortenedUrls(userEmail, 50)

    const formattedData = data.map(item => ({
      id: item.id.toString(),
      originalUrl: item.original_url,
      shortCode: item.short_code,
      createdAt: item.created_at,
      clicks: item.clicks,
      userEmail: item.userEmail
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Error fetching URLs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json(
      { error: 'userEmail is required' },
      { status: 401 }
    );
  }
  try {
    const { shortCode } = await request.json();
    if (!shortCode) {
      return NextResponse.json(
        { error: 'shortCode is required' },
        { status: 400 }
      );
    }
    await initializeDatabase();
    // 删除操作
    const deleted = await deleteShortenedUrlByUser(shortCode, userEmail);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Not found or not authorized' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}