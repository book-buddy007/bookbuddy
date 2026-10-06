#!/usr/bin/env node
/**
 * Checks the AI settings against the real services, without starting the app:
 *   node scripts/check-ai.js            (reads the environment; `npm run check:ai` loads .env first)
 *
 * It embeds one short sentence, asks the chat model for one word, and looks at Qdrant, so it
 * costs a fraction of a cent. It never prints the API key, and it changes nothing in Qdrant.
 * Exit code 0 only when everything needed for Varta works.
 */
const env = process.env;
const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const embedModel = env.OPENAI_EMBED_MODEL || 'text-embedding-3-large';
const chatModel = env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const dims = Number(env.EMBEDDING_DIMENSIONS || 1024);
const qdrantUrl = (env.QDRANT_URL || 'http://127.0.0.1:6335').replace(/\/+$/, '');
const collection = env.QDRANT_COLLECTION_NAME || 'book_buddy_chunks_v1';

let failed = 0;
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  failed++;
  console.log(`  FAIL  ${msg}`);
};

async function openai(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    throw new Error(`HTTP ${res.status}${e.code ? ` ${e.code}` : ''}: ${e.message || 'no detail'}`);
  }
  return json;
}

(async () => {
  console.log('OpenAI');
  if (!env.OPENAI_API_KEY) {
    bad('OPENAI_API_KEY is not set');
  } else {
    try {
      const body = { model: embedModel, input: ['Opportunity cost is the value of the next best choice.'] };
      if (/^text-embedding-3/.test(embedModel)) body.dimensions = dims;
      const json = await openai('/embeddings', body);
      const width = json.data?.[0]?.embedding?.length;
      width === dims
        ? ok(`embeddings: ${embedModel}, ${width} dimensions`)
        : bad(`embeddings: ${embedModel} returned ${width} dimensions but EMBEDDING_DIMENSIONS is ${dims}`);
    } catch (e) {
      bad(`embeddings (${embedModel}): ${e.message}`);
    }
    try {
      const json = await openai('/chat/completions', {
        model: chatModel,
        messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
        max_tokens: 16,
      });
      ok(`chat: ${chatModel} answered "${(json.choices?.[0]?.message?.content || '').trim().slice(0, 40)}"`);
    } catch (e) {
      bad(`chat (${chatModel}): ${e.message}`);
    }
  }

  console.log('Qdrant');
  try {
    const headers = env.QDRANT_API_KEY ? { 'api-key': env.QDRANT_API_KEY } : {};
    const res = await fetch(`${qdrantUrl}/collections/${encodeURIComponent(collection)}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) {
      ok(`reachable at ${qdrantUrl}; collection "${collection}" does not exist yet (the app creates it on boot)`);
    } else if (!res.ok) {
      bad(`${qdrantUrl} answered HTTP ${res.status}`);
    } else {
      const info = (await res.json()).result;
      const dense = info.config?.params?.vectors?.dense;
      const sparse = info.config?.params?.sparse_vectors?.bm25;
      if (!dense || !sparse) bad(`collection "${collection}" lacks the dense + bm25 vectors; use a new collection name`);
      else if (dense.size !== dims) bad(`collection "${collection}" is ${dense.size}-dimensional, settings say ${dims}`);
      else ok(`collection "${collection}": ${info.points_count ?? 0} passages, ${dense.size}d dense + keyword vectors`);
    }
  } catch (e) {
    bad(`cannot reach Qdrant at ${qdrantUrl}: ${e.message}`);
  }

  const sharedUrl = (env.SHARED_QDRANT_URL || '').replace(/\/+$/, '');
  if (sharedUrl) {
    console.log('Shared library (read-only)');
    const sharedCollection = env.SHARED_QDRANT_COLLECTION || 'trio_content_v1_openai3072';
    const sharedDims = Number(env.SHARED_EMBEDDING_DIMENSIONS || 3072);
    const headers = env.SHARED_QDRANT_API_KEY ? { 'api-key': env.SHARED_QDRANT_API_KEY } : {};
    try {
      const res = await fetch(`${sharedUrl}/collections/${encodeURIComponent(sharedCollection)}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404) bad(`collection "${sharedCollection}" does not exist at ${sharedUrl}`);
      else if (!res.ok) bad(`${sharedUrl} answered HTTP ${res.status} (check SHARED_QDRANT_API_KEY)`);
      else {
        const info = (await res.json()).result;
        const dense = info.config?.params?.vectors?.dense;
        const sparse = info.config?.params?.sparse_vectors?.bm25;
        if (!dense || !sparse) bad(`collection "${sharedCollection}" lacks the dense + bm25 vectors`);
        else if (dense.size !== sharedDims) bad(`collection is ${dense.size}-dimensional, SHARED_EMBEDDING_DIMENSIONS says ${sharedDims}`);
        else ok(`collection "${sharedCollection}": ${info.points_count ?? 0} passages, ${dense.size}d`);
      }
      // Book Buddy must hold a READ-ONLY key. Try a harmless delete (of an id that does not
      // exist) that a read-only key must refuse.
      if (env.SHARED_QDRANT_API_KEY) {
        const probe = await fetch(`${sharedUrl}/collections/${encodeURIComponent(sharedCollection)}/points/delete?wait=false`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: ['00000000-0000-4000-8000-000000000000'] }),
          signal: AbortSignal.timeout(5000),
        });
        probe.status === 401 || probe.status === 403
          ? ok('the key is read-only (a write was refused)')
          : bad(`the key can WRITE to the shared library (HTTP ${probe.status}); use the read-only key`);
      } else {
        bad('SHARED_QDRANT_API_KEY is not set: the shared library is open to writes from this network');
      }
    } catch (e) {
      bad(`cannot reach the shared library at ${sharedUrl}: ${e.message}`);
    }
  }

  console.log(failed ? `\n${failed} problem(s) found.` : '\nAll good: Varta can index and answer.');
  process.exit(failed ? 1 : 0);
})();
