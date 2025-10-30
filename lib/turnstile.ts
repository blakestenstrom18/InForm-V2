/**
 * Cloudflare Turnstile CAPTCHA validation
 * For development, returns true if TURNSTILE_SECRET_KEY is not set
 */

export async function validateTurnstile(
  token: string,
  remoteip?: string
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If no secret key is configured, allow in development
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Turnstile validation skipped (no secret key configured)');
      return true;
    }
    // In production, fail if not configured
    return false;
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile validation error:', error);
    return false;
  }
}

