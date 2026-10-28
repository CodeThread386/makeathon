import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// POST /api/subscribe { email } — works as a Vercel function and under server.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  let email;
  try {
    email = String((await readBody(req)).email || '').trim().toLowerCase();
  } catch {
    return send(res, 400, { error: 'Invalid JSON' });
  }
  if (!EMAIL.test(email) || email.length > 254) return send(res, 400, { error: 'Invalid email' });

  try {
    // a repeat sign-up is not an error: the address is already on the list
    await sql`INSERT INTO subscribers (email) VALUES (${email}) ON CONFLICT (email) DO NOTHING`;
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('subscribe failed:', e);
    return send(res, 500, { error: 'Could not save email' });
  }
}
