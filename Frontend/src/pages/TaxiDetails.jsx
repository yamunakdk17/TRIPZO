import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Car, Clock3, MapPin, Route, LoaderCircle } from "lucide-react";
import api from "../utils/api";

function formatPrice(value, currency = "NPR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Price on request";

  try {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function TaxiDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadRoute = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/taxis/routes/${encodeURIComponent(slug || "")}`);
        if (!active) return;

        setRoute(response.data?.data || null);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.response?.data?.message || "This taxi route could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (slug) {
      loadRoute();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} />
        Loading taxi route...
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="text-lg font-bold">Route not available</p>
        <p className="mt-2 text-sm">{error || "We could not find this route."}</p>
        <button
          type="button"
          onClick={() => navigate("/taxi")}
          className="mt-4 rounded-xl bg-[#13294B] px-4 py-2 text-sm font-bold text-white"
        >
          View taxi routes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <button
        type="button"
        onClick={() => navigate("/taxi")}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#327D81]"
      >
        <ArrowLeft size={16} />
        Back to taxi routes
      </button>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-[#13294B] p-8 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F7D488]">Airport taxi</p>
            <h1 className="mt-3 text-3xl font-black">{route.pickupLocation} <span className="text-[#F7D488]">→</span> {route.destination}</h1>
            <p className="mt-4 text-sm leading-7 text-white/80">{route.description || "A reliable airport transfer with fixed pricing and real-time route details."}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Fare</p>
                <p className="mt-1 text-xl font-black">{formatPrice(route.fare, route.currency || "NPR")}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Time</p>
                <p className="mt-1 text-xl font-black">{route.estimatedMinutes || 30} min</p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Route overview</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 text-[#327D81]" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Pickup</p>
                    <p className="font-bold text-[#13294B]">{route.pickupLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Route className="mt-1 text-[#327D81]" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Destination</p>
                    <p className="font-bold text-[#13294B]">{route.destination}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-1 text-[#327D81]" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Estimated travel</p>
                    <p className="font-bold text-[#13294B]">{route.estimatedMinutes || 30} minutes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/taxi")}
                className="rounded-xl bg-[#327D81] px-4 py-2.5 text-sm font-bold text-white"
              >
                Book this route
              </button>
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(route.pickupLocation)}&destination=${encodeURIComponent(route.destination)}`, "_blank", "noopener,noreferrer")}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#13294B]"
              >
                Open map
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <Car className="text-[#327D81]" />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Vehicle</p>
          <p className="mt-2 text-lg font-black text-[#13294B]">{route.vehicleType || "Private taxi"}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <MapPin className="text-[#327D81]" />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Distance</p>
          <p className="mt-2 text-lg font-black text-[#13294B]">{route.estimatedDistanceKm ? `${route.estimatedDistanceKm} km` : "Distance on request"}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <Clock3 className="text-[#327D81]" />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Passengers</p>
          <p className="mt-2 text-lg font-black text-[#13294B]">Up to {route.maxPassengers || 8}</p>
        </div>
      </section>
    </div>
  );
}
