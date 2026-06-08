const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';
const SITE_URL = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
const SITE_NAME = process.env.APP_NAME?.trim() || 'Cropwise AI';

interface DiseaseResult {
  plant_name: string;
  disease_name: string;
  confidence: string;
  treatment: string;
  prevention?: string;
  severity?: string;
  causes?: string[];
  treatment_steps?: string[];
  additional_info?: string;
}

interface CacheEntry {
  result: DiseaseResult[];
  expiresAt: number;
}

interface OpenRouterMessageContentText {
  type: 'text';
  text: string;
}

interface OpenRouterMessageContentImage {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

const analysisCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function generateCacheKey(base64Images: string[], options: unknown): string {
  return `cache:${base64Images.length}:${base64Images[0]?.slice(0, 1024)}:${JSON.stringify(options)}`;
}

function getCachedResult(key: string): DiseaseResult[] | null {
  const entry = analysisCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    analysisCache.delete(key);
    return null;
  }

  console.log('Using cached disease analysis result');
  return entry.result;
}

function cacheResult(key: string, result: DiseaseResult[]) {
  analysisCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (analysisCache.size > 100) {
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) analysisCache.delete(firstKey);
  }
}

function normalizeConfidence(value: unknown): string {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    if (normalized === 'healthy') {
      return 'Healthy';
    }
  }

  return 'Medium';
}

function normalizeSeverity(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (['mild', 'moderate', 'severe', 'unknown'].includes(normalized)) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return undefined;
}

function extractJsonBlock(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return trimmed;
}

function normalizeSingleResult(raw: unknown, index: number): DiseaseResult {
  const parsed = (raw ?? {}) as Partial<DiseaseResult>;
  const causes = Array.isArray(parsed.causes)
    ? parsed.causes.filter((cause): cause is string => typeof cause === 'string' && cause.trim().length > 0).slice(0, 5)
    : [];
  const treatmentSteps = Array.isArray(parsed.treatment_steps)
    ? parsed.treatment_steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0).slice(0, 6)
    : [];

  return {
    plant_name:
      typeof parsed.plant_name === 'string' && parsed.plant_name.trim()
        ? parsed.plant_name.trim()
        : `Plant ${index + 1}`,
    disease_name:
      typeof parsed.disease_name === 'string' && parsed.disease_name.trim()
        ? parsed.disease_name.trim()
        : 'Unknown plant condition',
    confidence: normalizeConfidence(parsed.confidence),
    treatment:
      typeof parsed.treatment === 'string' && parsed.treatment.trim()
        ? parsed.treatment.trim()
        : 'Inspect the plant closely, isolate affected leaves, and consult a local agricultural expert for confirmation.',
    prevention:
      typeof parsed.prevention === 'string' && parsed.prevention.trim() ? parsed.prevention.trim() : undefined,
    severity: normalizeSeverity(parsed.severity),
    causes: causes.length > 0 ? causes : undefined,
    treatment_steps: treatmentSteps.length > 0 ? treatmentSteps : undefined,
    additional_info:
      typeof parsed.additional_info === 'string' && parsed.additional_info.trim()
        ? parsed.additional_info.trim()
        : undefined,
  };
}

function normalizeResults(raw: unknown, imageCount: number): DiseaseResult[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((result, index) => normalizeSingleResult(result, index));
  }

  if (raw && typeof raw === 'object') {
    return [normalizeSingleResult(raw, 0)];
  }

  return Array.from({ length: imageCount }, (_, index) =>
    normalizeSingleResult(
      {
        plant_name: `Plant ${index + 1}`,
        disease_name: 'Unknown plant condition',
        confidence: 'Low',
        treatment: 'Try uploading a clearer photo of the damaged leaf or affected part of the plant.',
        severity: 'Unknown',
        additional_info: 'The AI response could not be parsed into structured disease results.',
      },
      index
    )
  );
}

function buildPrompt(imageCount: number, options: { enhanced?: boolean; language?: string }): string {
  return `You are an expert plant pathologist. Analyze ${imageCount} plant image(s) and identify likely diseases or stress conditions.

Requirements:
- Focus on visible plant disease symptoms, pests, nutrient deficiencies, or healthy status.
- If uncertain, say so clearly in the confidence and additional_info fields.
- Keep treatment practical and concise for farmers.
- If an image appears healthy, say the disease_name is "Healthy plant".
- Return ONLY valid JSON.

Return this exact shape:
[
  {
    "plant_name": "string",
    "disease_name": "string",
    "confidence": "High | Medium | Low | Healthy",
    "treatment": "string",
    "prevention": "string",
    "severity": "Mild | Moderate | Severe | Unknown",
    "causes": ["string"],
    "treatment_steps": ["string"],
    "additional_info": "string"
  }
]

Context:
- Images enhanced before upload: ${options.enhanced ? 'yes' : 'no'}
- Preferred language: ${options.language || 'English'}`;
}

async function analyzeWithOpenRouter(
  base64Images: string[],
  options: { enhanced?: boolean; language?: string } = {}
): Promise<DiseaseResult[]> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing in backend environment variables.');
  }

  const content: Array<OpenRouterMessageContentText | OpenRouterMessageContentImage> = [
    {
      type: 'text',
      text: buildPrompt(base64Images.length, options),
    },
    ...base64Images.map((image) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/jpeg;base64,${image}`,
      },
    })),
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': SITE_URL,
      'X-Title': SITE_NAME,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as { choices?: OpenRouterChoice[] };
  const aiContent = data.choices?.[0]?.message?.content;
  if (!aiContent) {
    throw new Error('OpenRouter returned no analysis content.');
  }

  const parsed = JSON.parse(extractJsonBlock(aiContent));
  return normalizeResults(parsed, base64Images.length);
}

export const analyzePlantDisease = async (
  imageBuffer: Buffer | Buffer[],
  options: { enhanced?: boolean; language?: string } = {}
): Promise<DiseaseResult[]> => {
  const images = Array.isArray(imageBuffer) ? imageBuffer : [imageBuffer];
  const base64Images = images.map((buffer) => buffer.toString('base64'));

  if (images.length === 1) {
    const cacheKey = generateCacheKey(base64Images, options);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;
  }

  try {
    const results = await analyzeWithOpenRouter(base64Images, options);

    if (images.length === 1) {
      const cacheKey = generateCacheKey(base64Images, options);
      cacheResult(cacheKey, results);
    }

    return results;
  } catch (error) {
    console.error('OpenRouter disease analysis failed:', error);
    return [
      {
        plant_name: 'Analysis Failed',
        disease_name: 'OpenRouter AI Error',
        confidence: 'Low',
        treatment: 'Try again with a clearer image focused on the affected leaves or stems, then confirm with a local agricultural expert.',
        prevention: 'Use clear close-up photos, avoid heavy shadows, and capture the most affected plant area.',
        severity: 'Unknown',
        causes: ['The uploaded image may be unclear, incomplete, or difficult for the model to interpret confidently.'],
        treatment_steps: [
          'Retake the photo in bright natural light.',
          'Capture the full leaf and a close-up of the damaged area.',
          'Upload the clearest image and run the analysis again.',
        ],
        additional_info: error instanceof Error ? error.message : 'Unknown OpenRouter error',
      },
    ];
  }
};

export const analyzeMultipleImages = async (
  images: Buffer[],
  options: { enhanced?: boolean; language?: string } = {}
): Promise<DiseaseResult[]> => {
  if (images.length === 0) {
    return [];
  }

  return analyzePlantDisease(images, options);
};
