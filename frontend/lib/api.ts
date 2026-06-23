const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  if (options?.body instanceof FormData) {
    const { headers, ...rest } = options;
    const requestHeaders = new Headers(headers);
    requestHeaders.delete("Content-Type");
    return fetch(url, { ...rest, headers: requestHeaders });
  }

  return fetch(url, options);
}
