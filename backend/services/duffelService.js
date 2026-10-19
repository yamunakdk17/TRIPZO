const DUFFEL_API_URL = "https://api.duffel.com";

async function searchFlights({ from, to, date, adults = 1 }) {
  const token = process.env.DUFFEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Duffel API token is not configured.");
  }

  const passengers = Array.from({ length: adults }, () => ({ type: "adult" }));

  const response = await fetch(`${DUFFEL_API_URL}/air/offer_requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        cabin_class: "economy",
        slices: [
          {
            origin: from,
            destination: to,
            departure_date: date,
          },
        ],
        passengers,
      },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    const error = new Error("Duffel flight search failed.");
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }

  return {
    requestId: result.data?.id,
    offers: result.data?.offers ?? [],
    liveMode: result.data?.live_mode ?? false,
  };
}

module.exports = { searchFlights };
