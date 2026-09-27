
const CSRF_COOKIE = 'csrf_token';

function readCookie(name) {
  const match = document.cookie.match(
    new RegExp('(^| )' + name + '=([^;]+)')
  );

  return match ? decodeURIComponent(match[2]) : null;
}

let csrfPrimed = false;

async function ensureCsrf() {
  if (csrfPrimed && readCookie(CSRF_COOKIE)) return;

  await fetch('/api/csrf', {
    credentials: 'include',
  });

  csrfPrimed = true;
}

async function request(
  path,
  { method = 'GET', body, isFormData = false } = {}
) {
  await ensureCsrf();

  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const safe = ['GET', 'HEAD'];

  if (!safe.includes(method)) {
    const token = readCookie(CSRF_COOKIE);

    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'include',
    body: isFormData
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  let data = null;

  const text = await res.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && data.error) ||
      `Request failed (${res.status}).`;

    console.error('API REQUEST FAILED:', {
      path,
      method,
      status: res.status,
      response: data,
    });

    const error = new Error(message);

    error.status = res.status;
    error.response = data;

    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),

  post: (path, body) =>
    request(path, {
      method: 'POST',
      body,
    }),

  put: (path, body) =>
    request(path, {
      method: 'PUT',
      body,
    }),

  patch: (path, body) =>
    request(path, {
      method: 'PATCH',
      body,
    }),

  delete: (path) =>
    request(path, {
      method: 'DELETE',
    }),

  upload: (path, formData, method = 'POST') =>
    request(path, {
      method,
      body: formData,
      isFormData: true,
    }),
};

export function uploadUrl(path) {
  if (!path) return null;

  // Supabase Storage public URL
  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  // Backward compatibility for old local/upload paths
  return `/uploads/${path}`;
}
