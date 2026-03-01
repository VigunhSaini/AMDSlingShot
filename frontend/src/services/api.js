// Get the API base URL from environment variables
// In development, it will use Vite's proxy (/api -> localhost:5000)
// In production, it will use the VITE_API_URL environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Call the backend analysis endpoint.
 * Uses relative URL in dev (Vite proxy) or absolute URL in production.
 * @param {string} prUrl — Full GitHub PR URL
 * @returns {Promise<object>} — Unified analysis result
 */
export async function analyzePR(prUrl) {
  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pr_url: prUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Analysis failed (${res.status})`);
  }

  return res.json();
}
