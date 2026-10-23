const DUFFEL_API = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";
const REQUEST_TIMEOUT_MS = 15_000;

export class DuffelError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "DuffelError";
    this.status = status;
  }
}

function getTestToken() {
  const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new DuffelError(
      "Duffel test search is not configured. Add a test token to the backend environment.",
      503,
    );
  }

  if (!token.startsWith("duffel_test_")) {
    throw new DuffelError(
      "Duffel integration only accepts a test-mode access token.",
      503,
    );
  }

  return token;
}

async function request(path, options = {}) {
  const token = getTestToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${DUFFEL_API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Duffel-Version": DUFFEL_VERSION,
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new DuffelError("Duffel test search timed out. Please try again.", 504);
    }

    throw new DuffelError("Duffel test service could not be reached.", 502);
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 404) {
      throw new DuffelError("This Duffel test offer is no longer available.", 410);
    }
    if (response.status === 429) {
      throw new DuffelError("Duffel test service is busy. Please try again.", 503);
    }
    if (response.status === 422) {
      throw new DuffelError("Duffel could not search this route and date.", 422);
    }

    throw new DuffelError("Duffel test service returned an error.", 502);
  }

  if (!payload?.data) {
    throw new DuffelError("Duffel returned an invalid response.", 502);
  }

  return payload.data;
}

export function normalizeDuffelOffer(offer, fallbackRoute = {}) {
  const slices = Array.isArray(offer?.slices) ? offer.slices : [];
  const segments = slices.flatMap((slice) =>
    Array.isArray(slice.segments) ? slice.segments : [],
  );
  const firstSegment = segments[0];
  const lastSegment = segments.at(-1);
  const amount = Number(offer?.total_amount);

  if (
    !offer?.id ||
    !firstSegment?.departing_at ||
    !lastSegment?.arriving_at ||
    !Number.isFinite(amount)
  ) {
    return null;
  }

  const departure = new Date(firstSegment.departing_at);
  const arrival = new Date(lastSegment.arriving_at);
  const duration = Math.max(0, Math.round((arrival - departure) / 60_000));

  return {
    id: offer.id,
    providerOfferId: offer.id,
    providerOfferRequestId: offer.offer_request_id || null,
    source: "duffel_test",
    isTestOffer: offer.live_mode === false,
    airline:
      firstSegment.operating_carrier?.name ||
      firstSegment.marketing_carrier?.name ||
      "Airline unavailable",
    airlineCode:
      firstSegment.operating_carrier?.iata_code ||
      firstSegment.marketing_carrier?.iata_code ||
      "",
    flightNumber:
      firstSegment.marketing_carrier_flight_number ||
      firstSegment.operating_carrier_flight_number ||
      "",
    fromCode: firstSegment.origin?.iata_code || fallbackRoute.from || "",
    toCode: lastSegment.destination?.iata_code || fallbackRoute.to || "",
    departureAt: firstSegment.departing_at,
    arrivalAt: lastSegment.arriving_at,
    dep: firstSegment.departing_at.slice(11, 16),
    arr: lastSegment.arriving_at.slice(11, 16),
    mins: duration,
    stops: Math.max(0, segments.length - slices.length),
    price: amount,
    currency: offer.total_currency || "",
    expiresAt: offer.expires_at || null,
    fareId: null,
    fareType: null,
    fareStatus: "provider_offer",
    rawOffer: offer,
  };
}

export async function searchDuffelOffers({ from, to, date, adults }) {
  const offerRequest = await request("/air/offer_requests?return_offers=true", {
    method: "POST",
    body: JSON.stringify({
      data: {
        cabin_class: "economy",
        slices: [{ origin: from, destination: to, departure_date: date }],
        passengers: Array.from({ length: adults }, () => ({ type: "adult" })),
        max_connections: 2,
      },
    }),
  });

  if (offerRequest.live_mode !== false) {
    throw new DuffelError("Duffel did not return a test-mode offer request.", 502);
  }

  const offers = Array.isArray(offerRequest.offers) ? offerRequest.offers : [];
  return offers
    .map((offer) =>
      normalizeDuffelOffer(
        { ...offer, live_mode: offerRequest.live_mode },
        { from, to },
      ),
    )
    .filter(Boolean);
}

export async function getDuffelOffer(providerOfferId) {
  if (!/^off_[A-Za-z0-9_-]{8,}$/.test(providerOfferId || "")) {
    throw new DuffelError("A valid provider offer is required.", 400);
  }

  const offer = await request(
    `/air/offers/${encodeURIComponent(providerOfferId)}`,
  );

  if (offer.live_mode !== false) {
    throw new DuffelError("The selected offer is not from Duffel test mode.", 409);
  }

  const normalized = normalizeDuffelOffer(offer);
  if (!normalized) {
    throw new DuffelError("Duffel returned an invalid offer.", 502);
  }

  return normalized;
}
