const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Test the backend and MySQL connection
export async function testBackendConnection() {
  const response = await fetch(`${API_BASE_URL}/db-test`);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Could not connect to the backend.");
  }

  return result;
}

// Search for flights through the backend
export async function searchFlights({ from, to, date, adults = 1 }) {
  const params = new URLSearchParams({
    from,
    to,
    date,
    adults: String(adults),
  });

  const response = await fetch(
    `${API_BASE_URL}/flights/search?${params.toString()}`,
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to search flights.");
  }

  return result;
}
