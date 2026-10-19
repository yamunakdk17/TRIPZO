import React, { useMemo, useState } from "react";
import {
  Plane, CalendarDays, Users, ArrowRightLeft, ArrowLeft, ArrowRight,
  CheckCircle2, Clock, Luggage, Wallet, Ticket, Search, RotateCcw,
  CloudSun, ChevronLeft, ChevronRight, Loader2, CreditCard, Printer,
} from "lucide-react";

/* ------------------------------------------------------------------
   DATA  (replace buildFlights() with your backend API call later)
------------------------------------------------------------------- */
const RATE = 128; // NPR per USD
const AIRPORTS = [
  { code: "KTM", city: "Kathmandu" },
  { code: "PKR", city: "Pokhara" },
  { code: "BWA", city: "Bhairahawa (Lumbini)" },
  { code: "BHR", city: "Bharatpur (Chitwan)" },
  { code: "LUA", city: "Lukla (Everest)" },
];
const airportLabel = (code) => {
  const a = AIRPORTS.find((x) => x.code === code);
  return a ? `${a.city} (${a.code})` : code;
};
const AIRLINE_CODES = { "Buddha Air": "BHA", "Yeti Airlines": "NYT", "Shree Airlines": "SHA", "Summit Air": "SMA" };

// [airline, flightNo, departure, price NPR, checked kg, refundable, seats]
const ROUTES = {
  "KTM-PKR": { mins: 25, list: [
    ["Shree Airlines", "SHA-121", "07:00", 5800, 20, true, 9],
    ["Buddha Air", "U4-603", "08:15", 5910, 25, true, 6],
    ["Yeti Airlines", "YT-671", "10:00", 5910, 20, false, 7],
    ["Shree Airlines", "SHA-125", "11:30", 6735, 0, false, 5],
    ["Buddha Air", "U4-607", "13:15", 6890, 25, true, 4],
    ["Yeti Airlines", "YT-675", "15:00", 6906, 0, false, 8],
    ["Shree Airlines", "SHA-129", "17:30", 7346, 20, true, 3],
  ] },
  "KTM-BWA": { mins: 35, list: [
    ["Buddha Air", "U4-601", "09:00", 6200, 25, true, 8],
    ["Yeti Airlines", "YT-301", "12:30", 6450, 20, false, 5],
    ["Shree Airlines", "SHA-211", "16:00", 6700, 0, false, 6],
  ] },
  "KTM-BHR": { mins: 15, list: [
    ["Yeti Airlines", "YT-201", "11:30", 5500, 20, false, 5],
    ["Buddha Air", "U4-241", "14:00", 5700, 25, true, 7],
  ] },
  "KTM-LUA": { mins: 30, list: [
    ["Summit Air", "SMA-101", "06:30", 14500, 10, false, 4],
    ["Summit Air", "SMA-103", "07:15", 14900, 10, false, 6],
  ] },
};

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toHHMM = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const to12h = (t) => {
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12}:${t.slice(3)} ${h >= 12 ? "PM" : "AM"}`;
};

// Builds both directions of every route (e.g. KTM-PKR and PKR-KTM)
function buildFlights() {
  const out = [];
  Object.entries(ROUTES).forEach(([key, r]) => {
    const [a, b] = key.split("-");
    [[a, b, false], [b, a, true]].forEach(([from, to, rev]) =>
      r.list.forEach(([airline, no, dep, price, bag, refundable, seats], i) => {
        const depT = rev ? toHHMM(toMin(dep) + 45 + i * 5) : dep;
        out.push({
          id: `${from}${to}-${no}${rev ? "R" : ""}`, airline, code: AIRLINE_CODES[airline],
          no: rev ? no.replace(/(\d+)$/, (n) => String(Number(n) + 1)) : no,
          from, to, dep: depT, arr: toHHMM(toMin(depT) + r.mins), mins: r.mins,
          price, bag, refundable, seats,
        });
      })
    );
  });
  return out;
}
const ALL_FLIGHTS = buildFlights();

/* ------------------------------------------------------------------
   HELPERS
------------------------------------------------------------------- */
const todayISO = () => new Date().toLocaleDateString("en-CA");
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};
const fmtDate = (iso, opt = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", opt);
// Deterministic fare variation per date so the date strip shows real differences
const dateFactor = (iso) => 1 + (((Number(iso.slice(8)) * 7) % 5) - 2) * 0.05;
const farePrice = (flight, iso) => Math.round((flight.price * dateFactor(iso)) / 10) * 10;
const money = (npr, cur) => (cur === "NPR" ? `NPR ${npr.toLocaleString("en-IN")}` : `$${Math.round(npr / RATE).toLocaleString("en-US")}`);
const TAX_RATE = 0.08;
const SEAT_COLS = ["A", "B", "C", "D"];
const takenSeats = (flightId) =>
  new Set(Array.from({ length: 12 }, (_, i) => {
    const n = (flightId.length * 7 + i * 13) % 40;
    return `${Math.floor(n / 4) + 1}${SEAT_COLS[n % 4]}`;
  }));
const emptyPax = () => ({ name: "", email: "", phone: "", doc: "", seat: "" });
const input = "w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";
const STEPS = ["Flights", "Passengers", "Payment", "Ticket"];

/* ------------------------------------------------------------------
   SMALL COMPONENTS
------------------------------------------------------------------- */
function Stepper({ current }) {
  return (
    <ol className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-5">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            i < current ? "bg-teal-700 text-white" : i === current ? "bg-[#13294B] text-white" : "bg-slate-200 text-slate-500"}`}>
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </span>
          <span className={`hidden text-sm font-semibold sm:block ${i === current ? "text-[#13294B]" : "text-slate-400"}`}>{s}</span>
          {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-300" />}
        </li>
      ))}
    </ol>
  );
}

function FlightCard({ f, price, cur, onSelect }) {
  const low = f.seats <= 4;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
      <div className="grid items-center gap-5 lg:grid-cols-[1.1fr_1.6fr_1fr_auto]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-sm font-black text-teal-800">{f.code}</div>
          <div>
            <h3 className="font-bold">{f.airline}</h3>
            <p className="text-xs text-slate-500">{f.no}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div><p className="text-xl font-black">{to12h(f.dep)}</p><p className="text-xs font-semibold text-slate-500">{f.from}</p></div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] text-slate-500">{f.mins} min</span>
            <div className="relative w-full border-t border-dashed border-teal-500">
              <Plane className="absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white text-teal-700" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-700">Non-stop</span>
          </div>
          <div className="text-right"><p className="text-xl font-black">{to12h(f.arr)}</p><p className="text-xs font-semibold text-slate-500">{f.to}</p></div>
        </div>

        <ul className="space-y-1 text-xs text-slate-600">
          <li className="flex items-center gap-2"><Luggage className="h-4 w-4 text-slate-400" />
            {f.bag ? `${f.bag} kg checked + 5 kg cabin` : "Cabin bag only (5 kg)"}</li>
          <li>{f.refundable ? <span className="font-semibold text-emerald-700">Refundable</span> : <span className="font-semibold text-amber-700">Non-refundable</span>}</li>
          <li className={low ? "font-semibold text-red-600" : ""}>{low ? `Only ${f.seats} seats left` : `${f.seats} seats left`}</li>
        </ul>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
          <div className="lg:text-right">
            <p className="text-xs text-slate-500">per adult</p>
            <p className="text-2xl font-black text-teal-700">{money(price, cur)}</p>
          </div>
          <button type="button" onClick={() => onSelect(f)}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
            Select <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function SeatMap({ flightId, pax, active, onPick }) {
  const taken = useMemo(() => takenSeats(flightId), [flightId]);
  const mine = pax.map((p) => p.seat);
  return (
    <div className="mx-auto w-fit rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 grid grid-cols-[1.5rem_repeat(2,2.5rem)_1rem_repeat(2,2.5rem)] gap-1.5 text-center text-xs font-semibold text-slate-400">
        <span /> <span>A</span><span>B</span><span /><span>C</span><span>D</span>
      </div>
      {Array.from({ length: 10 }, (_, r) => r + 1).map((row) => (
        <div key={row} className="mb-1.5 grid grid-cols-[1.5rem_repeat(2,2.5rem)_1rem_repeat(2,2.5rem)] items-center gap-1.5">
          <span className="text-xs text-slate-400">{row}</span>
          {SEAT_COLS.flatMap((c, i) => {
            const id = `${row}${c}`;
            const isTaken = taken.has(id);
            const owner = mine.indexOf(id);
            const btn = (
              <button key={id} type="button" disabled={isTaken || (owner >= 0 && owner !== active)}
                aria-label={`Seat ${id}${isTaken ? " taken" : ""}`}
                onClick={() => onPick(id)}
                className={`h-10 rounded-lg text-[11px] font-bold transition ${
                  isTaken ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : owner === active ? "bg-teal-700 text-white"
                  : owner >= 0 ? "bg-[#13294B] text-white"
                  : "border border-slate-300 bg-white hover:border-teal-600"}`}>
                {owner >= 0 ? `P${owner + 1}` : isTaken ? "×" : c}
              </button>
            );
            return i === 1 ? [btn, <span key={`${row}gap`} />] : [btn];
          })}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
   MAIN
------------------------------------------------------------------- */
export default function TripzoFlightBooking() {
  const [cur, setCur] = useState("NPR");
  const [step, setStep] = useState("SEARCH");
  const [from, setFrom] = useState("KTM");
  const [to, setTo] = useState("PKR");
  const [date, setDate] = useState(addDays(todayISO(), 7));
  const [paxCount, setPaxCount] = useState(1);
  const [flight, setFlight] = useState(null);
  const [pax, setPax] = useState([emptyPax()]);
  const [active, setActive] = useState(0);
  const [method, setMethod] = useState("Khalti");
  const [paying, setPaying] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [filters, setFilters] = useState({ airline: "All", time: "Any", refundable: false, bag: false });
  const [sort, setSort] = useState("cheapest");
  const [error, setError] = useState("");

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const go = (s) => { setStep(s); setError(""); scrollTop(); };

  const routeFlights = useMemo(() => ALL_FLIGHTS.filter((f) => f.from === from && f.to === to), [from, to]);
  const airlinesOnRoute = useMemo(() => ["All", ...new Set(routeFlights.map((f) => f.airline))], [routeFlights]);

  const results = useMemo(() => {
    const slot = (t) => { const h = Number(t.slice(0, 2)); return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening"; };
    return routeFlights
      .filter((f) => filters.airline === "All" || f.airline === filters.airline)
      .filter((f) => filters.time === "Any" || slot(f.dep) === filters.time)
      .filter((f) => !filters.refundable || f.refundable)
      .filter((f) => !filters.bag || f.bag > 0)
      .sort((a, b) =>
        sort === "cheapest" ? farePrice(a, date) - farePrice(b, date)
        : sort === "earliest" ? toMin(a.dep) - toMin(b.dep)
        : a.mins - b.mins);
  }, [routeFlights, filters, sort, date]);

  const lowestFare = routeFlights.length ? Math.min(...routeFlights.map((f) => farePrice(f, date))) : 0;

  // Date strip: 7 days around the chosen date, never in the past
  const strip = useMemo(() => {
    const start = [addDays(date, -3), todayISO()].sort().pop();
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date]);

  const unit = flight ? farePrice(flight, date) : 0;
  const base = unit * paxCount;
  const taxes = Math.round(base * TAX_RATE);
  const total = base + taxes;

  /* ---------- handlers ---------- */
  const search = (e) => {
    e.preventDefault();
    if (from === to) return setError("Departure and destination must be different.");
    if (!routeFlights.length) return setError("No direct flights on this route yet. Try a route to or from Kathmandu.");
    setFilters({ airline: "All", time: "Any", refundable: false, bag: false });
    go("RESULTS");
  };
  const swap = () => { setFrom(to); setTo(from); };
  const choose = (f) => {
    setFlight(f);
    setPax(Array.from({ length: paxCount }, emptyPax));
    setActive(0);
    go("CHECKOUT");
  };
  const updatePax = (i, key, value) => setPax((p) => p.map((x, idx) => (idx === i ? { ...x, [key]: value } : x)));
  const pickSeat = (id) => updatePax(active, "seat", pax[active].seat === id ? "" : id);

  const toPayment = (e) => {
    e.preventDefault();
    if (pax.some((p) => !p.seat)) return setError("Choose a seat for every passenger.");
    go("PAYMENT");
  };

  // DEMO ONLY: replace with a real call to your backend / Khalti / eSewa verification.
  const pay = () => {
    setPaying(true);
    setTimeout(() => {
      setTicket({
        pnr: `TPZ${Math.floor(100000 + Math.random() * 900000)}`,
        flight, pax: pax.map((p) => ({ ...p })), date, total, cur, method,
        issued: new Date().toLocaleString("en-GB"),
      });
      setPaying(false);
      go("TICKET");
    }, 1600);
  };
  const reset = () => { setFlight(null); setTicket(null); setPaying(false); go("SEARCH"); };

  const stepIndex = { RESULTS: 0, CHECKOUT: 1, PAYMENT: 2, TICKET: 3 }[step];

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-[#F4F6EF] font-sans text-[#13294B]">
      <style>{`@media print{header,footer,.no-print{display:none!important}body{background:#fff}}`}</style>

      <header className="no-print sticky top-0 z-40 bg-[#13294B] text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={reset} className="flex items-center gap-3 text-left">
            <span className="flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-lg font-black tracking-wide">
              <Plane className="h-5 w-5 -rotate-45" /> Tripzo
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-black">Nepal flights</span>
              <span className="text-[11px] text-teal-300">Discover more. Travel better.</span>
            </span>
          </button>
          <div className="flex gap-1 rounded-xl bg-white/10 p-1">
            {["NPR", "USD"].map((c) => (
              <button key={c} type="button" onClick={() => setCur(c)} aria-pressed={cur === c}
                className={`rounded-lg px-4 py-2 text-xs font-bold ${cur === c ? "bg-teal-600" : "text-white/70 hover:text-white"}`}>{c}</button>
            ))}
          </div>
        </div>
      </header>

      {stepIndex !== undefined && <div className="no-print"><Stepper current={stepIndex} /></div>}

      {/* ============ SEARCH ============ */}
      {step === "SEARCH" && (
        <>
          <section className="relative overflow-hidden bg-[#13294B] px-4 py-16 text-white sm:py-24">
            <div className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{ backgroundImage: "url(https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1920&q=80)" }} />
            <div className="relative mx-auto max-w-7xl">
              <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                Fly across Nepal in minutes, not hours.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                Compare domestic airlines, pick your seat and get your e-ticket in one place.
              </p>

              <form onSubmit={search} className="mt-10 rounded-2xl bg-white p-5 text-[#13294B] shadow-2xl sm:p-7">
                <div className="grid items-end gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <label htmlFor="from" className="mb-2 block text-xs font-bold text-slate-500">From</label>
                    <select id="from" value={from} onChange={(e) => setFrom(e.target.value)} className={input}>
                      {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{airportLabel(a.code)}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-center md:col-span-1">
                    <button type="button" onClick={swap} aria-label="Swap airports"
                      className="rounded-full border border-slate-200 p-3 text-teal-700 transition hover:bg-teal-50">
                      <ArrowRightLeft className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="md:col-span-3">
                    <label htmlFor="to" className="mb-2 block text-xs font-bold text-slate-500">To</label>
                    <select id="to" value={to} onChange={(e) => setTo(e.target.value)} className={input}>
                      {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{airportLabel(a.code)}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label htmlFor="date" className="mb-2 block text-xs font-bold text-slate-500">Departure date</label>
                    <input id="date" type="date" min={todayISO()} value={date} required
                      onChange={(e) => setDate(e.target.value)} className={input} />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="pax" className="mb-2 block text-xs font-bold text-slate-500">Passengers</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                      <Users className="h-5 w-5 text-teal-700" />
                      <select id="pax" value={paxCount} onChange={(e) => setPaxCount(Number(e.target.value))}
                        className="w-full bg-transparent text-sm outline-none">
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? "adult" : "adults"}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-12">
                    <button type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-4 font-black text-white transition hover:bg-teal-800">
                      <Search className="h-5 w-5" /> Search flights
                    </button>
                  </div>
                </div>
                {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
              </form>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-14">
            <h2 className="text-2xl font-black">Popular routes from Kathmandu</h2>
            <p className="mt-1 text-sm text-slate-500">Tap a route to fill in the search.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {["PKR", "LUA", "BWA"].map((code) => {
                const r = ROUTES[`KTM-${code}`];
                const min = Math.min(...r.list.map((x) => x[3]));
                return (
                  <button key={code} type="button" onClick={() => { setFrom("KTM"); setTo(code); scrollTop(); }}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">
                        <Clock className="mr-1 inline h-3.5 w-3.5" />{r.mins} min
                      </span>
                      <Plane className="h-5 w-5 text-teal-700" />
                    </div>
                    <h3 className="font-black">Kathmandu to {airportLabel(code).split(" (")[0]}</h3>
                    <p className="mt-2 text-sm text-slate-500">From {money(min, cur)}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ============ RESULTS ============ */}
      {step === "RESULTS" && (
        <main className="mx-auto max-w-7xl px-4 pb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-black">{airportLabel(from)} to {airportLabel(to)}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {fmtDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {paxCount} {paxCount === 1 ? "adult" : "adults"}
              </p>
            </div>
            <button type="button" onClick={() => go("SEARCH")}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-100">Change search</button>
          </div>

          {/* date strip */}
          <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-1">
            <button type="button" aria-label="Previous day" disabled={date <= todayISO()} onClick={() => setDate(addDays(date, -1))}
              className="rounded-xl bg-white px-3 shadow-sm disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
            {strip.map((d) => {
              const cheapest = routeFlights.length ? Math.min(...routeFlights.map((f) => farePrice(f, d))) : 0;
              return (
                <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={d === date}
                  className={`min-w-[5.5rem] flex-1 rounded-xl px-3 py-2 text-center shadow-sm transition ${d === date ? "bg-teal-700 text-white" : "bg-white hover:bg-teal-50"}`}>
                  <span className="block text-xs">{fmtDate(d)}</span>
                  <span className={`block text-sm font-black ${d !== date && cheapest === lowestFare ? "text-emerald-700" : ""}`}>{money(cheapest, cur)}</span>
                </button>
              );
            })}
            <button type="button" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}
              className="rounded-xl bg-white px-3 shadow-sm"><ChevronRight className="h-5 w-5" /></button>
          </div>

          {to === "LUA" && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <CloudSun className="mt-0.5 h-4 w-4 shrink-0" />
              Lukla flights depend on weather and often shift or cancel. Keep a spare day in your plan.
            </p>
          )}

          {/* filters */}
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select aria-label="Airline" value={filters.airline} onChange={(e) => setFilters({ ...filters, airline: e.target.value })} className={input}>
                {airlinesOnRoute.map((a) => <option key={a} value={a}>{a === "All" ? "All airlines" : a}</option>)}
              </select>
              <select aria-label="Departure time" value={filters.time} onChange={(e) => setFilters({ ...filters, time: e.target.value })} className={input}>
                {["Any", "Morning", "Afternoon", "Evening"].map((t) => <option key={t} value={t}>{t === "Any" ? "Any departure time" : t}</option>)}
              </select>
              <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={input}>
                <option value="cheapest">Cheapest first</option>
                <option value="earliest">Earliest first</option>
                <option value="fastest">Fastest first</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                <input type="checkbox" checked={filters.refundable} onChange={(e) => setFilters({ ...filters, refundable: e.target.checked })} /> Refundable only
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                <input type="checkbox" checked={filters.bag} onChange={(e) => setFilters({ ...filters, bag: e.target.checked })} /> Checked bag included
              </label>
            </div>
          </div>

          <p className="mb-3 mt-6 text-sm text-slate-600">
            {results.length} {results.length === 1 ? "flight" : "flights"} · lowest fare {money(lowestFare, cur)}
          </p>
          <div className="space-y-3">
            {results.map((f) => <FlightCard key={f.id} f={f} price={farePrice(f, date)} cur={cur} onSelect={choose} />)}
            {!results.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-bold">No flights match these filters.</p>
                <button type="button" onClick={() => setFilters({ airline: "All", time: "Any", refundable: false, bag: false })}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-teal-700"><RotateCcw className="h-4 w-4" />Clear filters</button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ============ CHECKOUT ============ */}
      {step === "CHECKOUT" && flight && (
        <main className="mx-auto max-w-6xl px-4 pb-10">
          <button type="button" onClick={() => go("RESULTS")} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
            <ArrowLeft className="h-4 w-4" /> Back to flights
          </button>
          <div className="grid gap-6 lg:grid-cols-5">
            <form onSubmit={toPayment} className="space-y-6 lg:col-span-3">
              {pax.map((p, i) => (
                <fieldset key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <legend className="px-2 text-sm font-black">Passenger {i + 1}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-bold" htmlFor={`n${i}`}>Full name</label>
                      <input id={`n${i}`} required autoComplete="name" placeholder="Name as shown on ID" value={p.name}
                        onChange={(e) => updatePax(i, "name", e.target.value)} className={input} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold" htmlFor={`e${i}`}>Email</label>
                      <input id={`e${i}`} type="email" required={i === 0} placeholder="you@example.com" value={p.email}
                        onChange={(e) => updatePax(i, "email", e.target.value)} className={input} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold" htmlFor={`p${i}`}>Phone</label>
                      <input id={`p${i}`} type="tel" required={i === 0} pattern="[+0-9 ]{7,16}" placeholder="+977 98XXXXXXXX" value={p.phone}
                        onChange={(e) => updatePax(i, "phone", e.target.value)} className={input} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-bold" htmlFor={`d${i}`}>Passport or citizenship number</label>
                      <input id={`d${i}`} required minLength={5} placeholder="Document number" value={p.doc}
                        onChange={(e) => updatePax(i, "doc", e.target.value)} className={input} />
                    </div>
                  </div>
                </fieldset>
              ))}

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-black">Choose seats</h3>
                <div className="my-3 flex flex-wrap gap-2">
                  {pax.map((p, i) => (
                    <button key={i} type="button" onClick={() => setActive(i)} aria-pressed={active === i}
                      className={`rounded-full px-4 py-2 text-xs font-bold ${active === i ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {p.name.split(" ")[0] || `Passenger ${i + 1}`}: {p.seat || "no seat"}
                    </button>
                  ))}
                </div>
                <SeatMap flightId={flight.id} pax={pax} active={active} onPick={pickSeat} />
                <p className="mt-3 text-center text-xs text-slate-500">
                  Demo seat map. Real availability comes from the airline or your booking backend.
                </p>
              </section>

              {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
              <button type="submit" className="w-full rounded-xl bg-teal-700 p-4 font-black text-white transition hover:bg-teal-800">
                Continue to payment <ArrowRight className="ml-1 inline h-5 w-5" />
              </button>
            </form>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24 lg:col-span-2">
              <h3 className="text-lg font-black">Trip summary</h3>
              <div className="my-4 rounded-xl bg-[#F4F6EF] p-4">
                <p className="font-black">{flight.airline} · {flight.no}</p>
                <div className="my-3 flex items-center justify-between">
                  <div><p className="text-xl font-black">{flight.from}</p><p className="text-xs text-slate-500">{to12h(flight.dep)}</p></div>
                  <Plane className="h-5 w-5 text-teal-700" />
                  <div className="text-right"><p className="text-xl font-black">{flight.to}</p><p className="text-xs text-slate-500">{to12h(flight.arr)}</p></div>
                </div>
                <p className="text-xs text-slate-500"><CalendarDays className="mr-1 inline h-4 w-4" />{fmtDate(date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">{paxCount} × adult fare</dt><dd className="font-bold">{money(base, cur)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Taxes and fees</dt><dd className="font-bold">{money(taxes, cur)}</dd></div>
                <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="font-black">Total</dt><dd className="text-xl font-black text-teal-700">{money(total, cur)}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-slate-500">{flight.refundable ? "This fare is refundable." : "This fare is non-refundable."}</p>
            </aside>
          </div>
        </main>
      )}

      {/* ============ PAYMENT ============ */}
      {step === "PAYMENT" && flight && (
        <main className="mx-auto max-w-lg px-4 pb-10">
          <button type="button" onClick={() => go("CHECKOUT")} disabled={paying}
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700 disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> Back to passengers
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <h1 className="text-2xl font-black">Pay {money(total, cur)}</h1>
            <p className="mt-1 text-sm text-slate-500">{flight.from} to {flight.to} · {fmtDate(date)} · {paxCount} {paxCount === 1 ? "adult" : "adults"}</p>

            <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Payment method">
              {[
                { name: "Khalti", icon: Wallet, color: "border-purple-600 bg-purple-50" },
                { name: "eSewa", icon: Wallet, color: "border-green-600 bg-green-50" },
                { name: "Card", icon: CreditCard, color: "border-teal-600 bg-teal-50" },
              ].map(({ name, icon: Icon, color }) => (
                <button key={name} type="button" role="radio" aria-checked={method === name} onClick={() => setMethod(name)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left font-bold ${method === name ? color : "border-slate-200"}`}>
                  <Icon className="h-5 w-5" /> {name === "Card" ? "Debit or credit card" : name}
                </button>
              ))}
            </div>

            <div className="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              <p className="font-black">Demo mode</p>
              The button below simulates a successful payment. It does not charge money or contact {method}.
            </div>

            <button type="button" onClick={pay} disabled={paying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#13294B] p-4 font-black text-white transition hover:bg-[#1c3a69] disabled:opacity-70">
              {paying ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing payment</> : <>Simulate {method} payment</>}
            </button>
          </div>
        </main>
      )}

      {/* ============ TICKET ============ */}
      {step === "TICKET" && ticket && (
        <main className="mx-auto max-w-2xl px-4 pb-10">
          <div className="rounded-2xl bg-[#13294B] p-8 text-center text-white">
            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-300" />
            <h1 className="mt-3 text-2xl font-black">Booking confirmed</h1>
            <p className="mt-3 text-sm text-white/70">Booking reference</p>
            <p className="font-mono text-3xl font-black tracking-wider">{ticket.pnr}</p>
          </div>

          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This is a demo ticket from the frontend. It is not a real airline ticket or proof of payment.
          </p>

          <div className="mt-4 space-y-4">
            {ticket.pax.map((p, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between bg-teal-700 px-6 py-3 text-white">
                  <span className="flex items-center gap-2 font-black"><Ticket className="h-4 w-4" /> Boarding pass</span>
                  <span className="text-sm">{ticket.flight.airline} · {ticket.flight.no}</span>
                </div>
                <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs text-slate-500">Passenger</p>
                    <p className="text-lg font-black">{p.name}</p>
                    <div className="my-4 flex items-center gap-4">
                      <div><p className="text-3xl font-black">{ticket.flight.from}</p><p className="text-xs text-slate-500">{to12h(ticket.flight.dep)}</p></div>
                      <Plane className="h-5 w-5 rotate-45 text-teal-700" />
                      <div><p className="text-3xl font-black">{ticket.flight.to}</p><p className="text-xs text-slate-500">{to12h(ticket.flight.arr)}</p></div>
                    </div>
                    <p className="text-sm text-slate-600">{fmtDate(ticket.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <div className="flex gap-6 border-t border-dashed border-slate-300 pt-4 sm:flex-col sm:gap-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <div><p className="text-xs text-slate-500">Seat</p><p className="text-2xl font-black">{p.seat}</p></div>
                    <div><p className="text-xs text-slate-500">Bags</p><p className="text-sm font-bold">{ticket.flight.bag ? `${ticket.flight.bag} kg + 5 kg` : "5 kg cabin"}</p></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-5 text-sm shadow-sm">
            <span className="text-slate-500">Paid with {ticket.method} on {ticket.issued}</span>
            <span className="text-lg font-black text-teal-700">{money(ticket.total, ticket.cur)}</span>
          </div>

          <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => window.print()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 p-4 font-black text-white hover:bg-teal-800">
              <Printer className="h-5 w-5" /> Print or save PDF
            </button>
            <button type="button" onClick={reset}
              className="flex-1 rounded-xl bg-white p-4 font-black text-slate-700 shadow-sm hover:bg-slate-100">Book another flight</button>
          </div>
        </main>
      )}

      <footer className="no-print mt-10 border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <p className="font-black">Tripzo Nepal</p>
          <p className="text-xs text-slate-400">Sample flight data · demo booking interface</p>
        </div>
      </footer>
    </div>
  );
}

