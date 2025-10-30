import { NextResponse } from 'next/server';
import { lucia, validateRequest } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const { session } = await validateRequest();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Invalidate session
    await lucia.invalidateSession(session.id);

    // Create blank session cookie
    const sessionCookie = lucia.createBlankSessionCookie();
    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

