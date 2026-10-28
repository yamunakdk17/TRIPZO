import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Users, BedDouble, LoaderCircle } from "lucide-react";
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

export default function HotelDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadHotel = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/hotels/${encodeURIComponent(slug || "")}`);
        if (!active) return;

        setHotel(response.data?.data || null);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.response?.data?.message || "This hotel could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (slug) {
      loadHotel();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  const primaryImage = useMemo(() => {
    if (!hotel) return "";
    return hotel.imageUrl || hotel.images?.[0]?.imageUrl || "";
  }, [hotel]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} />
        Loading hotel details...
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="text-lg font-bold">Hotel not available</p>
        <p className="mt-2 text-sm">{error || "We could not find this hotel."}</p>
        <button
          type="button"
          onClick={() => navigate("/stays")}
          className="mt-4 rounded-xl bg-[#13294B] px-4 py-2 text-sm font-bold text-white"
        >
          Browse hotels
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <button
        type="button"
        onClick={() => navigate("/stays")}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#327D81]"
      >
        <ArrowLeft size={16} />
        Back to hotels
      </button>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[280px] bg-slate-200">
            {primaryImage ? (
              <img src={primaryImage} alt={hotel.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#327D81] to-[#13294B] text-white">
                No image available
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#327D81]">
              Stay
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#13294B]">{hotel.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              {Number(hotel.rating) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-600">
                  <Star size={14} className="fill-current" />
                  {Number(hotel.rating).toFixed(1)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} />
                {hotel.city || "Nepal"}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">{hotel.description || "A comfortable stay in Nepal designed for a relaxing trip."}</p>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">From</p>
              <p className="mt-1 text-2xl font-black text-[#327D81]">
                {formatPrice(hotel.startingPrice || hotel.rooms?.[0]?.pricePerNight || 0, hotel.rooms?.[0]?.currency || "NPR")}
              </p>
              <p className="text-xs text-slate-500">per night</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/stays")}
                className="rounded-xl border border-[#327D81]/30 bg-[#EAF4F2] px-4 py-2.5 text-sm font-bold text-[#327D81]"
              >
                Choose dates
              </button>
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name}, ${hotel.address || hotel.city || "Nepal"}`)}`, "_blank", "noopener,noreferrer")}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#13294B]"
              >
                View on map
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-[#13294B]">About this stay</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{hotel.address || "Address shared with the property listing."}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Location</p>
              <p className="mt-2 font-bold text-[#13294B]">{hotel.city || "Nepal"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Guests</p>
              <p className="mt-2 flex items-center gap-2 font-bold text-[#13294B]">
                <Users size={16} />
                {hotel.rooms?.reduce((max, room) => Math.max(max, Number(room.capacity || 0)), 0) || 2}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rooms</p>
              <p className="mt-2 flex items-center gap-2 font-bold text-[#13294B]">
                <BedDouble size={16} />
                {hotel.rooms?.length || 1}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-[#13294B]">Amenities</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(hotel.amenities || []).map((amenity) => (
              <span
                key={amenity.id || amenity.name}
                className="rounded-full bg-[#EAF4F2] px-3 py-1.5 text-xs font-bold text-[#327D81]"
              >
                {amenity.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {hotel.rooms?.length > 0 && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-[#13294B]">Available rooms</h2>
          <div className="mt-5 space-y-4">
            {hotel.rooms.map((room) => (
              <div key={room.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-black text-[#13294B]">{room.roomName || room.roomType || "Room"}</p>
                  <p className="mt-1 text-sm text-slate-500">{room.roomType || "Standard room"} · Up to {room.capacity || 2} guests</p>
                </div>

                <div className="flex items-center gap-3 md:justify-end">
                  <p className="text-lg font-black text-[#327D81]">
                    {formatPrice(room.pricePerNight || 0, room.currency || hotel.currency || "NPR")}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/stays")}
                    className="rounded-xl bg-[#13294B] px-4 py-2 text-sm font-bold text-white"
                  >
                    Reserve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
