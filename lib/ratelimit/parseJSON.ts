/**
 * Robustly parses JSON from Gemini responses which often include:
 * - ```json ... ``` fences
 * - Single-quoted property names
 * - Trailing commas
 * - Extra text before/after JSON
 * - Unquoted property names
 * - Python-style None/True/False
 */
export function parseGeminiJSON(raw: string): any {
  if (!raw) throw new Error('Empty response from Gemini');

  // Step 1: Extract content from markdown code fences
  let text = raw;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // Step 2: Find the first { or [ and last } or ]
    const firstBrace  = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let start = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      start = Math.min(firstBrace, firstBracket);
    } else {
      start = firstBrace !== -1 ? firstBrace : firstBracket;
    }

    if (start !== -1) {
      const isObj  = text[start] === '{';
      const lastEnd = isObj ? text.lastIndexOf('}') : text.lastIndexOf(']');
      if (lastEnd !== -1) {
        text = text.slice(start, lastEnd + 1);
      }
    }
  }

  // Step 3: Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}

  // Step 4: Fix common Gemini JSON quirks
  let fixed = text
    // Remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, '$1')
    // Replace Python None/True/False
    .replace(/:\s*None\b/g, ': null')
    .replace(/:\s*True\b/g, ': true')
    .replace(/:\s*False\b/g, ': false')
    // Replace single-quoted strings with double-quoted
    .replace(/'/g, '"')
    // Fix unquoted property names (word chars followed by colon)
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Remove comments
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  try {
    return JSON.parse(fixed);
  } catch {}

  // Step 5: Last resort — try to extract key values manually for simple objects
  throw new Error(`Could not parse Gemini JSON response: ${text.slice(0, 200)}`);
}

/**
 * Wraps a Gemini call with robust JSON parsing and a fallback value
 */
export function safeParseGeminiJSON<T>(raw: string, fallback: T): T {
  try {
    return parseGeminiJSON(raw) as T;
  } catch (e) {
    console.error('Gemini JSON parse failed:', e);
    return fallback;
  }
}
