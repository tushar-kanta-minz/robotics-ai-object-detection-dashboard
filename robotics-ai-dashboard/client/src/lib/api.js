
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function api(path, options = {}) {
    const r = await fetch(`${BASE}/api${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
        throw new Error(data.error || `Request failed (${r.status})`);
    }

    return data;
}

export { BASE };
