import { useEffect, useState } from "react";
import {
  Car,
  Navigation,
  ShieldCheck,
  LoaderCircle,
  Clock,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export default function AirportTaxi({ formatPrice }) {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    pickupDate: "",
    pickupTime: "",
    passengers: 1,
  });

  async function loadRoutes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/taxis/routes`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load taxi routes.");
      }

      setRoutes(result.data || []);

      if (!selectedRoute && result.data?.length) {
        setSelectedRoute(result.data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  async function requestTaxi(event) {
    event.preventDefault();

    if (!selectedRoute) {
      setError("Please select a route.");
      return;
    }

    try {
      setBooking(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/taxis/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routeId: selectedRoute.id,
          ...form,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Taxi booking failed.");
      }

      setSuccess(
        `Taxi booking #${result.data.bookingId} created successfully.`,
      );

      setForm({
        customerName: "",
        customerPhone: "",
        pickupDate: "",
        pickupTime: "",
        passengers: 1,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#13294B] text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
          <Car className="text-[#327D81]" />
          Airport Taxi
        </h2>

        <p className="text-xs text-white/70">
          Taxi routes and official fares are managed by Tripzo Admin.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#13294B] flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-[#327D81]" />
            Select Destination
          </h3>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={18} />
              Loading routes...
            </div>
          ) : routes.length === 0 ? (
            <p className="text-sm text-slate-500">No taxi routes available.</p>
          ) : (
            <div className="space-y-2">
              {routes.map((route) => {
                const active = selectedRoute?.id === route.id;

                return (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`w-full p-3 rounded-xl border text-left transition ${
                      active
                        ? "border-[#327D81] bg-[#327D81]/10"
                        : "border-slate-200 hover:border-[#327D81]"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-xs">
                        {route.pickupLocation} ➔ {route.destination}
                      </span>

                      <span className="font-black text-xs">
                        {formatPrice(route.fare, route.currency)}
                      </span>
                    </div>

                    <div className="flex gap-3 text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {route.estimatedMinutes} min
                      </span>

                      <span>{route.vehicleType}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedRoute && (
            <form onSubmit={requestTaxi} className="space-y-4">
              <div className="bg-[#F4F6EF] rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500">
                  SELECTED ROUTE
                </p>

                <p className="font-black text-[#13294B] mt-1">
                  {selectedRoute.pickupLocation} → {selectedRoute.destination}
                </p>

                <p className="text-[#327D81] font-black mt-1">
                  {formatPrice(selectedRoute.fare, selectedRoute.currency)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Your name"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customerName: e.target.value,
                    })
                  }
                  className="border rounded-xl px-4 py-3 text-sm"
                />

                <input
                  required
                  placeholder="Phone number"
                  value={form.customerPhone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customerPhone: e.target.value,
                    })
                  }
                  className="border rounded-xl px-4 py-3 text-sm"
                />

                <input
                  required
                  type="date"
                  value={form.pickupDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pickupDate: e.target.value,
                    })
                  }
                  className="border rounded-xl px-4 py-3 text-sm"
                />

                <input
                  required
                  type="time"
                  value={form.pickupTime}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pickupTime: e.target.value,
                    })
                  }
                  className="border rounded-xl px-4 py-3 text-sm"
                />

                <input
                  required
                  type="number"
                  min="1"
                  max="8"
                  value={form.passengers}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      passengers: Number(e.target.value),
                    })
                  }
                  className="border rounded-xl px-4 py-3 text-sm"
                  placeholder="Passengers"
                />
              </div>

              <button
                disabled={booking}
                className="w-full bg-[#327D81] text-white font-bold text-sm py-3 rounded-xl shadow-md disabled:opacity-50"
              >
                {booking ? "Requesting..." : "Request Pickup"}
              </button>
            </form>
          )}
        </div>

        <div className="lg:col-span-3 bg-[#F4F6EF] rounded-xl p-4 border border-slate-200 flex flex-col items-center justify-center min-h-[130px] text-center">
          <ShieldCheck className="w-8 h-8 text-[#327D81] mb-2" />

          <p className="text-xs font-bold text-[#13294B]">
            Tripzo Verified Taxi
          </p>

          <p className="text-[11px] text-slate-500">
            Fixed fares are controlled from the Tripzo admin dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
