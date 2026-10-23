import { useEffect, useMemo, useState } from "react";
import {
  Plane,
  CalendarDays,
  Users,
  ArrowRightLeft,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Luggage,
  Ticket,
  Search,
  RotateCcw,
  CloudSun,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import {
  createDemoBooking,
  getAirports,
  searchDuffelOffers,
  searchFlights,
  simulateDemoPayment,
} from "../services/flightApi.js";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

const todayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const isValidISODate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};//This function checks whether a date string has the correct format and represents a real calendar date.//


const addDays = (iso, amount) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + amount);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const fmtDate = (
  iso,
  options = {
    weekday: "short",
    day: "numeric",
    month: "short",
  },
) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", options);

const toMin = (time) => {
  if (!time) return 0;

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const to12h = (time) => {
  if (!time) return "--:--";

  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";

  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const airportLabel = (code, airports) => {
  const airport = airports.find(
    (item) =>
      (item.iata_code || item.code)?.toUpperCase() === code?.toUpperCase(),
  );

  if (!airport) return code || "Select airport";

  const city = airport.city || airport.airport_name || code;
  const iata = airport.iata_code || airport.code;

  return `${city} (${iata})`;
};

const formatFare = (amount, currency = "NPR") => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) return "Price unavailable";

  try {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
};

const emptyPax = () => ({
  name: "",
  email: "",
  phone: "",
  doc: "",
});

const input =
  "w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

const STEPS = ["Flights", "Passengers", "Review", "Demo payment", "Confirmation"];

/* -------------------------------------------------------
   STEP INDICATOR
------------------------------------------------------- */

function Stepper({ current }) {
  return (
    <ol className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-5">
      {STEPS.map((step, index) => (
        <li key={step} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              index < current
                ? "bg-teal-700 text-white"
                : index === current
                  ? "bg-[#13294B] text-white"
                  : "bg-slate-200 text-slate-500"
            }`}
          >
            {index < current ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </span>

          <span
            className={`hidden text-sm font-semibold sm:block ${
              index === current ? "text-[#13294B]" : "text-slate-400"
            }`}
          >
            {step}
          </span>

          {index < STEPS.length - 1 && (
            <span className="h-px flex-1 bg-slate-300" />
          )}
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------
   FLIGHT RESULT CARD
   Only show facts returned by the backend.
------------------------------------------------------- */

function FlightCard({ flight, onSelect }) {
  const canSelect =
    flight.price != null &&
    (flight.source === "duffel_test"
      ? Boolean(flight.providerOfferId)
      : Boolean(flight.fareId));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
      <div className="grid items-center gap-5 lg:grid-cols-[1.1fr_1.6fr_1fr_auto]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-sm font-black text-teal-800">
            {flight.code || "✈"}
          </div>

          <div>
            <h3 className="font-bold">{flight.airline}</h3>
            <p className="text-xs text-slate-500">
              {flight.no || "Flight number unavailable"}
            </p>
            <p className="mt-1 text-[11px] font-bold text-teal-800">
              {flight.source === "duffel_test"
                ? "Duffel test offer"
                : "Local database schedule"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-xl font-black">{to12h(flight.dep)}</p>
            <p className="text-xs font-semibold text-slate-500">
              {flight.from}
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] text-slate-500">
              {flight.mins > 0
                ? `${flight.mins} min`
                : "Duration unavailable"}
            </span>

            <div className="relative w-full border-t border-dashed border-teal-500">
              <Plane className="absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white text-teal-700" />
            </div>

            <span className="text-[11px] font-semibold text-slate-500">
              {flight.stops != null
                ? flight.stops === 0
                  ? "Direct"
                  : `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`
                : "Stop information unavailable"}
            </span>
          </div>

          <div className="text-right">
            <p className="text-xl font-black">{to12h(flight.arr)}</p>
            <p className="text-xs font-semibold text-slate-500">{flight.to}</p>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-center gap-2">
            <Luggage className="h-4 w-4 text-slate-400" />
            Baggage information unavailable
          </li>
          <li>Fare conditions unavailable</li>
          <li>Seat availability not provided</li>
        </ul>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
          <div className="lg:text-right">
            <p className="text-xs text-slate-500">
              {flight.source === "duffel_test"
                ? "Test offer total"
                : "Database base fare / adult"}
            </p>
            <p className="text-2xl font-black text-teal-700">
              {flight.price != null
                ? formatFare(flight.price, flight.currency)
                : "Price unavailable"}
            </p>
            <p className="mt-1 max-w-44 text-[10px] leading-4 text-slate-500">
              {flight.source === "duffel_test"
                ? "Test offer only. Price and availability can change."
                : flight.fareStatus === "published" && flight.sourceVerifiedAt
                  ? "Published database fare. Rechecked before demo booking."
                  : "Unverified fare — informational use only."}
            </p>
          </div>

          <button
            type="button"
            disabled={!canSelect}
            onClick={() => onSelect(flight)}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!canSelect ? "Unavailable" : "Select"}
            {canSelect && (
              <ArrowRight className="ml-1 inline h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------
   MAIN BOOKING COMPONENT
------------------------------------------------------- */

export default function TripzoFlightBooking() {
  const [step, setStep] = useState("SEARCH");

  const [airports, setAirports] = useState([]);
  const [airportsLoading, setAirportsLoading] = useState(true);
  const [airportsError, setAirportsError] = useState("");

  const [from, setFrom] = useState("KTM");
  const [to, setTo] = useState("DHI");
  const [date, setDate] = useState(addDays(todayISO(), 7));
  const [paxCount, setPaxCount] = useState(1);

  const [routeFlights, setRouteFlights] = useState([]);
  const [providerFlights, setProviderFlights] = useState([]);
  const [flight, setFlight] = useState(null);
  const [pax, setPax] = useState([emptyPax()]);
  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const [filters, setFilters] = useState({
    airline: "All",
    time: "Any",
  });

  const [sort, setSort] = useState("cheapest");

  const [searching, setSearching] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  /* Load airport options from the backend */
  useEffect(() => {
    let active = true;

    async function loadAirports() {
      setAirportsLoading(true);
      setAirportsError("");

      try {
        const data = await getAirports();

        if (!Array.isArray(data)) {
          throw new Error("The airports API returned an invalid response.");
        }

        if (active) {
          setAirports(data);

          const codes = data.map((airport) =>
            (airport.iata_code || airport.code || "").toUpperCase(),
          );

          if (!codes.includes("KTM") && codes.length > 0) {
            setFrom(codes[0]);
          }

          if (!codes.includes("PKR") && codes.length > 1) {
            setTo(codes[1]);
          }
        }
      } catch (err) {
        if (active) {
          setAirportsError(err.message || "Could not load airports.");
        }
      } finally {
        if (active) setAirportsLoading(false);
      }
    }

    loadAirports();

    return () => {
      active = false;
    };
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const go = (nextStep) => {
    setStep(nextStep);
    setError("");
    scrollTop();
  };

  const airportCodes = useMemo(
    () =>
      airports
        .map((airport) =>
          (airport.iata_code || airport.code || "").toUpperCase(),
        )
        .filter(Boolean),
    [airports],
  );

  const airlinesOnRoute = useMemo(
    () => [
      "All",
      ...new Set(
        [...routeFlights, ...providerFlights]
          .map((item) => item.airline)
          .filter(Boolean),
      ),
    ],
    [routeFlights, providerFlights],
  );

  const allFlights = useMemo(
    () => [...routeFlights, ...providerFlights],
    [routeFlights, providerFlights],
  );

  const results = useMemo(() => {
    const slot = (time) => {
      const hour = Number((time || "00:00").slice(0, 2));

      if (hour < 12) return "Morning";
      if (hour < 17) return "Afternoon";
      return "Evening";
    };

    return allFlights
      .filter(
        (item) => filters.airline === "All" || item.airline === filters.airline,
      )
      .filter(
        (item) => filters.time === "Any" || slot(item.dep) === filters.time,
      )
      .sort((a, b) => {
        if (sort === "cheapest") {
          if (a.price == null) return 1;
          if (b.price == null) return -1;
          return a.price - b.price;
        }

        if (sort === "earliest") {
          return toMin(a.dep) - toMin(b.dep);
        }

        if (sort === "fastest") {
          return a.mins - b.mins;
        }

        return 0;
      });
  }, [allFlights, filters, sort]);

  const strip = useMemo(() => {
    const firstDay = date < todayISO() ? todayISO() : addDays(date, -3);

    return Array.from({ length: 7 }, (_, index) => addDays(firstDay, index));
  }, [date]);

  const base = flight
    ? Number(flight.price) *
      (flight.source === "duffel_test" ? 1 : paxCount)
    : 0;

  // No taxes are invented here. The actual fare/fee breakdown
  // must come from a verified source or backend calculation.

  /* Search a specific date through the backend */
  const searchForDate = async (selectedDate) => {
    setError("");

    if (!from || !to) {
      setError("Please select both departure and destination airports.");
      return;
    }

    if (from === to) {
      setError("Departure and destination must be different.");
      return;
    }

    if (!isValidISODate(selectedDate) || selectedDate < todayISO()) {
      setError("Please select today or a future date.");
      return;
    }

    setSearching(true);
    setRouteFlights([]);
    setProviderFlights([]);
    setProviderError("");
    setDate(selectedDate);

    try {
      const [databaseResult, providerResult] = await Promise.allSettled([
        searchFlights({ from, to, date: selectedDate }),
        searchDuffelOffers({
          from,
          to,
          date: selectedDate,
          adults: paxCount,
        }),
      ]);

      if (databaseResult.status === "rejected") throw databaseResult.reason;
      if (!Array.isArray(databaseResult.value)) {
        throw new Error("The flight search API returned an invalid response.");
      }

      const mappedFlights = databaseResult.value.map((item) => ({
        id: item.id,
        source: item.source || "database",
        airline: item.airline || "Airline unavailable",
        code: item.airlineCode || "",
        no: item.flightNumber || "",
        from: item.fromCode || from,
        to: item.toCode || to,
        dep: item.dep || "",
        arr: item.arr || "",
        mins: Number(item.mins) || 0,

        // Keep missing prices unavailable instead of turning them into zero.
        price:
          item.price != null && Number.isFinite(Number(item.price))
            ? Number(item.price)
            : null,

        currency: item.currency || "NPR",
        fareId: item.fareId ?? null,
        fareType: item.fareType || null,
        fareStatus: item.fareStatus || null,
        fareSource: item.fareSource || null,
        sourceVerifiedAt: item.sourceVerifiedAt || null,
        stops: item.stops ?? null,
      }));

      if (providerResult.status === "rejected") {
        setProviderError(providerResult.reason.message || "Duffel test offers are unavailable.");
      } else if (!Array.isArray(providerResult.value)) {
        setProviderError("Duffel returned an invalid offers response.");
      } else {
        setProviderFlights(
          providerResult.value.map((item) => ({
            id: item.id,
            source: "duffel_test",
            providerOfferId: item.providerOfferId,
            airline: item.airline || "Airline unavailable",
            code: item.airlineCode || "",
            no: item.flightNumber || "",
            from: item.fromCode || from,
            to: item.toCode || to,
            dep: item.dep || "",
            arr: item.arr || "",
            mins: Number(item.mins) || 0,
            stops: Number.isInteger(Number(item.stops))
              ? Number(item.stops)
              : null,
            price:
              item.price != null && Number.isFinite(Number(item.price))
                ? Number(item.price)
                : null,
            currency: item.currency || "",
            fareId: null,
            fareType: null,
            fareStatus: "provider_offer",
            sourceVerifiedAt: null,
            expiresAt: item.expiresAt || null,
          })),
        );
      }

      setRouteFlights(mappedFlights);
      setFilters({ airline: "All", time: "Any" });
      go("RESULTS");

      if (
        mappedFlights.length === 0 &&
        (providerResult.status === "rejected" ||
          !Array.isArray(providerResult.value) ||
          providerResult.value.length === 0)
      ) {
        setError("No schedules or Duffel test offers were found for this route and date.");
      }

    } catch (err) {
      setError(err.message || "Unable to search flights.");
    } finally {
      setSearching(false);
    }
  };

  const search = (event) => {
    event.preventDefault();
    searchForDate(date);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const choose = (selectedFlight) => {
    setFlight(selectedFlight);
    setPax(Array.from({ length: paxCount }, emptyPax));
    setBooking(null);
    setIdempotencyKey(crypto.randomUUID());
    go("CHECKOUT");
  };

  const updatePax = (index, key, value) => {
    setPax((current) =>
      current.map((person, i) =>
        i === index ? { ...person, [key]: value } : person,
      ),
    );
  };

  const toPayment = async (event) => {
    event.preventDefault();
    if (!flight || bookingLoading) return;

    if (
      pax.some(
        (person) =>
          !person.name.trim() ||
          !person.email.trim() ||
          !person.phone.trim() ||
          !person.doc.trim(),
      )
    ) {
      setError("Please complete the required passenger details.");
      return;
    }

    setBookingLoading(true);
    setError("");
    try {
      const result = await createDemoBooking(
        {
          source: flight.source,
          from,
          to,
          date,
          flightId: flight.id,
          fareId: flight.fareId,
          providerOfferId: flight.providerOfferId,
          passengers: pax,
        },
        idempotencyKey,
      );

      setBooking(result.data);
      go("REVIEW");
    } catch (err) {
      setError(err.message || "Unable to create the demo booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  const pay = async () => {
    if (!booking?.reference || paying) return;

    setPaying(true);
    setError("");
    try {
      const result = await simulateDemoPayment(booking.reference);
      setBooking(result.data);
      go("TICKET");
    } catch (err) {
      setError(err.message || "Unable to record the demo payment action.");
    } finally {
      setPaying(false);
    }
  };

  const reset = () => {
    setFlight(null);
    setBooking(null);
    setRouteFlights([]);
    setProviderFlights([]);
    setProviderError("");
    setPaying(false);
    setBookingLoading(false);
    setIdempotencyKey(crypto.randomUUID());
    setFilters({ airline: "All", time: "Any" });
    go("SEARCH");
  };

  const stepIndex = {
    RESULTS: 0,
    CHECKOUT: 1,
    REVIEW: 2,
    PAYMENT: 3,
    TICKET: 4,
  }[step];

  /* -----------------------------------------------------
     RENDER
  ----------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#F4F6EF] font-sans text-[#13294B]">
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body { background: #fff; }
        }
      `}</style>

      {/* Header */}
      <header className="no-print sticky top-0 z-40 bg-[#13294B] text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-lg font-black tracking-wide">
              <Plane className="h-5 w-5 -rotate-45" /> Tripzo
            </span>

            <span className="hidden sm:block">
              <span className="block text-sm font-black">Nepal flights</span>
              <span className="text-[11px] text-teal-300">
                Discover more. Travel better.
              </span>
            </span>
          </button>

          <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">
            Prices in source currency
          </span>
        </div>
      </header>

      {stepIndex !== undefined && (
        <div className="no-print">
          <Stepper current={stepIndex} />
        </div>
      )}

      {/* SEARCH */}
      {step === "SEARCH" && (
        <>
          <section className="relative overflow-hidden bg-[#13294B] px-4 py-16 text-white sm:py-24">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1920&q=80)",
              }}
            />

            <div className="relative mx-auto max-w-7xl">
              <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                Fly across Nepal in minutes, not hours.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                Search available flight schedules and fares in one place.
              </p>

              <form
                onSubmit={search}
                className="mt-10 rounded-2xl bg-white p-5 text-[#13294B] shadow-2xl sm:p-7"
              >
                <div className="grid items-end gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <label
                      htmlFor="from"
                      className="label mb-2 block text-xs font-bold text-slate-500"
                    >
                      From
                    </label>

                    <select
                      id="from"
                      required
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                      disabled={airportsLoading || !airportCodes.length}
                      className={input}
                    >
                      {airportCodes.map((code) => (
                        <option key={code} value={code}>
                          {airportLabel(code, airports)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-center md:col-span-1">
                    <button
                      type="button"
                      onClick={swap}
                      aria-label="Swap airports"
                      className="rounded-full border border-slate-200 p-3 text-teal-700 transition hover:bg-teal-50"
                    >
                      <ArrowRightLeft className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="md:col-span-3">
                    <label
                      htmlFor="to"
                      className="mb-2 block text-xs font-bold text-slate-500"
                    >
                      To
                    </label>

                    <select
                      id="to"
                      required
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                      disabled={airportsLoading || !airportCodes.length}
                      className={input}
                    >
                      {airportCodes.map((code) => (
                        <option key={code} value={code}>
                          {airportLabel(code, airports)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label
                      htmlFor="date"
                      className="mb-2 block text-xs font-bold text-slate-500"
                    >
                      Departure date
                    </label>

                    <input
                      id="date"
                      type="date"
                      min={todayISO()}
                      value={date}
                      required
                      onChange={(event) => setDate(event.target.value)}
                      className={input}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="pax"
                      className="mb-2 block text-xs font-bold text-slate-500"
                    >
                      Passengers
                    </label>

                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                      <Users className="h-5 w-5 text-teal-700" />

                      <select
                        id="pax"
                        value={paxCount}
                        onChange={(event) =>
                          setPaxCount(Number(event.target.value))
                        }
                        className="w-full bg-transparent text-sm outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map((number) => (
                          <option key={number} value={number}>
                            {number} {number === 1 ? "adult" : "adults"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-12">
                    <button
                      type="submit"
                      disabled={
                        searching || airportsLoading || !airportCodes.length
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-4 font-black text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {searching ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Searching flights...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          Search flights
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {airportsLoading && (
                  <p className="mt-3 text-sm text-slate-500">
                    Loading airports...
                  </p>
                )}

                {airportsError && (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-semibold text-red-600"
                  >
                    {airportsError}
                  </p>
                )}

                {error && (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-semibold text-red-600"
                  >
                    {error}
                  </p>
                )}
              </form>
            </div>
          </section>

          {/* Popular-route cards retained without invented prices */}
          <section className="mx-auto max-w-7xl px-4 py-14">
            <h2 className="text-2xl font-black">
              Popular routes from Kathmandu
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a destination to fill in the search form. Availability is
              checked when you search.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {["PKR", "LUA", "BWA"]
                .filter((code) => airportCodes.includes(code))
                .map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setFrom("KTM");
                      setTo(code);
                      scrollTop();
                    }}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">
                        <Clock className="mr-1 inline h-3.5 w-3.5" />
                        Check schedules
                      </span>
                      <Plane className="h-5 w-5 text-teal-700" />
                    </div>

                    <h3 className="font-black">
                      Kathmandu to {airportLabel(code, airports).split(" (")[0]}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Search current database records
                    </p>
                  </button>
                ))}
            </div>
          </section>
        </>
      )}

      {/* RESULTS */}
      {step === "RESULTS" && (
        <main className="mx-auto max-w-7xl px-4 pb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-black">
                {airportLabel(from, airports)} to {airportLabel(to, airports)}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {fmtDate(date, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                · {paxCount} {paxCount === 1 ? "adult" : "adults"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => go("SEARCH")}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-100"
            >
              Change search
            </button>
          </div>

          {/* Date strip: each date triggers a fresh API search */}
          <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              aria-label="Previous day"
              disabled={date <= todayISO() || searching}
              onClick={() => searchForDate(addDays(date, -1))}
              className="rounded-xl bg-white px-3 shadow-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {strip.map((day) => (
              <button
                key={day}
                type="button"
                disabled={searching || day < todayISO()}
                onClick={() => searchForDate(day)}
                aria-pressed={day === date}
                className={`min-w-[5.5rem] flex-1 rounded-xl px-3 py-2 text-center shadow-sm transition ${
                  day === date
                    ? "bg-teal-700 text-white"
                    : "bg-white hover:bg-teal-50"
                }`}
              >
                <span className="block text-xs">{fmtDate(day)}</span>
                <span className="block text-sm font-black">
                  {day === date ? "Selected date" : "Search offers"}
                </span>
              </button>
            ))}

            <button
              type="button"
              aria-label="Next day"
              disabled={searching}
              onClick={() => searchForDate(addDays(date, 1))}
              className="rounded-xl bg-white px-3 shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {to === "LUA" && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <CloudSun className="mt-0.5 h-4 w-4 shrink-0" />
              Lukla flights can be affected by weather. Confirm schedule
              information with the airline before travel.
            </p>
          )}

          {/* Filters only use information currently supplied by the API */}
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <select
                aria-label="Airline"
                value={filters.airline}
                onChange={(event) =>
                  setFilters({ ...filters, airline: event.target.value })
                }
                className={input}
              >
                {airlinesOnRoute.map((airline) => (
                  <option key={airline} value={airline}>
                    {airline === "All" ? "All airlines" : airline}
                  </option>
                ))}
              </select>

              <select
                aria-label="Departure time"
                value={filters.time}
                onChange={(event) =>
                  setFilters({ ...filters, time: event.target.value })
                }
                className={input}
              >
                {["Any", "Morning", "Afternoon", "Evening"].map((time) => (
                  <option key={time} value={time}>
                    {time === "Any" ? "Any departure time" : time}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort flights"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className={input}
              >
                <option value="cheapest">Cheapest first</option>
                <option value="earliest">Earliest first</option>
                <option value="fastest">Fastest first</option>
              </select>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
            >
              {error}
            </p>
          )}

          {providerError && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"
            >
              Duffel test offers are unavailable: {providerError} Local database
              schedules below are searched independently.
            </p>
          )}

          <p className="mb-3 mt-6 text-sm text-slate-600">
            {results.filter((item) => item.source === "database").length} local
            database schedules · {results.filter((item) => item.source === "duffel_test").length} Duffel
            test offers
          </p>

          <div className="space-y-5">
            {results.some((item) => item.source === "database") && (
              <section aria-labelledby="database-flights-heading" className="space-y-3">
                <h3 id="database-flights-heading" className="text-lg font-black">
                  Local database schedules
                </h3>
                {results
                  .filter((item) => item.source === "database")
                  .map((item) => (
                    <FlightCard
                      key={`database-${item.id}-${item.fareId ?? "unpriced"}`}
                      flight={item}
                      onSelect={choose}
                    />
                  ))}
              </section>
            )}

            {results.some((item) => item.source === "duffel_test") && (
              <section aria-labelledby="duffel-flights-heading" className="space-y-3">
                <h3 id="duffel-flights-heading" className="text-lg font-black">
                  Duffel test offers
                </h3>
                {results
                  .filter((item) => item.source === "duffel_test")
                  .map((item) => (
                    <FlightCard
                      key={`duffel-${item.providerOfferId}`}
                      flight={item}
                      onSelect={choose}
                    />
                  ))}
              </section>
            )}

            {!results.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-bold">
                  {searching
                    ? "Searching flight schedules..."
                    : "No flight schedules match your search."}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Try another date or route. No sample flights are being added.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setFilters({ airline: "All", time: "Any" });
                    go("SEARCH");
                  }}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-teal-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Change search
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* CHECKOUT */}
      {step === "CHECKOUT" && flight && (
        <main className="mx-auto max-w-6xl px-4 pb-10">
          <button
            type="button"
            onClick={() => go("RESULTS")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to flights
          </button>

          <div className="grid gap-6 lg:grid-cols-5">
            <form onSubmit={toPayment} className="space-y-6 lg:col-span-3">
              {pax.map((person, index) => (
                <fieldset
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <legend className="px-2 text-sm font-black">
                    Passenger {index + 1}
                  </legend>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        className="mb-1 block text-sm font-bold"
                        htmlFor={`name-${index}`}
                      >
                        Full name
                      </label>

                      <input
                        id={`name-${index}`}
                        required
                        autoComplete="name"
                        placeholder="Name as shown on ID"
                        value={person.name}
                        onChange={(event) =>
                          updatePax(index, "name", event.target.value)
                        }
                        className={input}
                      />
                    </div>

                    <div>
                      <label
                        className="mb-1 block text-sm font-bold"
                        htmlFor={`email-${index}`}
                      >
                        Email
                      </label>

                      <input
                        id={`email-${index}`}
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={person.email}
                        onChange={(event) =>
                          updatePax(index, "email", event.target.value)
                        }
                        className={input}
                      />
                    </div>

                    <div>
                      <label
                        className="mb-1 block text-sm font-bold"
                        htmlFor={`phone-${index}`}
                      >
                        Phone
                      </label>

                      <input
                        id={`phone-${index}`}
                        type="tel"
                        required
                        pattern="[+0-9 ]{7,16}"
                        placeholder="+977 98XXXXXXXX"
                        value={person.phone}
                        onChange={(event) =>
                          updatePax(index, "phone", event.target.value)
                        }
                        className={input}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        className="mb-1 block text-sm font-bold"
                        htmlFor={`document-${index}`}
                      >
                        Passport or citizenship number
                      </label>

                      <input
                        id={`document-${index}`}
                        required
                        minLength={5}
                        placeholder="Document number"
                        value={person.doc}
                        onChange={(event) =>
                          updatePax(index, "doc", event.target.value)
                        }
                        className={input}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Document details are checked for this demo request but are not saved.
                      </p>
                    </div>
                  </div>
                </fieldset>
              ))}

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-black">Seat selection</h3>

                <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                  Seat maps and seat availability are not supplied by the
                  current flight search API. No seat has been reserved or
                  assigned.
                </div>
              </section>

              {error && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full rounded-xl bg-teal-700 p-4 font-black text-white transition hover:bg-teal-800"
              >
                {bookingLoading ? "Saving demo booking..." : "Review demo booking"}{" "}
                {!bookingLoading && <ArrowRight className="ml-1 inline h-5 w-5" />}
              </button>
            </form>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24 lg:col-span-2">
              <h3 className="text-lg font-black">Trip summary</h3>

              <div className="my-4 rounded-xl bg-[#F4F6EF] p-4">
                <p className="font-black">
                  {flight.airline} · {flight.no}
                </p>

                <div className="my-3 flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black">{flight.from}</p>
                    <p className="text-xs text-slate-500">
                      {to12h(flight.dep)}
                    </p>
                  </div>

                  <Plane className="h-5 w-5 text-teal-700" />

                  <div className="text-right">
                    <p className="text-xl font-black">{flight.to}</p>
                    <p className="text-xs text-slate-500">
                      {to12h(flight.arr)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  <CalendarDays className="mr-1 inline h-4 w-4" />
                  {fmtDate(date, {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">
                    {flight.source === "duffel_test"
                      ? `Test offer total (${paxCount} adults)`
                      : `${paxCount} × unverified base fare`}
                  </dt>
                  <dd className="font-bold">
                    {formatFare(base, flight.currency)}
                  </dd>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <dt className="font-black">Current estimate</dt>
                  <dd className="text-xl font-black text-teal-700">
                    {formatFare(base, flight.currency)}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-slate-500">
                {flight.source === "duffel_test"
                  ? "Duffel test offers are refreshed by the backend before the demo booking is saved. No real order or ticket is created."
                  : "This stored database fare is unverified and may omit fees. It is informational only; no money is charged."}
              </p>
            </aside>
          </div>
        </main>
      )}

      {/* BOOKING REVIEW */}
      {step === "REVIEW" && flight && booking && (
        <main className="mx-auto max-w-3xl px-4 pb-10">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-black">Review demo booking</h1>
            <p className="mt-1 text-sm text-slate-500">
              The backend rechecked the selected schedule or refreshed the Duffel test offer.
            </p>

            <div className="mt-6 rounded-xl bg-[#F4F6EF] p-5">
              <p className="font-black">{booking.airline} · {booking.flightNumber}</p>
              <p className="mt-2 text-sm">
                {booking.fromCode} {booking.departureTime} → {booking.toCode} {booking.arrivalTime}
              </p>
              <p className="mt-1 text-sm text-slate-500">{fmtDate(date)}</p>
            </div>

            <h2 className="mt-6 font-black">Passengers</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              {booking.passengers.map((person, index) => (
                <li key={`${person.name}-${index}`}>{person.name}</li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
              <span className="font-bold">Database demo amount</span>
              <span className="text-xl font-black text-teal-700">
                {formatFare(booking.totalAmount, booking.currency)}
              </span>
            </div>

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {booking.fareStatus === "unverified"
                ? "This amount uses an unverified database base fare and may omit fees. It is informational only."
                : "This is a test/demo amount. It is not a final airline quote."}{" "}
              No reservation has been made and no money will be charged.
            </p>

            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={() => go("PAYMENT")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-4 font-black text-white"
            >
              Continue to demo payment <ArrowRight className="h-5 w-5" />
            </button>
          </section>
        </main>
      )}

      {/* DEMO PAYMENT */}
      {step === "PAYMENT" && flight && booking && (
        <main className="mx-auto max-w-lg px-4 pb-10">
          <button
            type="button"
            onClick={() => go("REVIEW")}
            disabled={paying}
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to review
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <h1 className="text-2xl font-black">Demo payment</h1>
            <p className="mt-2 text-xl font-black text-teal-700">
              {formatFare(booking.totalAmount, booking.currency)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {booking.fromCode} to {booking.toCode} · {fmtDate(date)} · {paxCount}{" "}
              {paxCount === 1 ? "adult" : "adults"}
            </p>

            <div className="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p className="font-black">Demo payment — no money charged</p>
              This records a simulated payment status in Tripzo. No card or payment provider is used.
            </div>

            {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={pay}
              disabled={paying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#13294B] p-4 font-black text-white disabled:opacity-70"
            >
              {paying ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Saving demo payment...</>
              ) : (
                "Record demo payment (no money charged)"
              )}
            </button>
          </div>
        </main>
      )}

      {/* DEMO CONFIRMATION — NOT AN AIRLINE TICKET */}
      {step === "TICKET" && booking && flight && (
        <main className="mx-auto max-w-2xl px-4 pb-10">
          <div className="rounded-2xl bg-[#13294B] p-8 text-center text-white">
            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-300" />
            <h1 className="mt-3 text-2xl font-black">Demo booking recorded</h1>
            <p className="mt-3 text-sm text-white/70">Demo booking reference</p>
            <p className="font-mono text-2xl font-black tracking-wider">
              {booking.reference}
            </p>
            <p className="mt-2 text-sm text-teal-200">
              Payment status: {booking.paymentStatus === "SIMULATED_SUCCESS" ? "SIMULATED — NO MONEY CHARGED" : "PENDING"}
            </p>
          </div>

          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Demo booking — not an airline-issued ticket. No airline reservation, seat, or real payment was created.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 font-black">
              <Ticket className="h-4 w-4" /> Itinerary summary
            </div>
            <p className="mt-4 font-bold">{booking.airline} · {booking.flightNumber}</p>
            <p className="mt-2 text-sm text-slate-600">
              {booking.fromCode} {booking.departureTime} → {booking.toCode} {booking.arrivalTime}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {fmtDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <ul className="mt-4 list-inside list-disc text-sm">
              {booking.passengers.map((person, index) => (
                <li key={`${person.name}-${index}`}>{person.name}</li>
              ))}
            </ul>
            <p className="mt-4 border-t border-slate-100 pt-4 text-lg font-black text-teal-700">
              {formatFare(booking.totalAmount, booking.currency)}
            </p>
          </div>

          <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-xl bg-white p-4 font-black text-slate-700 shadow-sm hover:bg-slate-100"
            >
              Book another flight
            </button>
          </div>
        </main>
      )}

      <footer className="no-print mt-10 border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <p className="font-black">Tripzo Nepal</p>
          <p className="text-xs text-slate-400">
            Local database schedules and Duffel test offers are shown separately.
            Bookings are stored as demos; payment is simulated and no ticket is issued.
          </p>
        </div>
      </footer>
    </div>
  );
}
