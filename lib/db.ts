import { sql } from '@vercel/postgres'

export interface ShortenedUrl {
  id: string
  original_url: string
  short_code: string
  created_at: string
  clicks: number
}

// In-memory storage for local development
let inMemoryUrls: ShortenedUrl[] = []
let nextId = 1

// Check if we're in production with Vercel Postgres
function isVercelPostgresAvailable() {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL)
}

// Initialize database table if it doesn't exist (Vercel Postgres only)
export async function initializeDatabase() {
  if (!isVercelPostgresAvailable()) {
    console.log('📝 Using in-memory storage for local development')
    return true
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS shortened_urls (
        id SERIAL PRIMARY KEY,
        original_url TEXT NOT NULL,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        clicks INTEGER DEFAULT 0
      )
    `
    
    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shortened_urls_short_code 
      ON shortened_urls(short_code)
    `
    
    console.log('✅ Database initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    return false
  }
}

// Check if database connection is available
export async function checkDatabaseConnection() {
  if (!isVercelPostgresAvailable()) {
    return true // In-memory storage is always available
  }

  try {
    await sql`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Database connection error:', error)
    return false
  }
}

// Normalize URL to ensure it has a proper protocol
function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  
  // If it already has a protocol, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  
  // Add https:// by default
  return 'https://' + trimmed
}

// Create a new shortened URL
export async function createShortenedUrl(originalUrl: string, shortCode: string) {
  // Normalize URL - ensure it has a protocol
  const normalizedUrl = normalizeUrl(originalUrl)

  if (!isVercelPostgresAvailable()) {
    // Use in-memory storage
    const newUrl: ShortenedUrl = {
      id: nextId.toString(),
      original_url: normalizedUrl,
      short_code: shortCode,
      created_at: new Date().toISOString(),
      clicks: 0
    }
    inMemoryUrls.unshift(newUrl)
    nextId++
    console.log('✅ Created short URL in memory:', {
      shortCode,
      originalUrl: normalizedUrl,
      id: newUrl.id
    })
    return newUrl
  }

  try {
    const result = await sql`
      INSERT INTO shortened_urls (original_url, short_code, clicks)
      VALUES (${normalizedUrl}, ${shortCode}, 0)
      RETURNING *
    `
    console.log('✅ Created short URL in database:', {
      shortCode,
      originalUrl: normalizedUrl,
      id: result.rows[0].id
    })
    return result.rows[0] as ShortenedUrl
  } catch (error) {
    console.error('❌ Error creating shortened URL:', error)
    throw error
  }
}

// Get shortened URL by short code
export async function getShortenedUrl(shortCode: string) {
  if (!isVercelPostgresAvailable()) {
    // Use in-memory storage
    const found = inMemoryUrls.find(url => url.short_code === shortCode)
    console.log('🔍 Looking for short code in memory:', shortCode, found ? '✅ Found' : '❌ Not found')
    return found
  }

  try {
    const result = await sql`
      SELECT * FROM shortened_urls 
      WHERE short_code = ${shortCode}
      LIMIT 1
    `
    const found = result.rows[0] as ShortenedUrl | undefined
    console.log('🔍 Looking for short code in database:', shortCode, found ? '✅ Found' : '❌ Not found')
    return found
  } catch (error) {
    console.error('❌ Error getting shortened URL:', error)
    throw error
  }
}

// Check if short code exists
export async function shortCodeExists(shortCode: string) {
  if (!isVercelPostgresAvailable()) {
    // Use in-memory storage
    return inMemoryUrls.some(url => url.short_code === shortCode)
  }

  try {
    const result = await sql`
      SELECT 1 FROM shortened_urls 
      WHERE short_code = ${shortCode}
      LIMIT 1
    `
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Error checking short code:', error)
    return false
  }
}

// Increment click counter
export async function incrementClicks(shortCode: string) {
  if (!isVercelPostgresAvailable()) {
    // Use in-memory storage
    const url = inMemoryUrls.find(url => url.short_code === shortCode)
    if (url) {
      url.clicks++
      console.log('📊 Incremented clicks for:', shortCode, 'New count:', url.clicks)
    }
    return
  }

  try {
    await sql`
      UPDATE shortened_urls 
      SET clicks = clicks + 1 
      WHERE short_code = ${shortCode}
    `
    console.log('📊 Incremented clicks in database for:', shortCode)
  } catch (error) {
    console.error('❌ Error incrementing clicks:', error)
  }
}

// Get all shortened URLs (latest first)
export async function getAllShortenedUrls(limit: number = 50) {
  if (!isVercelPostgresAvailable()) {
    // Use in-memory storage
    return inMemoryUrls.slice(0, limit)
  }

  try {
    const result = await sql`
      SELECT * FROM shortened_urls 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `
    return result.rows as ShortenedUrl[]
  } catch (error) {
    console.error('❌ Error getting all shortened URLs:', error)
    return []
  }
}