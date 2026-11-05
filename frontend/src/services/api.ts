import {
  VariantAnnotationResponse,
  ModelMetadataResponse,
  SystemHealth
} from '../types/variant';

const API_BASE = '/api';

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

export async function fetchModelMetadata(): Promise<ModelMetadataResponse> {
  const res = await fetch(`${API_BASE}/model/metadata`);
  if (!res.ok) {
    throw new Error(`Failed to fetch model metadata: ${res.statusText}`);
  }
  return res.json();
}
