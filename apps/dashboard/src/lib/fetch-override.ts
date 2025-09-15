// Development fetch override to force localhost URLs
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalFetch = window.fetch;

  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: string;

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = String(input);
    }

    // If URL contains production domain, replace with localhost
    if (url.includes('taskmanagerai.honercloud.com')) {
      console.warn('🚫 Blocked production domain call:', url);
      url = url.replace('https://taskmanagerai.honercloud.com', 'http://localhost:3002');
      console.log('✅ Redirected to localhost:', url);
    }

    // Log all fetch calls for debugging
    console.log('🌐 Fetch call:', url, init?.method || 'GET');

    // Create new request with corrected URL
    if (typeof input === 'string') {
      return originalFetch(url, init);
    } else if (input instanceof URL) {
      return originalFetch(new URL(url), init);
    } else if (input instanceof Request) {
      const newRequest = new Request(url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        referrerPolicy: input.referrerPolicy,
        integrity: input.integrity,
        keepalive: input.keepalive,
        signal: input.signal,
        ...init
      });
      return originalFetch(newRequest);
    }

    return originalFetch(url, init);
  };

  console.log('🔧 Fetch override installed for development');
}