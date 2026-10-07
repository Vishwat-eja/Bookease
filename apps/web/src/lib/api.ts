const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: { message: string; details?: any } }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bookease_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error || { message: 'An unexpected error occurred' },
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || 'Network request failed' },
    };
  }
}
