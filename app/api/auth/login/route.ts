import { NextResponse } from 'next/server';
import { lucia } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LoginSchema } from '@/lib/zod-schemas';
import { verify } from '@node-rs/argon2';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await verify(user.passwordHash, password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create response with JSON body
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
      },
    });
    
    // Set cookie in response headers - extract attributes explicitly for Next.js
    const cookieAttrs = sessionCookie.attributes;
    
    // Build cookie options for Next.js (filter out undefined values)
    const cookieOptions: any = {
      httpOnly: cookieAttrs.httpOnly ?? true,
      secure: cookieAttrs.secure ?? false,
      sameSite: (cookieAttrs.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
      path: cookieAttrs.path ?? '/',
    };
    
    // Only add maxAge or expires if they exist (don't set undefined)
    if (cookieAttrs.maxAge !== undefined) {
      cookieOptions.maxAge = cookieAttrs.maxAge;
    }
    if (cookieAttrs.expires) {
      cookieOptions.expires = cookieAttrs.expires;
    }
    
    response.cookies.set(sessionCookie.name, sessionCookie.value, cookieOptions);

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

