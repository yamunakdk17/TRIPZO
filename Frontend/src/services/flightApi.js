// src/services/flightApi.js

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .trim()
  .replace(/\/+$/, "");

async function apiRequest(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Could not reach ${API_BASE_URL}${endpoint}. Confirm the API server is running, the URL is correct, and its CORS settings allow this frontend.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new Error(`The API at ${API_BASE_URL}${endpoint} returned invalid JSON.`);
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      (typeof data === "object" && (data.message || data.error)) ||
      (typeof data === "string" && data) ||
      response.statusText ||
      "Request failed";

    throw new Error(
      `API error ${response.status} from ${endpoint}: ${message}`
    );
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`The API at ${API_BASE_URL}${endpoint} did not return JSON (HTTP ${response.status}). Check the endpoint URL.`);
  }

  return data;
}

function listFromResponse(data, endpoint, label) {
  if (data && data.success === true && Array.isArray(data.data)) return data.data;

  throw new Error(`Unexpected ${label} response from ${endpoint}; expected the backend's { success, data } list.`);
}

export async function getAirports() {
  const data = await apiRequest("/airports");
  return listFromResponse(data, "/airports", "airport");
}

export async function searchFlights({ from, to, date }) {
  const params = new URLSearchParams({ from, to, date });

  const endpoint = `/flights/search?${params.toString()}`;
  const data = await apiRequest(endpoint);
  return listFromResponse(data, "/flights/search", "flight search");
}

export async function searchDuffelOffers({ from, to, date, adults }) {
  const data = await apiRequest("/flights/offers", {
    method: "POST",
    body: JSON.stringify({ from, to, date, adults }),
  });

  return listFromResponse(data, "/flights/offers", "Duffel test offer");
}

export async function createDemoBooking(booking, idempotencyKey) {
  return apiRequest("/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(booking),
  });
}

export async function getDemoBooking(reference) {
  return apiRequest(`/bookings/${encodeURIComponent(reference)}`);
}

export async function simulateDemoPayment(reference) {
  return apiRequest(
    `/bookings/${encodeURIComponent(reference)}/demo-payment`,
    { method: "POST", body: JSON.stringify({}) },
  );
}
