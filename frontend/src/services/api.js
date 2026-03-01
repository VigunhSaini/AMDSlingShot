/**
 * Call the backend analysis endpoint.
 * Uses relative URL so Vite's dev proxy forwards to Flask on :5000.
 * @param {string} prUrl — Full GitHub PR URL
 * @returns {Promise<object>} — Unified analysis result
 */
export async function analyzePR(prUrl) {
  const res = await fetch("/api/analyze", {
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
