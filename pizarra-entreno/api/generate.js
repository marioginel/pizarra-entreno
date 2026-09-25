// Función de Vercel: recibe el prompt de la app, comprueba que eres tú y pide la sesión a Gemini.
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY       tu clave de Google AI Studio (obligatoria)
//   FIREBASE_PROJECT_ID  el ID de tu proyecto de Firebase (obligatoria)
//   ALLOWED_EMAILS       tu correo (o varios separados por comas) (recomendada)
//   GEMINI_MODEL         modelo a usar (opcional)
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const DEFAULT_MODEL = 'gemini-3.6-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!projectId || !apiKey) return res.status(500).json({ error: 'Faltan variables de entorno' });

  // 1. ¿Quién llama? Verificamos el token de Firebase Authentication
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    }));
  } catch {
    return res.status(401).json({ error: 'Sesión no válida' });
  }
  const allowed = (process.env.ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(String(payload.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'Usuario no autorizado' });
  }

  // 2. Pedimos la sesión a Gemini en formato JSON
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const prompt = String(body.prompt || '').slice(0, 60000);
  if (!prompt) return res.status(400).json({ error: 'Falta el prompt' });

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
      }),
    });
  } catch (e) {
    console.error('No se pudo contactar con Gemini', e);
    return res.status(502).json({ error: 'Gemini no responde' });
  }
  if (!r.ok) {
    console.error('Gemini', r.status, (await r.text()).slice(0, 800));
    return res.status(r.status === 429 ? 429 : 502).json({ error: 'Error de Gemini' });
  }

  const data = await r.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  let json;
  try { json = JSON.parse(text); }
  catch {
    const m = text.match(/[\[{][\s\S]*[\]}]/);
    try { json = JSON.parse(m ? m[0] : ''); }
    catch { console.error('Respuesta no JSON', text.slice(0, 500)); return res.status(502).json({ error: 'Respuesta no válida' }); }
  }
  return res.status(200).json(json);
}
