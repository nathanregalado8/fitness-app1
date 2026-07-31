/**
 * LAYER 2 — backend AI proxy (spec Phase 4).
 *
 * The preferred path: ANTHROPIC_API_KEY lives here, on the server, and never
 * reaches the browser. The protocol itself (tools, prompt, validation) is
 * shared with the client fallback via lib/aiProtocol.js.
 *
 * Runtime: Node (Vercel serverless function, or the dev bridge in
 * vite.config.js — both call the default export with (req, res)).
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  MAX_PAYLOAD_BYTES,
  SIGNALS_SCHEMA,
  allowedExerciseIds,
  buildRequest,
  extractToolInput,
  messagesBody,
  validateFor,
} from '../src/lib/aiProtocol.js';

/**
 * One Messages API call with the tool forced.
 *
 * Sonnet 5 runs adaptive thinking by default, which is what we want for a
 * judgment call. If a deployment target rejects forced tool_choice alongside
 * thinking (Bedrock requires thinking disabled for forced tool use), retry
 * once with thinking off rather than failing the request.
 */
async function callClaude(client, spec) {
  const base = messagesBody(spec);

  try {
    return await client.messages.create(base);
  } catch (err) {
    const msg = String(err?.message ?? '');
    const retryable = err?.status === 400 && /thinking|tool_choice/i.test(msg);
    if (!retryable) throw err;
    return client.messages.create({ ...base, thinking: { type: 'disabled' } });
  }
}

// ------------------------------------------------------------------- handler

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { code: 'method_not_allowed' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: {
        code: 'missing_api_key',
        message:
          'ANTHROPIC_API_KEY is not set on the server. Add it as an environment variable ' +
          '(and as a GitHub repo secret for CI). The app works fully without it — only the ' +
          'AI coach is disabled.',
      },
    });
  }

  const { action, payload } = req.body ?? {};
  const spec = buildRequest(action, payload ?? {});
  if (!spec) {
    return res.status(400).json({ ok: false, error: { code: 'unknown_action', message: String(action) } });
  }

  if (JSON.stringify(payload ?? {}).length > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ ok: false, error: { code: 'payload_too_large' } });
  }
  if (payload?.signals?.schema !== SIGNALS_SCHEMA) {
    return res.status(400).json({ ok: false, error: { code: 'bad_signals_schema' } });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await callClaude(client, spec);

    if (message.stop_reason === 'refusal') {
      return res.status(200).json({
        ok: false,
        error: { code: 'refusal', message: 'The model declined this request.' },
      });
    }

    const input = extractToolInput(message, spec.tool.name);
    if (!input) {
      return res.status(502).json({ ok: false, error: { code: 'no_tool_use' } });
    }

    const data = validateFor(action, input, allowedExerciseIds(action, payload));

    return res.status(200).json({
      ok: true,
      action,
      model: message.model,
      usage: {
        input_tokens: message.usage?.input_tokens ?? null,
        output_tokens: message.usage?.output_tokens ?? null,
      },
      data,
    });
  } catch (err) {
    const status = Number(err?.status) || 500;
    // Never echo the upstream error body — it can contain request context.
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      error: {
        code: err?.type ?? 'upstream_error',
        message: status === 429 ? 'Rate limited by the Anthropic API. Try again shortly.' : 'AI request failed.',
      },
    });
  }
}
