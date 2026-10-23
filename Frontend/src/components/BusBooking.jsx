import React, { useEffect, useMemo, useState } from "react";
import {
  Bus, Car, Zap, Leaf, Snowflake, Mountain, MapPin, Star, Clock,
  ArrowRightLeft, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Printer,
  ShieldCheck, Tag, Wallet, CreditCard, CalendarDays, Sparkles, Gauge,
  X, Timer, Smartphone, Lock, Share2, AlertCircle, CalendarPlus, Ticket, History,
} from "lucide-react";

/* ------------------------------------------------------------------
   DATA  (swap buildTrips() for your backend API later)
------------------------------------------------------------------- */
const RATE = 128;
const PLACES = {
  KTM: "Kathmandu", PKR: "Pokhara", CHT: "Chitwan (Sauraha)",
  LUM: "Lumbini", JNK: "Janakpur", JOM: "Jomsom",
};
const POINTS = {
  KTM: ["Kalanki", "Gongabu Bus Park", "Balkhu"], PKR: ["Tourist Bus Park", "Prithvi Chowk"],
  CHT: ["Sauraha Chowk", "Bharatpur Bus Park"], LUM: ["Bhairahawa Bus Park", "Lumbini Gate"],
  JNK: ["Janakpur Bus Park"], JOM: ["Jomsom Bus Stand"],
};
// stops: [name, altitude in metres] — drives the route profile
const ROUTES = [
  { a: "KTM", b: "PKR", km: 200, h: 7, cls: ["deluxe", "ac", "ev", "lux", "jeep"],
    stops: [["Kathmandu", 1400], ["Naubise", 1000], ["Mugling", 300], ["Dumre", 440], ["Pokhara", 820]] },
  { a: "KTM", b: "CHT", km: 150, h: 5.5, cls: ["deluxe", "ac", "ev", "lux"],
    stops: [["Kathmandu", 1400], ["Naubise", 1000], ["Mugling", 300], ["Narayanghat", 200], ["Sauraha", 150]] },
  { a: "KTM", b: "LUM", km: 270, h: 9, cls: ["deluxe", "ac", "ev", "lux"],
    stops: [["Kathmandu", 1400], ["Mugling", 300], ["Narayanghat", 200], ["Butwal", 150], ["Lumbini", 100]] },
  { a: "KTM", b: "JNK", km: 225, h: 8, cls: ["deluxe", "ac", "lux"],
    stops: [["Kathmandu", 1400], ["Sindhuli", 800], ["Bardibas", 200], ["Janakpur", 75]] },
  { a: "PKR", b: "CHT", km: 170, h: 5.5, cls: ["deluxe", "ac", "ev"],
    stops: [["Pokhara", 820], ["Dumre", 440], ["Mugling", 300], ["Sauraha", 150]] },
  { a: "PKR", b: "JOM", km: 160, h: 9, cls: ["jeep"],
    stops: [["Pokhara", 820], ["Beni", 830], ["Tatopani", 1190], ["Marpha", 2670], ["Jomsom", 2720]] },
];
const L22 = ["A", "B", "", "C", "D"];
const CLASSES = {
  deluxe: { name: "Deluxe", icon: Bus, color: "#64748B", rate: 4.2, speed: 1, co2: 68, comfort: 3, cols: L22, rows: 10,
    amen: ["Fan", "Reclining seat"], times: ["06:00", "15:30"] },
  ac: { name: "AC Deluxe", icon: Snowflake, color: "#2563EB", rate: 5.6, speed: 1, co2: 68, comfort: 4, cols: L22, rows: 10,
    amen: ["AC", "USB charging", "Blanket"], times: ["07:00", "13:00", "20:00"] },
  ev: { name: "Electric (EV)", icon: Zap, color: "#0E9F6E", rate: 5.9, speed: 1.05, co2: 18, comfort: 4, cols: L22, rows: 10,
    amen: ["AC", "Wi-Fi", "Silent ride"], times: ["06:30", "14:00"] },
  lux: { name: "Tourist Luxury", icon: Star, color: "#B7791F", rate: 8, speed: 1, co2: 72, comfort: 5, cols: ["A", "", "B", "C"], rows: 10,
    amen: ["Wi-Fi", "Snack", "Wide recliner"], times: ["08:00", "21:30"] },
  jeep: { name: "Jeep", icon: Car, color: "#C2410C", rate: 7.5, speed: 0.95, co2: 55, comfort: 2, cols: ["A", "B", "C"], rows: 3,
    amen: ["Mountain roads", "Shared jeep"], times: ["05:30", "08:00"] },
};
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function buildTrips() {
  const out = [];
  ROUTES.forEach((r) =>
    [false, true].forEach((rev) => {
      const from = rev ? r.b : r.a, to = rev ? r.a : r.b;
      r.cls.forEach((c) => {
        const k = CLASSES[c];
        k.times.forEach((t, i) => {
          const id = `${from}${to}-${c}-${i}`;
          const total = k.rows * k.cols.filter(Boolean).length;
          out.push({ id, from, to, cls: c, dep: t, mins: Math.round((r.h * 60) / k.speed), km: r.km,
            base: k.rate * r.km, total, rating: (4 + (hash(id) % 9) / 10).toFixed(1),
            stops: rev ? [...r.stops].reverse() : r.stops });
        });
      });
    })
  );
  return out;
}
const TRIPS = buildTrips();

/* ------------------------------------------------------------------
   HELPERS
------------------------------------------------------------------- */
const todayISO = () => new Date().toLocaleDateString("en-CA");
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-CA"); };
const fmtDate = (iso, o = { weekday: "short", day: "numeric", month: "short" }) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", o);
const isWeekend = (iso) => [5, 6].includes(new Date(`${iso}T00:00:00`).getDay());
const fare = (t, date) => Math.round((t.base * (isWeekend(date) ? 1.1 : 1)) / 10) * 10;
const money = (n, cur) => (cur === "NPR" ? `NPR ${n.toLocaleString("en-IN")}` : `$${Math.round(n / RATE)}`);
const dur = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
const to12 = (t) => { const h = +t.slice(0, 2); return `${h % 12 || 12}:${t.slice(3)} ${h >= 12 ? "PM" : "AM"}`; };
const arrive = (dep, mins) => { const m = +dep.slice(0, 2) * 60 + +dep.slice(3) + mins; const d = Math.floor(m / 1440);
  return { t: `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, next: d > 0 }; };
const seatIds = (k) => Array.from({ length: k.rows }, (_, r) => k.cols.map((c) => (c ? `${r + 1}${c}` : null)));
const isTaken = (tripId, id) => hash(tripId + id) % 100 < 28;
const left = (t) => seatIds(CLASSES[t.cls]).flat().filter((s) => s && !isTaken(t.id, s)).length;
const co2 = (t) => Math.round((CLASSES[t.cls].co2 * t.km) / 100) / 10; // kg per passenger
const emptyPax = () => ({ name: "", phone: "", gender: "Male", seat: "" });
const field = "w-full rounded-lg border-2 border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#1B2430]";
const STEPS = ["Search", "Choose", "Seats", "Pay", "Ticket"];
const HOLD_SECONDS = 10 * 60; // how long seats stay reserved while the person books
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const boardBy = (dep) => { const m = (+dep.slice(0, 2) * 60 + +dep.slice(3) - 30 + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const luhn = (num) => { let sum = 0, dbl = false; for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } sum += d; dbl = !dbl; } return num.length >= 13 && sum % 10 === 0; };
const fmtCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const fmtExp = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
const expOk = (v) => { const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false; const mo = +m[1], yr = 2000 + +m[2]; const n = new Date(); return mo >= 1 && mo <= 12 && (yr > n.getFullYear() || (yr === n.getFullYear() && mo >= n.getMonth() + 1)); };
const phoneOk = (v) => /^9[78]\d{8}$/.test(v);
const store = {
  read: () => { try { return JSON.parse(localStorage.getItem("tripzo-bookings") || "[]"); } catch { return []; } },
  write: (v) => { try { localStorage.setItem("tripzo-bookings", JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
function downloadIcs(t) {
  const a = arrive(t.trip.dep, t.trip.mins), d = t.date.replace(/-/g, ""), e = (a.next ? addDays(t.date, 1) : t.date).replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tripzo//Bus//EN", "BEGIN:VEVENT", `UID:${t.pnr}@tripzo`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${d}T${t.trip.dep.replace(":", "")}00`, `DTEND:${e}T${a.t.replace(":", "")}00`,
    `SUMMARY:Bus to ${PLACES[t.trip.to]} (${t.pnr})`, `LOCATION:${t.board}`,
    `DESCRIPTION:Seats ${t.pax.map((p) => p.seat).join(" ")}. Arrive 30 minutes early.`, "END:VEVENT", "END:VCALENDAR"];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `tripzo-${t.pnr}.ics` });
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------
   PARTS
------------------------------------------------------------------- */
function Road({ at }) {
  return (
    <div className="no-print mx-auto max-w-3xl px-6 pb-2 pt-5" aria-label={`Step ${at + 1} of 5: ${STEPS[at]}`}>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 border-t-4 border-dashed border-slate-300" />
        <div className="absolute left-0 top-1/2 border-t-4 border-[#F2B01E]" style={{ width: `${(at / 4) * 100}%` }} />
        {STEPS.map((s, i) => (
          <span key={s} className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${i <= at ? "bg-[#1B2430]" : "bg-slate-300"}`}
            style={{ left: `${(i / 4) * 100}%` }} />
        ))}
        <Bus className="absolute top-0 h-7 w-7 -translate-x-1/2 rounded bg-[#F3F5F7] text-[#D62839] transition-all duration-500" style={{ left: `${(at / 4) * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500">{STEPS.map((s, i) => <span key={s} className={i === at ? "text-[#1B2430]" : ""}>{s}</span>)}</div>
    </div>
  );
}

function Profile({ stops }) {
  const n = stops.length, x = (i) => 30 + (i * 340) / (n - 1), y = (m) => 95 - (m / 2800) * 70;
  const pts = stops.map(([, m], i) => `${x(i)},${y(m)}`).join(" ");
  return (
    <svg viewBox="0 0 400 130" className="w-full" role="img" aria-label="Route altitude profile">
      <polygon points={`${x(0)},105 ${pts} ${x(n - 1)},105`} fill="#1B2430" opacity="0.08" />
      <polyline points={pts} fill="none" stroke="#1B2430" strokeWidth="2.5" strokeLinejoin="round" />
      {stops.map(([name, m], i) => (
        <g key={name}>
          <circle cx={x(i)} cy={y(m)} r="4" fill={i === 0 || i === n - 1 ? "#D62839" : "#F2B01E"} stroke="#1B2430" strokeWidth="1.5" />
          <text x={x(i)} y={118} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="9" fill="#475569">{name}</text>
          <text x={x(i)} y={y(m) - 8} textAnchor="middle" fontSize="8" fill="#94A3B8">{m}m</text>
        </g>
      ))}
    </svg>
  );
}

function Insights({ list, date, cur }) {
  if (!list.length) return null;
  const priced = list.map((t) => ({ ...t, p: fare(t, date) }));
  const cheapest = priced.reduce((a, b) => (b.p < a.p ? b : a));
  const fastest = priced.reduce((a, b) => (b.mins < a.mins ? b : a));
  const greenest = priced.reduce((a, b) => (co2(b) < co2(a) ? b : a));
  const value = priced.reduce((a, b) => (CLASSES[b.cls].comfort / b.p > CLASSES[a.cls].comfort / a.p ? b : a));
  const picks = [
    ["Cheapest", cheapest, Tag], ["Fastest", fastest, Gauge], ["Greenest", greenest, Leaf], ["Best value", value, Sparkles],
  ];
  const byClass = Object.keys(CLASSES).map((c) => {
    const ts = priced.filter((t) => t.cls === c);
    return ts.length ? { c, min: Math.min(...ts.map((t) => t.p)), co2: co2(ts[0]) } : null;
  }).filter(Boolean);
  const maxP = Math.max(...byClass.map((b) => b.min)), maxC = Math.max(...byClass.map((b) => b.co2));
  const ev = byClass.find((b) => b.c === "ev"), dsl = byClass.find((b) => b.c === "ac" || b.c === "deluxe");
  return (
    <aside className="h-fit space-y-5 rounded-2xl bg-white p-5 shadow-sm lg:sticky lg:top-20">
      <h3 className="font-heading text-lg font-extrabold">Trip insights</h3>
      <div className="grid grid-cols-2 gap-2">
        {picks.map(([label, t, Icon]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-1 text-xs font-bold text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</p>
            <p className="mt-1 text-sm font-extrabold">{CLASSES[t.cls].name}</p>
            <p className="text-xs text-slate-500">{to12(t.dep)} · {money(t.p, cur)}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-slate-500">Lowest fare by class</p>
        {byClass.map((b) => (
          <div key={b.c} className="mb-1.5 flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-semibold">{CLASSES[b.c].name}</span>
            <span className="h-3 rounded-full" style={{ width: `${(b.min / maxP) * 100}%`, background: CLASSES[b.c].color, minWidth: 8 }} />
            <span className="text-slate-500">{money(b.min, cur)}</span>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-slate-500">CO₂ per passenger (kg)</p>
        {byClass.map((b) => (
          <div key={b.c} className="mb-1.5 flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-semibold">{CLASSES[b.c].name}</span>
            <span className="h-3 rounded-full bg-slate-300" style={{ width: `${(b.co2 / maxC) * 100}%`, minWidth: 8, background: b.c === "ev" ? "#0E9F6E" : undefined }} />
            <span className="text-slate-500">{b.co2}</span>
          </div>
        ))}
        {ev && dsl && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
          Choosing electric saves about {(dsl.co2 - ev.co2).toFixed(1)} kg of CO₂ on this trip.</p>}
      </div>
      <div>
        <p className="mb-1 text-xs font-bold text-slate-500">Route profile</p>
        <Profile stops={list[0].stops} />
      </div>
    </aside>
  );
}

function TripCard({ t, date, cur, onSelect }) {
  const k = CLASSES[t.cls], Icon = k.icon, a = arrive(t.dep, t.mins), n = left(t), price = fare(t, date);
  return (
    <article className="flex overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
      <div className="w-2 shrink-0" style={{ background: k.color }} />
      <div className="grid flex-1 gap-4 p-5 md:grid-cols-[1.2fr_1.5fr_auto] md:items-center">
        <div>
          <p className="flex items-center gap-2 font-heading text-lg font-extrabold"><Icon className="h-5 w-5" style={{ color: k.color }} />{k.name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Star className="h-3.5 w-3.5 fill-[#F2B01E] text-[#F2B01E]" />{t.rating} · {t.km} km</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {k.amen.map((x) => <span key={x} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{x}</span>)}
            {t.cls === "ev" && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Zero tailpipe</span>}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <p className="text-xl font-extrabold">{to12(t.dep)}</p>
            <div className="flex-1 border-t-2 border-dotted border-slate-300" />
            <span className="text-xs font-semibold text-slate-500"><Clock className="mr-1 inline h-3.5 w-3.5" />{dur(t.mins)}</span>
            <div className="flex-1 border-t-2 border-dotted border-slate-300" />
            <p className="text-xl font-extrabold">{to12(a.t)}{a.next && <sup className="ml-0.5 text-[10px] text-red-600">+1</sup>}</p>
          </div>
          <p className={`mt-2 text-xs font-semibold ${n <= 6 ? "text-red-600" : "text-slate-500"}`}>{n <= 6 ? `Only ${n} seats left` : `${n} seats left`}</p>
        </div>
        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <p className="font-heading text-2xl font-extrabold">{money(price, cur)}</p>
          <button type="button" onClick={() => onSelect(t)}
            className="rounded-lg bg-[#1B2430] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2c3a4d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B01E]">
            Pick seats <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function SeatMap({ trip, pax, active, onPick, multi = false }) {
  const k = CLASSES[trip.cls], grid = seatIds(k), mine = pax.map((p) => p.seat);
  return (
    <div className="mx-auto w-fit rounded-3xl border-2 border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-right text-xs font-semibold text-slate-400">Driver ◉</p>
      {grid.map((row, r) => (
        <div key={r} className="mb-1.5 flex justify-center gap-1.5">
          {row.map((id, i) => {
            if (!id) return <span key={i} className="w-5" />;
            const taken = isTaken(trip.id, id), o = mine.indexOf(id);
            return (
              <button key={id} type="button" disabled={taken || (!multi && o >= 0 && o !== active)} onClick={() => onPick(id)} aria-label={`Seat ${id}${taken ? " taken" : ""}`}
                className={`h-10 w-10 rounded-md text-[11px] font-bold transition ${taken ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : o === active ? "bg-[#D62839] text-white" : o >= 0 ? "bg-[#1B2430] text-white" : "border-2 border-slate-300 bg-white hover:border-[#1B2430]"}`}>
                {o >= 0 ? `P${o + 1}` : taken ? "×" : id}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function HeroScene({ onOpen }) {
  const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } };
  return (
    <svg viewBox="0 0 640 380" className="w-full drop-shadow-xl" role="img" aria-label="A Tripzo bus driving along a mountain road below the Himalayas">
      <defs>
        <linearGradient id="tz-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2B3A55" /><stop offset="1" stopColor="#F2B01E" stopOpacity=".9" /></linearGradient>
      </defs>
      <rect width="640" height="380" rx="24" fill="url(#tz-sky)" />
      <circle cx="520" cy="110" r="32" fill="#FBE3A1" />
      <ellipse cx="150" cy="70" rx="60" ry="10" fill="#fff" opacity=".25" /><ellipse cx="400" cy="48" rx="44" ry="8" fill="#fff" opacity=".2" />
      <polygon points="0,265 90,150 150,210 250,95 340,215 420,140 520,230 600,160 640,200 640,300 0,300" fill="#8FA6C4" />
      <g fill="#fff">
        <polygon points="250,95 233,128 244,121 252,132 262,120 268,128" /><polygon points="90,150 77,174 86,168 92,177 100,168 104,174" />
        <polygon points="420,140 405,166 414,160 421,169 430,160 436,167" /><polygon points="600,160 588,180 596,175 602,183 609,176 613,181" />
      </g>
      <path d="M0 300 Q120 232 240 280 T480 268 T640 282 V310 H0 Z" fill="#2F6B4F" />
      <rect y="300" width="640" height="80" fill="#243044" />
      <rect y="300" width="640" height="4" fill="#3A4A63" />
      <line x1="0" y1="352" x2="640" y2="352" stroke="#F2B01E" strokeWidth="4" strokeDasharray="28 22" className="tz-road" />

      <g transform="translate(205 128)">
        <rect width="236" height="34" rx="17" fill="#FBE3A1" />
        <polygon points="110,34 124,34 117,46" fill="#FBE3A1" />
        <text x="118" y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1B2430">Tap the bus to pick your seat</text>
      </g>

      <g className="tz-bus" role="button" tabIndex={0} aria-label="Pick your seat on this bus" onClick={onOpen} onKeyDown={key} style={{ cursor: "pointer" }}>
        <g transform="translate(150 190)">
          <rect x="30" y="-8" width="200" height="8" rx="3" fill="#1B2430" />
          <rect x="44" y="-20" width="46" height="12" rx="2" fill="#F2B01E" /><rect x="100" y="-16" width="38" height="8" rx="2" fill="#0E9F6E" />
          <rect width="340" height="96" rx="18" fill="#D62839" />
          <rect y="62" width="340" height="12" fill="#F2B01E" /><rect y="74" width="340" height="6" fill="#0E9F6E" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={18 + i * 46} y="14" width="38" height="36" rx="6" fill="#CFE4F5" />)}
          {[0, 2, 3].map((i) => <circle key={i} cx={37 + i * 46} cy="34" r="7" fill="#1B2430" opacity=".55" />)}
          <rect x="252" y="14" width="32" height="62" rx="4" fill="#B81F2F" /><rect x="258" y="20" width="20" height="30" rx="3" fill="#CFE4F5" />
          <path d="M296 14 H324 Q336 14 336 28 V50 H296 Z" fill="#CFE4F5" />
          <text x="18" y="92" fontSize="11" fontWeight="800" fill="#fff">Tripzo Yatra</text>
          <circle cx="334" cy="64" r="6" fill="#FFF3B0" />
          <polygon points="340,58 430,44 430,92 340,70" fill="#FFF3B0" opacity=".22" />
          <circle cx="70" cy="98" r="17" fill="#1B2430" /><circle cx="70" cy="98" r="7" fill="#94A3B8" />
          <circle cx="270" cy="98" r="17" fill="#1B2430" /><circle cx="270" cy="98" r="7" fill="#94A3B8" />
        </g>
      </g>
    </svg>
  );
}

function HoldBadge({ left }) {
  const low = left <= 120;
  return <p role="timer" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${low ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900"}`}><Timer className="h-3.5 w-3.5" />Seats held for {clock(left)}</p>;
}

function QuickBook({ trips, from, to, setFrom, setTo, date, setDate, paxCount, setPaxCount, cur, onClose, onContinue }) {
  const sorted = useMemo(() => [...trips].sort((a, b) => a.dep.localeCompare(b.dep)), [trips]);
  const [selId, setSelId] = useState("");
  const [seats, setSeats] = useState([]);
  const sel = sorted.find((t) => t.id === selId);
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, []);
  const toggle = (id) => setSeats((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < paxCount ? [...s, id] : s));
  const mockPax = Array.from({ length: paxCount }, (_, i) => ({ seat: seats[i] || "" }));
  const ready = sel && seats.length === paxCount;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1B2430]/70 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Pick your seat" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-heading text-2xl font-extrabold">Pick your seat</h2><p className="text-sm text-slate-500">Choose a time, tap your seats, then add traveller details.</p></div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div><label htmlFor="qf" className="mb-1 block text-xs font-bold text-slate-500">From</label>
            <select id="qf" value={from} onChange={(e) => setFrom(e.target.value)} className={field}>{Object.entries(PLACES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
          <div><label htmlFor="qt" className="mb-1 block text-xs font-bold text-slate-500">To</label>
            <select id="qt" value={to} onChange={(e) => setTo(e.target.value)} className={field}>{Object.entries(PLACES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
          <div><label htmlFor="qd" className="mb-1 block text-xs font-bold text-slate-500">Date</label>
            <input id="qd" type="date" min={todayISO()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} /></div>
          <div><label htmlFor="qp" className="mb-1 block text-xs font-bold text-slate-500">Travellers</label>
            <select id="qp" value={paxCount} onChange={(e) => setPaxCount(+e.target.value)} className={field}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        </div>

        <h3 className="mt-6 font-heading text-lg font-extrabold">Departure time</h3>
        {!sorted.length ? (
          <p className="mt-2 rounded-xl border-2 border-dashed border-slate-300 p-5 text-sm text-slate-500">{from === to ? "Pick two different places." : `No direct buses between ${PLACES[from]} and ${PLACES[to]} yet. Try a route with Kathmandu or Pokhara.`}</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sorted.map((t) => { const k = CLASSES[t.cls]; return (
              <button key={t.id} type="button" aria-pressed={selId === t.id} onClick={() => { setSelId(t.id); setSeats([]); }}
                className={`rounded-xl border-2 p-3 text-left ${selId === t.id ? "border-[#1B2430] bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                <span className="flex items-center justify-between"><b className="text-lg">{to12(t.dep)}</b><span className="h-2.5 w-2.5 rounded-full" style={{ background: k.color }} /></span>
                <span className="block text-xs font-semibold">{k.name}</span>
                <span className="block text-xs text-slate-500">{money(fare(t, date), cur)} each · {left(t)} left</span>
              </button>); })}
          </div>
        )}

        {sel && (
          <div className="mt-6">
            <h3 className="font-heading text-lg font-extrabold">Choose {paxCount} {paxCount === 1 ? "seat" : "seats"}</h3>
            <div className="mt-3"><SeatMap trip={sel} pax={mockPax} active={-2} multi onPick={toggle} /></div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-between gap-3 border-t bg-white px-5 pt-4 sm:-mx-7 sm:px-7">
          <p className="text-sm">{sel
            ? <><b>{seats.length}/{paxCount}</b> seats{seats.length ? `: ${seats.join(", ")}` : ""}<br /><span className="text-xs text-slate-500">{fmtDate(date)} · {to12(sel.dep)} · {money(fare(sel, date) * paxCount, cur)}</span></>
            : <span className="text-slate-500">Choose a departure time</span>}</p>
          <button type="button" disabled={!ready} onClick={() => onContinue(sel, seats)}
            className="rounded-lg bg-[#D62839] px-5 py-3 font-extrabold text-white hover:bg-[#b81f2f] disabled:cursor-not-allowed disabled:opacity-40">Continue</button>
        </div>
      </div>
    </div>
  );
}

const METHODS = [["Khalti", Wallet], ["eSewa", Wallet], ["Fonepay", Smartphone], ["Card", CreditCard]];
const blankCard = { num: "", name: "", exp: "", cvv: "" };

function PaymentPanel({ total, cur, method, setMethod, paying, setPaying, charge, onPaid }) {
  const [phase, setPhase] = useState("form"); // form | otp | qr | processing | failed
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [card, setCard] = useState(blankCard);
  const [err, setErr] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const digits = card.num.replace(/\s/g, "");
  const brand = /^4/.test(digits) ? "Visa" : /^(5[1-5]|2[2-7])/.test(digits) ? "Mastercard" : "";
  const view = phase === "failed" ? "form" : phase;
  const steps = [`Contacting ${method}`, "Confirming your seats with the operator", "Issuing your ticket"];

  useEffect(() => {
    if (phase !== "processing") return;
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, 2)), 800);
    return () => clearInterval(id);
  }, [phase]);

  const pickMethod = (m) => { if (paying) return; setMethod(m); setPhase("form"); setErr(""); setOtp(""); };
  const run = async (extra) => {
    setPaying(true); setStepIdx(0); setPhase("processing"); setErr("");
    try { const res = await charge({ method, ...extra }); setCard(blankCard); setOtp(""); onPaid(res); }
    catch (e) { setErr(e.message || "The payment did not go through."); setPhase("failed"); }
    finally { setPaying(false); }
  };
  const submit = (e) => {
    e.preventDefault(); if (paying) return; setErr("");
    if (method === "Card") {
      if (!luhn(digits)) return setErr("Check the card number. It should have 16 digits.");
      if (card.name.trim().length < 2) return setErr("Enter the name printed on the card.");
      if (!expOk(card.exp)) return setErr("Enter a valid expiry date as MM/YY.");
      if (!/^\d{3,4}$/.test(card.cvv)) return setErr("Enter the 3 or 4 digit security code.");
      return run({ last4: digits.slice(-4) });
    }
    if (method === "Fonepay") return view === "qr" ? run({}) : setPhase("qr");
    if (view === "form") {
      if (!phoneOk(phone)) return setErr(`Enter the 10 digit mobile number linked to your ${method} wallet.`);
      return setPhase("otp");
    }
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6 digit code we sent you.");
    return run({ otp });
  };
  const label = method === "Card" ? `Pay ${money(total, cur)}`
    : method === "Fonepay" ? (view === "qr" ? "I have scanned and paid" : "Show QR code")
    : view === "otp" ? `Confirm and pay ${money(total, cur)}` : "Send code to my phone";

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <h1 className="font-heading text-2xl font-extrabold">Pay {money(total, cur)}</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Payment method">
        {METHODS.map(([m, Icon]) => (
          <button key={m} type="button" role="radio" aria-checked={method === m} disabled={paying} onClick={() => pickMethod(m)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-sm font-bold disabled:opacity-60 ${method === m ? "border-[#1B2430] bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
            <Icon className="h-5 w-5" />{m}</button>
        ))}
      </div>

      {phase === "processing" ? (
        <div className="py-10 text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto h-10 w-10 animate-spin" />
          <p className="mt-4 font-bold">{steps[stepIdx]}</p>
          <p className="mt-1 text-xs text-slate-500">Keep this page open. Do not go back or pay again.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {phase === "failed" && (
            <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p><b>Payment not completed.</b> {err} Your seats are still held, so you can try again or pick another method.</p>
            </div>
          )}

          {method === "Card" && (<>
            <div><label htmlFor="cn" className="mb-1 block text-xs font-bold text-slate-500">Card number</label>
              <div className="relative"><input id="cn" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={card.num} onChange={(e) => setCard({ ...card, num: fmtCard(e.target.value) })} className={field} />
                {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{brand}</span>}</div></div>
            <div><label htmlFor="cname" className="mb-1 block text-xs font-bold text-slate-500">Name on card</label>
              <input id="cname" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className={field} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="cexp" className="mb-1 block text-xs font-bold text-slate-500">Expiry (MM/YY)</label>
                <input id="cexp" inputMode="numeric" autoComplete="cc-exp" placeholder="08/29" value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} className={field} /></div>
              <div><label htmlFor="ccvv" className="mb-1 block text-xs font-bold text-slate-500">Security code</label>
                <input id="ccvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} className={field} /></div>
            </div>
          </>)}

          {(method === "Khalti" || method === "eSewa") && view === "form" && (
            <div><label htmlFor="ph" className="mb-1 block text-xs font-bold text-slate-500">{method} mobile number</label>
              <div className="flex gap-2"><span className="flex items-center rounded-lg border-2 border-slate-200 bg-slate-50 px-3 text-sm font-bold">+977</span>
                <input id="ph" type="tel" inputMode="numeric" maxLength={10} placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} className={field} /></div></div>
          )}
          {(method === "Khalti" || method === "eSewa") && view === "otp" && (
            <div><label htmlFor="otp" className="mb-1 block text-xs font-bold text-slate-500">6 digit code sent to {phone.slice(0, 2)}XXXXX{phone.slice(-3)}</label>
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className={`${field} text-center font-mono text-xl tracking-[0.5em]`} />
              <button type="button" onClick={() => { setPhase("form"); setOtp(""); setErr(""); }} className="mt-2 text-xs font-bold text-[#D62839]">Use a different number</button></div>
          )}
          {method === "Fonepay" && view === "form" && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Fonepay shows a QR code. Scan it with any Fonepay-enabled mobile banking app to pay.</p>}
          {method === "Fonepay" && view === "qr" && (
            <div className="rounded-xl bg-slate-50 p-5 text-center">
              <div className="mx-auto w-fit rounded-xl bg-white p-3 [&>svg]:h-40 [&>svg]:w-40"><Qr seed={`fonepay${total}`} /></div>
              <p className="mt-3 text-sm font-bold">Scan to pay {money(total, cur)}</p>
              <p className="text-xs text-slate-500">After your bank confirms, tap the button below.</p>
            </div>
          )}

          {err && phase !== "failed" && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D62839] p-4 font-extrabold text-white hover:bg-[#b81f2f]"><Lock className="h-4 w-4" />{label}</button>
        </form>
      )}

      <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><b>Demo mode.</b> No money is charged and nothing is sent to {method}. To test: any 6 digit code works (000000 fails), card 4242 4242 4242 4242 works, and a card ending 0002 is declined.</p>
    </div>
  );
}

function MyBookings({ list, onCancel }) {
  if (!list.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14">
      <h2 className="flex items-center gap-2 font-heading text-2xl font-extrabold"><History className="h-6 w-6" />Your bookings</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {list.map((b) => { const gone = b.status === "Cancelled"; return (
          <div key={b.pnr} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <p className="font-mono text-sm font-bold">{b.pnr}</p>
              <p className="font-heading font-extrabold">{PLACES[b.from].split(" (")[0]} to {PLACES[b.to].split(" (")[0]}</p>
              <p className="text-xs text-slate-500">{fmtDate(b.date)} · {to12(b.dep)} · seats {b.seats.join(", ")}</p>
            </div>
            <div className="text-right">
              <p className={`text-xs font-bold ${gone ? "text-red-600" : "text-emerald-700"}`}>{b.status}</p>
              {gone ? <p className="text-xs text-slate-500">Refund {money(b.refund, b.cur)}</p>
                : <button type="button" onClick={() => onCancel(b.pnr)} className="mt-1 text-xs font-bold text-[#D62839] hover:underline">Cancel booking</button>}
            </div>
          </div>); })}
      </div>
    </section>
  );
}

function Qr({ seed }) {
  const n = 17, cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 5 && y < 5) || (x > 11 && y < 5) || (x < 5 && y > 11);
    const on = finder ? (x % 4 === 0 || y % 4 === 0 || (x % 12 === 2 || y % 12 === 2) || (x > 11 && (x - 12) % 4 === 2) || (y > 11 && (y - 12) % 4 === 2) ? true : false) : hash(seed + x + "," + y) % 2 === 0;
    if (on) cells.push(<rect key={`${x}${y}`} x={x} y={y} width="1" height="1" />);
  }
  return <svg viewBox={`0 0 ${n} ${n}`} className="h-24 w-24" fill="#1B2430" role="img" aria-label="Boarding code (demo)">{cells}</svg>;
}

/* ------------------------------------------------------------------
   MAIN
------------------------------------------------------------------- */
export default function TripzoBusBooking() {
  const [cur, setCur] = useState("NPR");
  const [step, setStep] = useState("SEARCH");
  const [from, setFrom] = useState("KTM");
  const [to, setTo] = useState("PKR");
  const [date, setDate] = useState(addDays(todayISO(), 3));
  const [paxCount, setPaxCount] = useState(1);
  const [classes, setClasses] = useState([]);
  const [sort, setSort] = useState("price");
  const [period, setPeriod] = useState("Any");
  const [trip, setTrip] = useState(null);
  const [pax, setPax] = useState([emptyPax()]);
  const [active, setActive] = useState(0);
  const [board, setBoard] = useState("");
  const [drop, setDrop] = useState("");
  const [insure, setInsure] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoOk, setPromoOk] = useState(false);
  const [method, setMethod] = useState("Khalti");
  const [paying, setPaying] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState(false);
  const [holdEnd, setHoldEnd] = useState(0);
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [bookings, setBookings] = useState(store.read);

  const go = (s) => { setStep(s); setError(""); setQuick(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const holdLeft = holdEnd ? Math.max(0, Math.ceil((holdEnd - now) / 1000)) : 0;
  const holding = step === "SEATS" || step === "PAY";
  useEffect(() => {
    if (!holding) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [holding]);
  useEffect(() => {
    if (holding && holdEnd && holdLeft === 0 && !paying) {
      const id = setTimeout(() => {
        setNotice("Your seat hold ran out. Pick your seats again to continue.");
        setStep("RESULTS");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      return () => clearTimeout(id);
    }
  }, [holding, holdEnd, holdLeft, paying]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 3500); return () => clearTimeout(id); }, [toast]);
  const routeTrips = useMemo(() => TRIPS.filter((t) => t.from === from && t.to === to), [from, to]);
  const list = useMemo(() => {
    const slot = (t) => { const h = +t.slice(0, 2); return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Night"; };
    return routeTrips
      .filter((t) => !classes.length || classes.includes(t.cls))
      .filter((t) => period === "Any" || slot(t.dep) === period)
      .sort((a, b) => sort === "price" ? fare(a, date) - fare(b, date) : sort === "time" ? a.dep.localeCompare(b.dep) : sort === "fast" ? a.mins - b.mins : co2(a) - co2(b));
  }, [routeTrips, classes, period, sort, date]);
  const availableClasses = [...new Set(routeTrips.map((t) => t.cls))];
  const strip = useMemo(() => { const s = [addDays(date, -2), todayISO()].sort().pop(); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }, [date]);

  const base = trip ? fare(trip, date) * paxCount : 0;
  const discount = promoOk ? Math.round(base * 0.1) : 0;
  const insurance = insure ? 120 * paxCount : 0;
  const fees = Math.round(base * 0.03);
  const total = base - discount + insurance + fees;

  const search = (e) => {
    e.preventDefault();
    if (from === to) return setError("Pick two different places.");
    if (!routeTrips.length) return setError(`No direct buses between ${PLACES[from]} and ${PLACES[to]} yet. Try a route with Kathmandu or Pokhara.`);
    setClasses([]); setPeriod("Any"); setNotice(""); go("RESULTS");
  };
  const choose = (t, seats = []) => {
    setTrip(t); setPax(Array.from({ length: paxCount }, (_, i) => ({ ...emptyPax(), seat: seats[i] || "" }))); setActive(Math.min(seats.length, paxCount - 1));
    setBoard(POINTS[t.from][0]); setDrop(POINTS[t.to][0]); setPromoOk(false); setPromo(""); setNotice("");
    setHoldEnd(Date.now() + HOLD_SECONDS * 1000); setNow(Date.now()); go("SEATS");
  };
  const upd = (i, k, v) => setPax((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const pick = (id) => upd(active, "seat", pax[active].seat === id ? "" : id);
  const applyPromo = () => { const ok = promo.trim().toUpperCase() === "TRIPZO10"; setPromoOk(ok); setError(ok ? "" : "That code isn't valid. Try TRIPZO10."); };
  const toPay = (e) => { e.preventDefault(); if (pax.some((p) => !p.seat)) return setError("Choose a seat for every passenger."); go("PAY"); };
  // DEMO ONLY. Replace charge() with calls to your Node/Express API: create the payment on the server,
  // send the person to the wallet or gateway, then verify the result on the server before issuing a ticket.
  // Card details should be typed into the gateway's hosted fields, never posted to your own server.
  const charge = ({ method: m, otp, last4 }) => new Promise((resolve, reject) => setTimeout(() => {
    if (otp === "000000" || last4 === "0002") reject(new Error(m === "Card" ? "Your card was declined." : `${m} could not confirm the code.`));
    else resolve({ ref: `${m.slice(0, 2).toUpperCase()}${String(Date.now()).slice(-8)}` });
  }, 2400));
  const paid = (res) => {
    const pnr = `TB${Math.floor(100000 + Math.random() * 900000)}`;
    setTicket({ pnr, trip, pax: pax.map((p) => ({ ...p })), date, board, drop, total, cur, method, insure, ref: res.ref });
    const next = [{ pnr, from: trip.from, to: trip.to, date, dep: trip.dep, seats: pax.map((p) => p.seat), total, cur, method, status: "Confirmed", refund: 0 }, ...bookings].slice(0, 20);
    setBookings(next); store.write(next); setHoldEnd(0); go("TICKET");
  };
  const cancelBooking = (pnr) => {
    const b = bookings.find((x) => x.pnr === pnr); if (!b) return;
    const hrs = (new Date(`${b.date}T${b.dep}:00`) - Date.now()) / 36e5;
    if (hrs <= 0) return setToast("This trip has already left, so it can't be cancelled.");
    const refund = hrs >= 24 ? b.total : Math.round(b.total * 0.5);
    if (!window.confirm(`Cancel ${pnr}? You will get back ${money(refund, b.cur)}.`)) return;
    const next = bookings.map((x) => (x.pnr === pnr ? { ...x, status: "Cancelled", refund } : x));
    setBookings(next); store.write(next); setToast(`Booking ${pnr} cancelled. Refund: ${money(refund, b.cur)}.`);
  };
  const shareTicket = async (t) => {
    const text = `Tripzo bus ticket ${t.pnr}: ${PLACES[t.trip.from]} to ${PLACES[t.trip.to]}, ${fmtDate(t.date)} at ${to12(t.trip.dep)}. Seats ${t.pax.map((p) => p.seat).join(", ")}. Boarding: ${t.board}.`;
    try {
      if (navigator.share) await navigator.share({ title: "My Tripzo ticket", text });
      else { await navigator.clipboard.writeText(text); setToast("Trip details copied."); }
    } catch { /* sharing cancelled */ }
  };
  const reset = () => { setTrip(null); setTicket(null); setPaying(false); setHoldEnd(0); go("SEARCH"); };
  const at = { RESULTS: 1, SEATS: 2, PAY: 3, TICKET: 4 }[step];
  const toggleClass = (c) => setClasses((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  return (
    <div className="min-h-screen bg-[#F3F5F7] text-[#1B2430]" style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Instrument+Sans:wght@400;600;700&display=swap');
        .font-heading{font-family:'Bricolage Grotesque',system-ui,sans-serif}
        .tz-road{animation:tz-road 1s linear infinite}
        @keyframes tz-road{to{stroke-dashoffset:50}}
        .tz-bus{animation:tz-bob 2.4s ease-in-out infinite}
        @keyframes tz-bob{50%{transform:translateY(-3px)}}
        .tz-bus:focus-visible{outline:3px solid #fff;outline-offset:6px}
        @media (prefers-reduced-motion:reduce){.tz-road,.tz-bus{animation:none}}
        @media print{header,footer,.no-print{display:none!important}}`}</style>

      <header className="no-print sticky top-0 z-40 bg-[#1B2430] text-white">
        <div className="h-1.5 bg-[repeating-linear-gradient(90deg,#D62839_0_24px,#F2B01E_24px_48px,#0E9F6E_48px_72px)]" />
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button type="button" onClick={reset} className="flex items-center gap-2 font-heading text-xl font-extrabold">
            <Bus className="h-6 w-6 text-[#F2B01E]" /> Tripzo Yatra
          </button>
          <div className="flex gap-1 rounded-lg bg-white/10 p-1">
            {["NPR", "USD"].map((c) => (
              <button key={c} type="button" aria-pressed={cur === c} onClick={() => setCur(c)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${cur === c ? "bg-[#F2B01E] text-[#1B2430]" : "text-white/70"}`}>{c}</button>
            ))}
          </div>
        </div>
      </header>

      {at !== undefined && <Road at={at} />}

      {/* ===== SEARCH ===== */}
      {step === "SEARCH" && (
        <main>
          <section className="bg-[#1B2430] px-4 pb-24 pt-10 text-white sm:pt-14">
            <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <h1 className="font-heading text-4xl font-extrabold leading-[1.1] sm:text-6xl">Every highway in Nepal, one ticket away.</h1>
                <p className="mt-4 max-w-md text-white/70">Deluxe, AC and electric buses plus mountain jeeps. Pick a time, choose your seat and pay in one go.</p>
                <button type="button" onClick={() => setQuick(true)} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#F2B01E] px-6 py-4 font-extrabold text-[#1B2430] hover:bg-[#ffc43d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Ticket className="h-5 w-5" />Pick a seat now</button>
              </div>
              <HeroScene onOpen={() => setQuick(true)} />
            </div>
          </section>
          <form onSubmit={search} className="mx-auto -mt-12 max-w-6xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">
            <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr_1fr_9rem]">
              <div><label htmlFor="f" className="mb-1 block text-xs font-bold text-slate-500">Leaving from</label>
                <select id="f" value={from} onChange={(e) => setFrom(e.target.value)} className={field}>{Object.entries(PLACES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
              <button type="button" aria-label="Swap places" onClick={() => { setFrom(to); setTo(from); }} className="mx-auto rounded-full border-2 border-slate-200 p-3 hover:bg-slate-50"><ArrowRightLeft className="h-5 w-5" /></button>
              <div><label htmlFor="t" className="mb-1 block text-xs font-bold text-slate-500">Going to</label>
                <select id="t" value={to} onChange={(e) => setTo(e.target.value)} className={field}>{Object.entries(PLACES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
              <div><label htmlFor="d" className="mb-1 block text-xs font-bold text-slate-500">Travel date</label>
                <input id="d" type="date" required min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></div>
              <div><label htmlFor="p" className="mb-1 block text-xs font-bold text-slate-500">Travellers</label>
                <select id="p" value={paxCount} onChange={(e) => setPaxCount(+e.target.value)} className={field}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
            </div>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <button type="submit" className="mt-5 w-full rounded-lg bg-[#D62839] p-4 font-extrabold text-white transition hover:bg-[#b81f2f]">Find buses and jeeps</button>
          </form>

          <section className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-heading text-2xl font-extrabold">Choose how you travel</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(CLASSES).map(([id, k]) => (
                <div key={id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <k.icon className="h-7 w-7" style={{ color: k.color }} />
                  <h3 className="mt-3 font-heading font-extrabold">{k.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{k.amen.join(", ")}</p>
                </div>
              ))}
            </div>
            <h2 className="mt-12 font-heading text-2xl font-extrabold">Popular routes</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {ROUTES.slice(0, 6).map((r) => (
                <button key={r.a + r.b} type="button" onClick={() => { setFrom(r.a); setTo(r.b); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="font-heading text-lg font-extrabold">{PLACES[r.a].split(" (")[0]} to {PLACES[r.b].split(" (")[0]}</p>
                  <p className="mt-1 flex items-center gap-3 text-sm text-slate-500"><span><MapPin className="mr-1 inline h-4 w-4" />{r.km} km</span><span><Clock className="mr-1 inline h-4 w-4" />~{r.h} h</span>
                    {r.stops.some(([, m]) => m > 2000) && <span><Mountain className="mr-1 inline h-4 w-4" />High pass</span>}</p>
                </button>
              ))}
            </div>
          </section>
          <MyBookings list={bookings} onCancel={cancelBooking} />
        </main>
      )}

      {/* ===== RESULTS ===== */}
      {step === "RESULTS" && (
        <main className="mx-auto max-w-7xl px-4 pb-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold">{PLACES[from]} to {PLACES[to]}</h1>
              <p className="text-sm text-slate-500">{fmtDate(date, { weekday: "long", day: "numeric", month: "long" })} · {paxCount} {paxCount === 1 ? "traveller" : "travellers"}{isWeekend(date) && " · weekend fares +10%"}</p>
            </div>
            <button type="button" onClick={() => go("SEARCH")} className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-bold hover:bg-white">Change search</button>
          </div>

          {notice && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{notice}</p>}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {strip.map((d) => (
              <button key={d} type="button" aria-pressed={d === date} onClick={() => setDate(d)}
                className={`min-w-[5rem] rounded-xl px-3 py-2 text-center text-xs font-bold ${d === date ? "bg-[#1B2430] text-white" : "bg-white hover:bg-slate-100"}`}>
                <CalendarDays className="mx-auto mb-1 h-4 w-4" />{fmtDate(d)}{isWeekend(d) && <span className="block text-[10px] text-[#F2B01E]">Weekend</span>}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setClasses([])} aria-pressed={!classes.length}
              className={`rounded-full px-4 py-2 text-xs font-bold ${!classes.length ? "bg-[#1B2430] text-white" : "bg-white"}`}>All types</button>
            {availableClasses.map((c) => { const k = CLASSES[c]; const on = classes.includes(c);
              return <button key={c} type="button" aria-pressed={on} onClick={() => toggleClass(c)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold" style={on ? { background: k.color, color: "#fff" } : { background: "#fff" }}>
                <k.icon className="h-3.5 w-3.5" />{k.name}</button>; })}
            <span className="flex-1" />
            <select aria-label="Departure time" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border-2 border-slate-200 bg-white p-2 text-xs font-bold">
              {["Any", "Morning", "Afternoon", "Night"].map((p) => <option key={p} value={p}>{p === "Any" ? "Any time" : p}</option>)}</select>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border-2 border-slate-200 bg-white p-2 text-xs font-bold">
              <option value="price">Cheapest</option><option value="time">Earliest</option><option value="fast">Fastest</option><option value="eco">Greenest</option></select>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-3">
              {list.map((t) => <TripCard key={t.id} t={t} date={date} cur={cur} onSelect={choose} />)}
              {!list.length && <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-bold">Nothing matches these filters.</p>
                <button type="button" onClick={() => { setClasses([]); setPeriod("Any"); }} className="mt-2 text-sm font-bold text-[#D62839]">Show all departures</button></div>}
            </section>
            <Insights list={list} date={date} cur={cur} />
          </div>
        </main>
      )}

      {/* ===== SEATS + PASSENGERS ===== */}
      {step === "SEATS" && trip && (
        <main className="mx-auto max-w-6xl px-4 pb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => go("RESULTS")} className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft className="h-4 w-4" />Back to results</button>
            <HoldBadge left={holdLeft} />
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <form onSubmit={toPay} className="space-y-5 lg:col-span-3">
              <section className="grid gap-4 rounded-2xl bg-white p-6 sm:grid-cols-2">
                <div><label htmlFor="bp" className="mb-1 block text-sm font-bold">Boarding point</label>
                  <select id="bp" value={board} onChange={(e) => setBoard(e.target.value)} className={field}>{POINTS[trip.from].map((p) => <option key={p}>{p}</option>)}</select></div>
                <div><label htmlFor="dp" className="mb-1 block text-sm font-bold">Drop-off point</label>
                  <select id="dp" value={drop} onChange={(e) => setDrop(e.target.value)} className={field}>{POINTS[trip.to].map((p) => <option key={p}>{p}</option>)}</select></div>
              </section>

              <section className="rounded-2xl bg-white p-6">
                <h2 className="font-heading text-lg font-extrabold">Pick your seats</h2>
                <div className="my-3 flex flex-wrap gap-2">
                  {pax.map((p, i) => <button key={i} type="button" aria-pressed={active === i} onClick={() => setActive(i)}
                    className={`rounded-full px-4 py-2 text-xs font-bold ${active === i ? "bg-[#D62839] text-white" : "bg-slate-100"}`}>{p.name.split(" ")[0] || `Traveller ${i + 1}`}: {p.seat || "no seat"}</button>)}
                </div>
                <SeatMap trip={trip} pax={pax} active={active} onPick={pick} />
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded border-2 border-slate-300 bg-white" />Available</span>
                  <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded bg-slate-200" />Taken</span>
                  <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded bg-[#D62839]" />Choosing now</span>
                  <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded bg-[#1B2430]" />Picked</span>
                </div>
                <p className="mt-2 text-center text-xs text-slate-500">Demo seat map. Live availability comes from your operator's system.</p>
              </section>

              {pax.map((p, i) => (
                <fieldset key={i} className="rounded-2xl bg-white p-6">
                  <legend className="px-2 text-sm font-extrabold">Traveller {i + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input aria-label={`Traveller ${i + 1} name`} required placeholder="Full name" value={p.name} onChange={(e) => upd(i, "name", e.target.value)} className={`${field} sm:col-span-3`} />
                    <input aria-label={`Traveller ${i + 1} phone`} type="tel" required={i === 0} pattern="[+0-9 ]{7,16}" placeholder="+977 98XXXXXXXX" value={p.phone} onChange={(e) => upd(i, "phone", e.target.value)} className={`${field} sm:col-span-2`} />
                    <select aria-label="Gender" value={p.gender} onChange={(e) => upd(i, "gender", e.target.value)} className={field}><option>Male</option><option>Female</option><option>Other</option></select>
                  </div>
                </fieldset>
              ))}
              {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
              <button type="submit" className="w-full rounded-lg bg-[#D62839] p-4 font-extrabold text-white hover:bg-[#b81f2f]">Continue to payment</button>
            </form>

            <aside className="h-fit space-y-4 rounded-2xl bg-white p-6 lg:sticky lg:top-20 lg:col-span-2">
              <h3 className="font-heading text-lg font-extrabold">Your trip</h3>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 font-extrabold">{React.createElement(CLASSES[trip.cls].icon, { className: "h-5 w-5", style: { color: CLASSES[trip.cls].color } })}{CLASSES[trip.cls].name}</p>
                <p className="mt-1 text-sm">{PLACES[trip.from]} → {PLACES[trip.to]}</p>
                <p className="text-xs text-slate-500">{fmtDate(date)} · departs {to12(trip.dep)} · {dur(trip.mins)}</p>
                <p className="mt-2 text-xs text-slate-500">Be at {board || POINTS[trip.from][0]} by {to12(boardBy(trip.dep))}</p>
              </div>
              <div className="flex gap-2">
                <input aria-label="Promo code" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code" className={field} />
                <button type="button" onClick={applyPromo} className="rounded-lg bg-[#1B2430] px-4 text-sm font-bold text-white">Apply</button>
              </div>
              <label className="flex items-start gap-3 rounded-xl border-2 border-slate-200 p-3 text-sm">
                <input type="checkbox" checked={insure} onChange={(e) => setInsure(e.target.checked)} className="mt-1" />
                <span><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-700" /><b>Travel cover</b> · {money(120, cur)} per traveller<br /><span className="text-xs text-slate-500">Accident and baggage cover for this trip.</span></span>
              </label>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">{paxCount} × fare</dt><dd className="font-bold">{money(base, cur)}</dd></div>
                {promoOk && <div className="flex justify-between text-emerald-700"><dt>Promo TRIPZO10</dt><dd className="font-bold">−{money(discount, cur)}</dd></div>}
                {insure && <div className="flex justify-between"><dt className="text-slate-500">Travel cover</dt><dd className="font-bold">{money(insurance, cur)}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate-500">Service fee</dt><dd className="font-bold">{money(fees, cur)}</dd></div>
                <div className="flex justify-between border-t pt-3"><dt className="font-extrabold">Total</dt><dd className="font-heading text-xl font-extrabold">{money(total, cur)}</dd></div>
              </dl>
              <p className="text-xs text-slate-500">Free cancellation up to 24 hours before departure. 50% refund within 24 hours.</p>
            </aside>
          </div>
        </main>
      )}

      {/* ===== PAYMENT ===== */}
      {step === "PAY" && trip && (
        <main className="mx-auto max-w-5xl px-4 pb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button type="button" disabled={paying} onClick={() => go("SEATS")} className="inline-flex items-center gap-2 text-sm font-bold disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Back to seats</button>
            <HoldBadge left={holdLeft} />
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PaymentPanel total={total} cur={cur} method={method} setMethod={setMethod} paying={paying} setPaying={setPaying} charge={charge} onPaid={paid} />
            </div>
            <aside className="h-fit space-y-4 rounded-2xl bg-white p-6 lg:col-span-2">
              <h2 className="font-heading text-lg font-extrabold">Order summary</h2>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 font-extrabold">{React.createElement(CLASSES[trip.cls].icon, { className: "h-5 w-5", style: { color: CLASSES[trip.cls].color } })}{CLASSES[trip.cls].name}</p>
                <p className="mt-1 text-sm">{PLACES[trip.from]} → {PLACES[trip.to]}</p>
                <p className="text-xs text-slate-500">{fmtDate(date)} · departs {to12(trip.dep)}</p>
                <p className="mt-2 text-xs text-slate-500">Board at {board} by {to12(boardBy(trip.dep))}</p>
              </div>
              <ul className="space-y-1 text-sm">{pax.map((p, i) => <li key={i} className="flex justify-between"><span>{p.name}</span><span className="font-bold">Seat {p.seat}</span></li>)}</ul>
              <dl className="space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">{paxCount} × fare</dt><dd className="font-bold">{money(base, cur)}</dd></div>
                {promoOk && <div className="flex justify-between text-emerald-700"><dt>Promo TRIPZO10</dt><dd className="font-bold">−{money(discount, cur)}</dd></div>}
                {insure && <div className="flex justify-between"><dt className="text-slate-500">Travel cover</dt><dd className="font-bold">{money(insurance, cur)}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate-500">Service fee</dt><dd className="font-bold">{money(fees, cur)}</dd></div>
                <div className="flex justify-between border-t pt-3"><dt className="font-extrabold">Total</dt><dd className="font-heading text-xl font-extrabold">{money(total, cur)}</dd></div>
              </dl>
              <p className="text-xs text-slate-500">Free cancellation up to 24 hours before departure. 50% refund within 24 hours.</p>
            </aside>
          </div>
        </main>
      )}

      {/* ===== TICKET ===== */}
      {step === "TICKET" && ticket && (
        <main className="mx-auto max-w-2xl px-4 pb-12">
          <div className="rounded-2xl bg-[#1B2430] p-7 text-center text-white">
            <CheckCircle2 className="mx-auto h-11 w-11 text-[#F2B01E]" />
            <h1 className="mt-2 font-heading text-2xl font-extrabold">Seats booked</h1>
            <p className="mt-2 text-xs text-white/60">Booking reference</p>
            <p className="font-mono text-3xl font-bold tracking-widest">{ticket.pnr}</p>
            <p className="mt-3 text-sm text-white/70">Be at {ticket.board} by {to12(boardBy(ticket.trip.dep))}. The bus leaves at {to12(ticket.trip.dep)}.</p>
          </div>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Demo ticket from the frontend. It is not a real ticket or proof of payment.</p>
          <div className="mt-4 space-y-4">
            {ticket.pax.map((p, i) => { const k = CLASSES[ticket.trip.cls]; const a = arrive(ticket.trip.dep, ticket.trip.mins);
              return (
                <div key={i} className="flex overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="w-2" style={{ background: k.color }} />
                  <div className="grid flex-1 gap-4 p-5 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-xs text-slate-500">{k.name} · {ticket.trip.km} km</p>
                      <p className="font-heading text-lg font-extrabold">{p.name}</p>
                      <p className="mt-2 text-2xl font-extrabold">{PLACES[ticket.trip.from].split(" (")[0]} → {PLACES[ticket.trip.to].split(" (")[0]}</p>
                      <p className="text-sm text-slate-600">{fmtDate(ticket.date, { weekday: "long", day: "numeric", month: "long" })} · {to12(ticket.trip.dep)} → {to12(a.t)}{a.next && " (+1)"}</p>
                      <p className="mt-2 text-xs text-slate-500">Board: {ticket.board} · Drop: {ticket.drop}</p>
                      <p className="mt-2 text-sm font-bold">Seat {p.seat}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 border-t border-dashed border-slate-300 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><Qr seed={ticket.pnr + p.seat} /><span className="text-[10px] text-slate-400">Show at boarding</span></div>
                  </div>
                </div>
              ); })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-5 text-sm shadow-sm">
            <span className="text-slate-500">Paid with {ticket.method}{ticket.insure && " · travel cover included"}</span>
            <span className="font-heading text-lg font-extrabold">{money(ticket.total, ticket.cur)}</span>
          </div>
          <div className="no-print mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => downloadIcs(ticket)} className="flex items-center justify-center gap-2 rounded-lg bg-white p-4 font-extrabold shadow-sm hover:bg-slate-100"><CalendarPlus className="h-5 w-5" />Add to calendar</button>
            <button type="button" onClick={() => shareTicket(ticket)} className="flex items-center justify-center gap-2 rounded-lg bg-white p-4 font-extrabold shadow-sm hover:bg-slate-100"><Share2 className="h-5 w-5" />Share trip details</button>
            <button type="button" onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#D62839] p-4 font-extrabold text-white hover:bg-[#b81f2f]"><Printer className="h-5 w-5" />Print or save PDF</button>
            <button type="button" onClick={reset} className="flex-1 rounded-lg bg-white p-4 font-extrabold shadow-sm hover:bg-slate-100">Book another trip</button>
          </div>
        </main>
      )}

      {quick && (
        <QuickBook key={`${from}-${to}-${date}-${paxCount}`} trips={routeTrips} from={from} to={to} setFrom={setFrom} setTo={setTo} date={date} setDate={setDate}
          paxCount={paxCount} setPaxCount={setPaxCount} cur={cur} onClose={() => setQuick(false)} onContinue={choose} />
      )}
      {toast && <p role="status" className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1B2430] px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</p>}

      <footer className="no-print mt-8 border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400">
        Tripzo Yatra · sample routes and fares · demo booking interface
      </footer>
    </div>
  );
}
