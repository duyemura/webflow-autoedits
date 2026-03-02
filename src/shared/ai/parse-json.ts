/**
 * Extract JSON from an AI response that may contain surrounding text.
 * Handles:
 * - Pure JSON responses
 * - JSON wrapped in markdown code fences
 * - JSON mixed with explanatory text (extracts the largest JSON object)
 */
export function extractJSON<T = unknown>(text: string): T {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Continue to extraction
  }

  // Try extracting from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Find the largest JSON object in the text
  // Look for { ... } blocks, trying from each { character
  let bestResult: T | null = null;
  let bestLength = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;

    // Find matching closing brace by counting depth
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let j = i; j < text.length; j++) {
      const ch = text[j];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === "\\" && inString) {
        escape = true;
        continue;
      }

      if (ch === '"' && !escape) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") depth++;
      if (ch === "}") depth--;

      if (depth === 0) {
        const candidate = text.slice(i, j + 1);
        if (candidate.length > bestLength) {
          try {
            const parsed = JSON.parse(candidate);
            bestResult = parsed;
            bestLength = candidate.length;
          } catch {
            // Not valid JSON, keep looking
          }
        }
        break;
      }
    }
  }

  if (bestResult !== null) {
    return bestResult;
  }

  throw new Error(`Could not extract JSON from AI response: ${text.slice(0, 200)}...`);
}
