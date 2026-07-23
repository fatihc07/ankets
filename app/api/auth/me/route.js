import { getSessionFromCookie } from '@/lib/session';

export async function GET(request) {
  const cookieHeader = request.headers.get('cookie');
  const session = getSessionFromCookie(cookieHeader);

  if (!session) {
    return new Response(JSON.stringify({ error: 'Oturum açılmamış.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true, instructor: session }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
