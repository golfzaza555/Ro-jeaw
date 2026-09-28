export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** One API client per portal, so a device can be logged into customer and kitchen separately. */
export function createApi(portal) {
  const key = `rj_token_${portal}`;
  const getToken = () => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const setToken = (t) => {
    try { t ? localStorage.setItem(key, t) : localStorage.removeItem(key); } catch { /* storage blocked */ }
  };

  async function request(path, { method = 'GET', body } = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    let res;
    try {
      res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 0);
    }
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      if (res.status === 401 && token) {
        setToken(null);
        window.dispatchEvent(new CustomEvent('rj:unauthorized', { detail: portal }));
      }
      throw new ApiError(data?.error || `เกิดข้อผิดพลาด (${res.status})`, res.status);
    }
    return data;
  }

  return {
    getToken,
    setToken,
    get: (p) => request(p),
    post: (p, b = {}) => request(p, { method: 'POST', body: b }),
    patch: (p, b = {}) => request(p, { method: 'PATCH', body: b }),
    put: (p, b = {}) => request(p, { method: 'PUT', body: b }),
  };
}
