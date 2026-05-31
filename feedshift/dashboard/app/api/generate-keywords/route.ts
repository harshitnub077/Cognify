import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Proxy request to the backend Node.js server
    const backendResponse = await fetch(`${BACKEND_URL}/profile/generate-keywords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: session.user.id,
        interests: body.interests
      }),
    })

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`)
    }

    const result = await backendResponse.json()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error proxying generate-keywords request:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
