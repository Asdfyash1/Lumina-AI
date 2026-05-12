import 'dotenv/config';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error(
      'NVIDIA_API_KEY not set.\n\n' +
      'Get a FREE key at: https://build.nvidia.com/\n' +
      '1. Sign up / log in\n' +
      '2. Go to any model page\n' +
      '3. Click "Get API Key"\n' +
      '4. Add to backend/.env: NVIDIA_API_KEY=nvapi-...'
    );
  }
  return key;
}

export async function* streamChatCompletion(
  messages: { role: string; content: string }[],
  model = 'nvidia/llama-3.1-nemotron-70b-instruct'
): AsyncGenerator<string> {
  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
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
    const error = await response.text();
    throw new Error(`NVIDIA Chat API error (${response.status}): ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

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
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {
        // skip malformed
      }
    }
  }
}

export async function createEmbeddings(
  texts: string[],
  model = 'nvidia/nv-embedqa-e5-v5'
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  const batchSize = 10;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model,
        input: batch,
        input_type: 'passage',
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NVIDIA Embeddings API error (${response.status}): ${error}`);
    }

    const result = await response.json() as { data: { embedding: number[]; index: number }[] };
    const embeddings = result.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

export async function ocrImage(
  imageBase64: string,
  mimeType: string,
  model = 'nvidia/neva-22b'
): Promise<string> {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extract and describe all text, diagrams, and visual content from this image. Preserve the structure and meaning.',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
          },
        },
      ],
    },
  ];

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NVIDIA OCR API error (${response.status}): ${error}`);
  }

  const result = await response.json() as { choices: { message: { content: string } }[] };
  return result.choices?.[0]?.message?.content || '';
}
