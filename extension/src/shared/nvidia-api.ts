const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

async function getApiKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('nvidiaApiKey', (data) => {
      if (data.nvidiaApiKey) resolve(data.nvidiaApiKey);
      else reject(new Error('NVIDIA API key not set. Right-click the Lumina AI icon → Options to add your free key.'));
    });
  });
}

export async function streamExplanation(
  messages: { role: string; content: string }[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  model = 'nvidia/llama-3.1-nemotron-70b-instruct'
): Promise<void> {
  let apiKey: string;
  try {
    apiKey = await getApiKey();
  } catch (e) {
    onError((e as Error).message);
    return;
  }

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(`NVIDIA API error (${response.status}): ${errText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError('No response stream'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') { onDone(); return; }

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {
          // skip malformed
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Network error');
  }
}

export async function createEmbeddings(
  texts: string[],
  model = 'nvidia/nv-embedqa-e5-v5'
): Promise<number[][]> {
  const apiKey = await getApiKey();
  const allEmbeddings: number[][] = [];
  const batchSize = 10;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: batch,
        input_type: 'passage',
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embeddings API error (${response.status}): ${errText}`);
    }

    const result = await response.json() as { data: { embedding: number[]; index: number }[] };
    const embeddings = result.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
