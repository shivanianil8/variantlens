import {
  VariantAnnotationResponse,
  ModelMetadataResponse,
  SystemHealth,
  PredictRequest,
  PredictResponse,
} from '../types/variant';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = VITE_API_BASE_URL ? `${VITE_API_BASE_URL.replace(/\/$/, '')}/api` : '/api';

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Failed to fetch health: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBenchmarks(): Promise<VariantAnnotationResponse[]> {
  const res = await fetch(`${API_BASE}/variants/benchmarks`);
  if (!res.ok) {
    throw new Error(`Failed to fetch benchmarks: ${res.statusText}`);
  }
  return res.json();
}

export async function searchVariant(query: string): Promise<VariantAnnotationResponse> {
  const encoded = encodeURIComponent(query.trim());
  const res = await fetch(`${API_BASE}/variants/search?q=${encoded}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Variant search failed');
  }
  return res.json();
}

export async function predictVariant(payload: PredictRequest): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Prediction failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchModelMetadata(): Promise<ModelMetadataResponse> {
  const res = await fetch(`${API_BASE}/model/metadata`);
  if (!res.ok) {
    throw new Error(`Failed to fetch model metadata: ${res.statusText}`);
  }
  return res.json();
}
