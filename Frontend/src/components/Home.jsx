import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Backpack,
  Bus,
  CalendarDays,
  Car,
  Clock3,
  Compass,
  Hotel,
  MapPin,
  Plane,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");
const tokenKey = "tripzoCustomerToken";
const userKey = "tripzoCustomerUser";
const today = new Date().toLocaleDateString("en-CA");
const plusDays = (days) => {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
};

const SERVICES = [
  {
    tab: "flights",
    icon: Plane,
    title: "Flights",
    text: "Compare Nepal routes and book your next flight.",
    color: "#E9A94B",
  },
  {
    tab: "stays",
    icon: Hotel,
    title: "Hotels & lodges",
    text: "Find a stay for the city, lakeside, or trail.",
    color: "#327D81",
  },
  {
    tab: "taxi",
    icon: Car,
    title: "Airport taxi",
    text: "Choose a route and see the fare before booking.",
    color: "#327D81",
  },
  {
    tab: "buses",
    icon: Bus,
    title: "Buses & jeeps",
    text: "Explore road journeys to cities and trailheads.",
    color: "#E9A94B",
  },
];

const DESTINATIONS = [
  {
    name: "Pokhara",
    detail: "Lakes, mountain views and a relaxed lakeside stay",
    season: "Oct–Nov · Mar–Apr",
    reach: "25 min flight · 6–7 hr bus",
    image:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Everest Region",
    detail: "Sherpa culture and high Himalayan trails",
    season: "Mar–May · Sep–Nov",
    reach: "Fly to Lukla, then trek",
    image:
      "https://images.unsplash.com/photo-1486911278844-a81c5267e227?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Chitwan",
    detail: "Jungle safaris, river walks and wildlife",
    season: "Oct–Mar",
    reach: "5–6 hr bus · Bharatpur flight",
    image:
      "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Lumbini",
    detail: "The birthplace of the Buddha and sacred gardens",
    season: "Oct–Mar",
    reach: "Fly to Bhairahawa · 8–9 hr bus",
    image:
      "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Upper Mustang",
    detail: "High desert landscapes and ancient villages",
    season: "Jun–Sep",
    reach: "Fly to Jomsom · jeep north",
    image:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Kathmandu",
    detail: "Historic squares, temples and lively neighbourhoods",
    season: "Oct–Nov · Mar–Apr",
    reach: "International and domestic flights",
    image:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Annapurna",
    detail: "Mountain trails, villages and wide valley views",
    season: "Mar–May · Oct–Nov",
    reach: "Road or flight to Pokhara",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Bandipur",
    detail: "A hilltop town with traditional Newari streets",
    season: "Oct–May",
    reach: "Road from Kathmandu or Pokhara",
    image:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=75",
  },
];

function Photo({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-gradient-to-br from-[#327D81] via-[#1B4F6B] to-[#0B1B35] ${className}`}
      />
    );
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-64 animate-pulse rounded-2xl bg-slate-200"
        />
      ))}
    </div>
  );
}

function Price({ value, currency = "NPR" }) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0)
    return <span className="text-sm text-slate-500">Price on request</span>;
  let formatted;
  try {
    formatted = new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    formatted = `${currency} ${amount.toLocaleString()}`;
  }
  return <span>{formatted}</span>;
}

export default function Home({ setActiveTab }) {
  const [bookingTab, setBookingTab] = useState("flights");
  const [search, setSearch] = useState({
    from: "KTM",
    to: "PKR",
    date: plusDays(7),
    passengers: "1",
    city: "",
    checkIn: plusDays(7),
    checkOut: plusDays(9),
    guests: "2",
    rooms: "1",
    pickup: "Tribhuvan International Airport",
    destination: "",
    time: "10:00",
  });
  const [hotels, setHotels] = useState([]);
  const [taxiRoutes, setTaxiRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [customer] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(userKey) || "null");
    } catch {
      return null;
    }
  });
  const [upcoming, setUpcoming] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const go = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openHotel = (hotel) => {
    try {
      sessionStorage.setItem(
        "tripzoHomeSearch",
        JSON.stringify({ service: "hotels", hotelId: hotel.id }),
      );
    } catch {
      /* Navigation still works without session storage. */
    }
    go("stays");
  };
  const loadFeatured = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const results = await Promise.allSettled([
      fetch(`${API_URL}/hotels`).then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Unable to load hotels.");
        return result.data || [];
      }),
      fetch(`${API_URL}/taxis/routes`).then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Unable to load taxi routes.");
        return result.data || [];
      }),
    ]);
    if (results[0].status === "fulfilled")
      setHotels(results[0].value.slice(0, 4));
    else setHotels([]);
    if (results[1].status === "fulfilled")
      setTaxiRoutes(results[1].value.slice(0, 4));
    else setTaxiRoutes([]);
    if (results.some((result) => result.status === "rejected"))
      setLoadError("Some travel information could not be loaded.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFeatured(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFeatured]);
  useEffect(() => {
    let token = "";
    try {
      token = sessionStorage.getItem(tokenKey) || "";
    } catch {
      /* Booking request will report if session storage is unavailable. */
    }
    if (!token) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setBookingLoading(true);
      setBookingError("");
      try {
        const response = await fetch(`${API_URL}/customer/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Could not load your trips.");
        const next =
          (result.data || [])
            .filter(
              (item) =>
                new Date(`${String(item.startDate).slice(0, 10)}T23:59:59`) >=
                new Date(),
            )
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] ||
          null;
        if (active) setUpcoming(next);
      } catch (error) {
        if (active) setBookingError(error.message);
      } finally {
        if (active) setBookingLoading(false);
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const startSearch = (event) => {
    event.preventDefault();
    try {
      sessionStorage.setItem(
        "tripzoHomeSearch",
        JSON.stringify({ service: bookingTab, ...search }),
      );
    } catch {
      /* The service page still opens if storage is unavailable. */
    }
    go(
      { flights: "flights", hotels: "stays", taxi: "taxi", buses: "buses" }[
        bookingTab
      ],
    );
  };

  return (
    <div className="-mx-4 -mt-6 overflow-hidden text-[#13294B]">
      <section className="relative isolate min-h-[590px] overflow-hidden bg-[#0B1B35] text-white">
        <Photo
          src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=2200&q=85"
          alt="Himalayan mountains and Nepal landscape"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08172c]/95 via-[#0B1B35]/70 to-[#0B1B35]/30" />
        <div className="relative mx-auto max-w-7xl px-4 pb-44 pt-16 sm:px-6 sm:pb-48 sm:pt-24 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold">
            <MapPin className="h-4 w-4 text-[#F7D488]" /> Tripzo · Nepal, all in
            one
          </div>
          <h1
            className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Everything you need
            <br />
            <span className="text-[#F7D488]">to travel Nepal.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            Flights, places to stay, airport rides and road journeys, brought
            together for your next Nepal adventure.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {SERVICES.map(({ tab, icon: Icon, title }) => (
              <button
                key={tab}
                onClick={() => go(tab)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/20 focus-visible:outline-white"
              >
                <Icon className="h-4 w-4 text-[#F7D488]" />
                {title}
              </button>
            ))}
            <button
              onClick={() => go("planner")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7D488] px-4 py-3 text-sm font-extrabold text-[#13294B] transition hover:bg-[#F2C468]"
            >
              <Sparkles className="h-4 w-4" />
              Plan a trip
            </button>
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-5 z-10 mx-auto max-w-7xl sm:inset-x-6 lg:inset-x-8">
          <div className="rounded-2xl bg-white p-4 text-[#13294B] shadow-2xl sm:p-5">
            <div
              role="tablist"
              aria-label="Choose a service to search"
              className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200"
            >
              {[
                ["flights", "Flights", Plane],
                ["hotels", "Hotels", Hotel],
                ["taxi", "Taxi", Car],
                ["buses", "Buses", Bus],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={bookingTab === id}
                  onClick={() => setBookingTab(id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${bookingTab === id ? "border-[#327D81] text-[#327D81]" : "border-transparent text-slate-500 hover:text-[#13294B]"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={startSearch}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
            >
              {bookingTab === "flights" && (
                <>
                  <Field
                    label="From"
                    value={search.from}
                    onChange={(value) => setSearch({ ...search, from: value })}
                    placeholder="City or airport"
                  />
                  <Field
                    label="To"
                    value={search.to}
                    onChange={(value) => setSearch({ ...search, to: value })}
                    placeholder="City or airport"
                  />
                  <Field
                    label="Departure"
                    type="date"
                    value={search.date}
                    onChange={(value) => setSearch({ ...search, date: value })}
                  />
                  <Field
                    label="Passengers"
                    type="number"
                    min="1"
                    max="9"
                    value={search.passengers}
                    onChange={(value) =>
                      setSearch({ ...search, passengers: value })
                    }
                  />
                </>
              )}
              {bookingTab === "hotels" && (
                <>
                  <Field
                    label="Destination"
                    value={search.city}
                    onChange={(value) => setSearch({ ...search, city: value })}
                    placeholder="Where would you like to stay?"
                  />
                  <Field
                    label="Check-in"
                    type="date"
                    value={search.checkIn}
                    onChange={(value) =>
                      setSearch({ ...search, checkIn: value })
                    }
                  />
                  <Field
                    label="Check-out"
                    type="date"
                    value={search.checkOut}
                    onChange={(value) =>
                      setSearch({ ...search, checkOut: value })
                    }
                  />
                  <Field
                    label="Guests"
                    type="number"
                    min="1"
                    max="20"
                    value={search.guests}
                    onChange={(value) =>
                      setSearch({ ...search, guests: value })
                    }
                  />
                  <Field
                    label="Rooms"
                    type="number"
                    min="1"
                    max="10"
                    value={search.rooms}
                    onChange={(value) => setSearch({ ...search, rooms: value })}
                  />
                </>
              )}
              {bookingTab === "taxi" && (
                <>
                  <Field
                    label="Pickup"
                    value={search.pickup}
                    onChange={(value) =>
                      setSearch({ ...search, pickup: value })
                    }
                    placeholder="Pickup location"
                  />
                  <Field
                    label="Destination"
                    value={search.destination}
                    onChange={(value) =>
                      setSearch({ ...search, destination: value })
                    }
                    placeholder="Where to?"
                  />
                  <Field
                    label="Date"
                    type="date"
                    value={search.date}
                    onChange={(value) => setSearch({ ...search, date: value })}
                  />
                  <Field
                    label="Pickup time"
                    type="time"
                    value={search.time}
                    onChange={(value) => setSearch({ ...search, time: value })}
                  />
                </>
              )}
              {bookingTab === "buses" && (
                <>
                  <Field
                    label="From"
                    value={search.from}
                    onChange={(value) => setSearch({ ...search, from: value })}
                  />
                  <Field
                    label="To"
                    value={search.to}
                    onChange={(value) => setSearch({ ...search, to: value })}
                  />
                  <Field
                    label="Travel date"
                    type="date"
                    value={search.date}
                    onChange={(value) => setSearch({ ...search, date: value })}
                  />
                  <Field
                    label="Passengers"
                    type="number"
                    min="1"
                    max="9"
                    value={search.passengers}
                    onChange={(value) =>
                      setSearch({ ...search, passengers: value })
                    }
                  />
                </>
              )}
              <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#327D81] px-5 text-sm font-extrabold text-white transition hover:bg-[#286467] sm:col-span-2 lg:col-span-1">
                Search <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Search opens the selected Tripzo service. Booking details and live
              availability are confirmed there.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section aria-labelledby="quick-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#327D81]">
                Start here
              </p>
              <h2
                id="quick-title"
                className="mt-2 text-3xl font-semibold sm:text-4xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Your journey, one tap away
              </h2>
            </div>
            <button
              onClick={() => go("account")}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#327D81] hover:underline"
            >
              My trips <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ tab, icon: Icon, title, text, color }) => (
              <button
                key={tab}
                onClick={() => go(tab)}
                className="group rounded-2xl border border-[#13294B]/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-[#13294B] text-[#F7D488] transition group-hover:bg-[#327D81]"
                  style={{ color }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="mt-4 block text-lg font-extrabold">
                  {title}
                </span>
                <span className="mt-1 block min-h-10 text-sm leading-relaxed text-[#13294B]/70">
                  {text}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#327D81]">
                  Explore{" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="stays-title">
          <SectionHeading
            eyebrow="Stays around Nepal"
            title="Find a place that feels right"
            action="View all hotels"
            onAction={() => go("stays")}
          />
          {loading ? (
            <SkeletonCards />
          ) : hotels.length === 0 ? (
            <Empty
              message="No hotels available right now."
              action="Search hotels"
              onAction={() => go("stays")}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {hotels.map((hotel, index) => (
                <article
                  key={`${hotel.id}-${hotel.name || "hotel"}-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    onClick={() => openHotel(hotel)}
                    className="block w-full text-left"
                  >
                    <Photo
                      src={hotel.imageUrl || hotel.image_url}
                      alt={hotel.name ? `${hotel.name} hotel` : "Hotel photo"}
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold">{hotel.name}</h3>
                        {Number(hotel.starRating) > 0 && (
                          <span className="shrink-0 text-xs font-bold text-amber-600">
                            {"★".repeat(Math.min(5, Number(hotel.starRating)))}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {hotel.city || hotel.address || "Nepal"}
                      </p>
                      {Number(hotel.rating) > 0 && (
                        <p className="mt-2 text-sm font-bold text-[#327D81]">
                          ★ {Number(hotel.rating).toFixed(1)} guest rating
                        </p>
                      )}
                      {hotel.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {hotel.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(hotel.amenities || [])
                          .slice(0, 3)
                          .map((amenity, amenityIndex) => (
                            <span
                              key={`${hotel.id}-${amenity.id || amenity.name || "facility"}-${amenityIndex}`}
                              className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                            >
                              {amenity.name}
                            </span>
                          ))}
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        From{" "}
                        <strong className="text-base text-[#13294B]">
                          <Price
                            value={hotel.startingPrice}
                            currency={hotel.rooms?.[0]?.currency || "NPR"}
                          />
                        </strong>{" "}
                        <span>/ night</span>
                      </p>
                    </div>
                  </button>
                  <div className="grid grid-cols-2 gap-2 border-t p-3">
                    <button
                      onClick={() => openHotel(hotel)}
                      className="rounded-lg border px-2 py-2 text-xs font-bold hover:border-[#327D81]"
                    >
                      View details
                    </button>
                    <button
                      onClick={() => openHotel(hotel)}
                      className="rounded-lg bg-[#327D81] px-2 py-2 text-xs font-bold text-white hover:bg-[#286467]"
                    >
                      Book now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="taxi-title">
          <SectionHeading
            eyebrow="Local rides"
            title="Popular taxi routes"
            action="Explore airport taxi"
            onAction={() => go("taxi")}
          />
          {loading ? (
            <SkeletonCards />
          ) : taxiRoutes.length === 0 ? (
            <Empty
              message="No taxi routes available right now."
              action="Explore taxi"
              onAction={() => go("taxi")}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {taxiRoutes.map((route, index) => (
                <article
                  key={`${route.id}-${route.pickupLocation}-${route.destination}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF4F2] text-[#327D81]">
                      <Car className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {route.vehicleType || "Taxi"}
                    </span>
                  </div>
                  <h3 className="mt-4 font-extrabold">
                    {route.pickupLocation}{" "}
                    <span className="text-[#327D81]">→</span>{" "}
                    {route.destination}
                  </h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock3 className="h-4 w-4" />
                    {route.estimatedMinutes
                      ? `${route.estimatedMinutes} min`
                      : "Time varies"}
                    {route.estimatedDistanceKm
                      ? ` · ${route.estimatedDistanceKm} km`
                      : ""}
                  </p>
                  <p className="mt-4 text-xs text-slate-500">
                    Fare{" "}
                    <strong className="text-lg text-[#13294B]">
                      <Price
                        value={route.fare}
                        currency={route.currency || "NPR"}
                      />
                    </strong>
                  </p>
                  <button
                    onClick={() => go("taxi")}
                    className="mt-4 w-full rounded-xl border border-[#327D81]/30 px-4 py-2.5 text-sm font-bold text-[#327D81] hover:bg-[#EAF4F2]"
                  >
                    View route & book
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {customer && (
          <section
            aria-labelledby="trip-title"
            className="rounded-3xl bg-[#13294B] p-6 text-white sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F7D488]">
                  Welcome back,{" "}
                  {customer.fullName?.split(" ")[0] || "traveller"}
                </p>
                <h2
                  id="trip-title"
                  className="mt-2 text-3xl font-semibold"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Your next trip
                </h2>
              </div>
              <button
                onClick={() => go("account")}
                className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold hover:bg-white/10"
              >
                My bookings <ArrowRight className="ml-1 inline h-4 w-4" />
              </button>
            </div>
            {bookingLoading ? (
              <p className="mt-5 text-sm text-white/70">
                Loading your bookings…
              </p>
            ) : bookingError ? (
              <p role="status" className="mt-5 text-sm text-white/80">
                {bookingError}{" "}
                <button
                  onClick={() => go("account")}
                  className="font-bold underline"
                >
                  Open account
                </button>
              </p>
            ) : upcoming ? (
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl bg-white/10 p-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#327D81]">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{upcoming.title}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {upcoming.bookingType} ·{" "}
                    {String(upcoming.startDate).slice(0, 10)} · Ref{" "}
                    {upcoming.bookingReference}
                  </p>
                </div>
                <button
                  onClick={() => go("account")}
                  className="rounded-lg bg-[#F7D488] px-4 py-2 text-sm font-extrabold text-[#13294B]"
                >
                  View trip
                </button>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/80">
                  Your next adventure starts here.
                </p>
                <button
                  onClick={() => go("planner")}
                  className="rounded-lg bg-[#F7D488] px-4 py-2 text-sm font-extrabold text-[#13294B]"
                >
                  Plan a trip
                </button>
              </div>
            )}
          </section>
        )}

        <section
          aria-labelledby="flight-title"
          className="grid gap-6 overflow-hidden rounded-3xl bg-[#F5F2E8] p-6 sm:p-9 lg:grid-cols-[1.2fr_.8fr] lg:items-center"
        >
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#327D81]">
              Take to the skies
            </p>
            <h2
              id="flight-title"
              className="mt-2 text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Find your next flight
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#13294B]/70">
              Search current routes and fares from the flight service.
              Availability and prices are checked when you search.
            </p>
            <button
              onClick={() => go("flights")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#13294B] px-5 py-3 text-sm font-bold text-white hover:bg-[#327D81]"
            >
              Search flights <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Popular flight search</span>
              <Plane className="h-5 w-5 text-[#327D81]" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-black">KTM</p>
                <p className="text-xs text-slate-500">Kathmandu</p>
              </div>
              <div className="h-px flex-1 border-t border-dashed border-slate-300" />
              <div className="text-right">
                <p className="text-2xl font-black">PKR</p>
                <p className="text-xs text-slate-500">Pokhara</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              No fare is shown until live flight results are loaded.
            </p>
          </div>
        </section>

        <section aria-labelledby="dest-title">
          <SectionHeading
            eyebrow="Explore Nepal"
            title="A few places to begin"
            action="Plan your route"
            onAction={() => go("planner")}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DESTINATIONS.map((destination) => (
              <article
                key={destination.name}
                className="group relative min-h-[285px] overflow-hidden rounded-2xl bg-[#13294B] text-white"
              >
                <Photo
                  src={destination.image}
                  alt={`${destination.name}, Nepal`}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B35]/95 via-[#0B1B35]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3
                    className="text-2xl font-semibold"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {destination.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/85">
                    {destination.detail}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-white/80">
                    <CalendarDays className="h-3.5 w-3.5 text-[#F7D488]" />
                    Best season: {destination.season}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                    <RouteIcon />
                    Reach: {destination.reach}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => go("planner")}
                      className="rounded-lg bg-[#F7D488] px-3 py-2 text-xs font-extrabold text-[#13294B]"
                    >
                      Explore
                    </button>
                    <button
                      onClick={() => go("stays")}
                      aria-label={`Find hotels near ${destination.name}`}
                      className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold"
                    >
                      Hotels
                    </button>
                    <button
                      onClick={() => go("flights")}
                      aria-label={`Find flights to ${destination.name}`}
                      className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold"
                    >
                      Flights
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="journey-title"
          className="rounded-3xl border border-[#13294B]/10 bg-white p-6 sm:p-9"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#327D81]">
              One trip, all connected
            </p>
            <h2
              id="journey-title"
              className="mt-2 text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              From landing to trailhead
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#13294B]/70">
              Use each service on its own or bring the pieces together as you
              plan.
            </p>
          </div>
          <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Plane, "Arrive", "Find a flight", "flights"],
              [Car, "Get around", "Choose your taxi", "taxi"],
              [Hotel, "Settle in", "Browse hotels", "stays"],
              [Bus, "Head out", "Book a bus or jeep", "buses"],
            ].map(([Icon, title, text, tab], index) => (
              <li key={title} className="relative rounded-2xl bg-[#F5F7F5] p-5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#327D81]">
                  0{index + 1}
                </span>
                <Icon className="mt-3 h-6 w-6 text-[#327D81]" />
                <h3 className="mt-3 font-extrabold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
                <button
                  onClick={() => go(tab)}
                  className="mt-4 text-sm font-bold text-[#327D81] hover:underline"
                >
                  Open service <ArrowRight className="ml-1 inline h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="why-title"
          className="grid gap-7 rounded-3xl bg-[#13294B] p-7 text-white sm:p-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"
        >
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F7D488]">
              Local knowledge, simpler planning
            </p>
            <h2
              id="why-title"
              className="mt-2 text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Travel Nepal with a clearer plan
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Check route details, compare available services and keep your
              bookings together in Tripzo.
            </p>
            <button
              onClick={() => go("planner")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F7D488] px-5 py-3 text-sm font-extrabold text-[#13294B]"
            >
              Build my trip <Sparkles className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [
                Compass,
                "Route context",
                "Know common ways to reach destinations.",
              ],
              [
                Wallet,
                "See available fares",
                "Check the price returned by each service.",
              ],
              [
                ShieldCheck,
                "Review before booking",
                "Service pages show their own booking and payment steps.",
              ],
              [
                Backpack,
                "Made for Nepal travel",
                "Plan city stays, road trips and trail journeys.",
              ],
            ].map(([Icon, title, text]) => (
              <div key={title} className="rounded-2xl bg-white/10 p-4">
                <Icon className="h-5 w-5 text-[#F7D488]" />
                <h3 className="mt-3 text-sm font-extrabold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-[#0B1B35] px-6 py-12 text-center text-white sm:px-10">
          <div className="absolute inset-0 opacity-20">
            <Photo
              src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=70"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative mx-auto max-w-2xl">
            <Sparkles className="mx-auto h-7 w-7 text-[#F7D488]" />
            <h2
              className="mt-4 text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Ready to plan your Nepal trip?
            </h2>
            <p className="mt-3 text-sm text-white/75">
              Start with your destination, then connect transport and stays that
              fit your journey.
            </p>
            <button
              onClick={() => go("planner")}
              className="mt-6 rounded-xl bg-[#F7D488] px-6 py-3 font-extrabold text-[#13294B] hover:bg-[#F2C468]"
            >
              Open trip planner <ArrowRight className="ml-1 inline h-4 w-4" />
            </button>
            <button
              onClick={() => go("account")}
              className="ml-2 mt-6 rounded-xl border border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10"
            >
              My trips
            </button>
          </div>
        </section>

        {loadError && (
          <div
            role="status"
            className="fixed bottom-4 right-4 z-40 flex max-w-sm items-center gap-3 rounded-xl bg-white p-4 text-sm shadow-xl"
          >
            <span>{loadError}</span>
            <button
              onClick={() => void loadFeatured()}
              aria-label="Retry loading travel information"
              className="rounded-lg bg-[#327D81] p-2 text-white"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", ...props }) {
  return (
    <label className="block min-w-0 text-xs font-bold text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 block h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#13294B] outline-none transition focus:border-[#327D81] focus:ring-2 focus:ring-[#327D81]/20"
        {...props}
      />
    </label>
  );
}

function SectionHeading({ eyebrow, title, action, onAction }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#327D81]">
          {eyebrow}
        </p>
        <h2
          className="mt-2 text-3xl font-semibold sm:text-4xl"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {title}
        </h2>
      </div>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-1 text-sm font-bold text-[#327D81] hover:underline"
      >
        {action}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Empty({ message, action, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">{message}</p>
      <button
        onClick={onAction}
        className="mt-3 text-sm font-bold text-[#327D81] hover:underline"
      >
        {action} <ArrowRight className="ml-1 inline h-4 w-4" />
      </button>
    </div>
  );
}

function RouteIcon() {
  return <MapPin className="h-3.5 w-3.5 text-[#F7D488]" />;
}
