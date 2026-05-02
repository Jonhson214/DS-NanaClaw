const API_BASE = '/api';

export interface HITLResumeRequest {
  thread_id: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface HITLResumeResponse {
  status: string;
  thread_id: string;
}

export interface HealthResponse {
  status: string;
}

export async function resumeHITL(req: HITLResumeRequest): Promise<HITLResumeResponse> {
  const res = await fetch(`${API_BASE}/hitl/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HITL resume failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch('/health', { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}
