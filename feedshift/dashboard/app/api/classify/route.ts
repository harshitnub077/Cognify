import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Validate Auth Token using Supabase session
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    
    // Check Rate Limits: Max 1000 per user per day
    const today = new Date().toISOString().split('T')[0]
    
    // Fallback to 0 if the table doesn't exist or isn't seeded yet
    const { data: usage } = await supabase
      .from('api_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    let currentCount = usage?.count || 0

    if (currentCount >= 1000) {
      return NextResponse.json({ error: 'Rate limit exceeded. Maximum 1000 classifications per day.' }, { status: 429 })
    }

    // Parse incoming request from extension
    const body = await request.json()

    // Proxy request to the backend Node.js server
    const backendResponse = await fetch(`${BACKEND_URL}/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`)
    }

    const result = await backendResponse.json()

    // Increment usage asynchronously (fire and forget)
    supabase
      .from('api_usage')
      .upsert({ user_id: userId, date: today, count: currentCount + 1 }, { onConflict: 'user_id,date' })
      .then(({ error }) => {
        if (error) console.error('Failed to increment api usage:', error)
      })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error proxying classify request:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
