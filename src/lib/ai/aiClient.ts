export async function callAIEndpoint(endpoint: string, payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = new Error(data.error || `API error: ${response.status}`);
    console.error('API Route Error:', { error: data.error, details: data.details });
    throw error;
  }

  return data;
}
