export async function POST() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'instructor_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'
    }
  });
}
