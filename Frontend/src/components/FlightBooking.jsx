import React, { useMemo, useState } from "react";
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
  Wallet,
  Ticket,
  Search,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

// --------------------------------------------------
// SAMPLE FLIGHT DATA
// Replace this array with data from your backend API.
// --------------------------------------------------

const INITIAL_FLIGHTS = [
  {
    id: "FL-101",
    airline: "Buddha Air",
    airlineCode: "BHA",
    flightNo: "U4-603",
    from: "Kathmandu (KTM)",
    fromCode: "KTM",
    to: "Pokhara (PKR)",
    toCode: "PKR",
    depTime: "08:15 AM",
    arrTime: "08:40 AM",
    duration: "25 min",
    priceNpr: 5910,
    priceUsd: 46,
    carryOn: "5 kg",
    checkIn: "25 kg",
    seatsAvailable: 6,
    refundable: true,
  },
  {
    id: "FL-102",
    airline: "Shree Airlines",
    airlineCode: "SHA",
    flightNo: "SHA-121",
    from: "Kathmandu (KTM)",
    fromCode: "KTM",
    to: "Pokhara (PKR)",
    toCode: "PKR",
    depTime: "10:00 AM",
    arrTime: "10:20 AM",
    duration: "20 min",
    priceNpr: 5800,
    priceUsd: 45,
    carryOn: "5 kg",
    checkIn: "20 kg",
    seatsAvailable: 9,
    refundable: true,
  },
  {
    id: "FL-103",
    airline: "Yeti Airlines",
    airlineCode: "NYT",
    flightNo: "YT-671",
    from: "Kathmandu (KTM)",
    fromCode: "KTM",
    to: "Pokhara (PKR)",
    toCode: "PKR",
    depTime: "01:15 PM",
    arrTime: "01:40 PM",
    duration: "25 min",
    priceNpr: 6100,
    priceUsd: 48,
    carryOn: "5 kg",
    checkIn: "20 kg",
    seatsAvailable: 4,
    refundable: false,
  },
  {
    id: "FL-104",
    airline: "Buddha Air",
    airlineCode: "BHA",
    flightNo: "U4-601",
    from: "Kathmandu (KTM)",
    fromCode: "KTM",
    to: "Bhairahawa (BWA - Lumbini)",
    toCode: "BWA",
    depTime: "09:00 AM",
    arrTime: "09:35 AM",
    duration: "35 min",
    priceNpr: 6200,
    priceUsd: 49,
    carryOn: "5 kg",
    checkIn: "25 kg",
    seatsAvailable: 8,
    refundable: true,
  },
  {
    id: "FL-105",
    airline: "Yeti Airlines",
    airlineCode: "NYT",
    flightNo: "YT-201",
    from: "Kathmandu (KTM)",
    fromCode: "KTM",
    to: "Bharatpur (BHR - Chitwan)",
    toCode: "BHR",
    depTime: "11:30 AM",
    arrTime: "11:45 AM",
    duration: "15 min",
    priceNpr: 5500,
    priceUsd: 43,
    carryOn: "5 kg",
    checkIn: "20 kg",
    seatsAvailable: 5,
    refundable: false,
  },
  {
    id: "FL-106",
    airline: "Summit Air",
    airlineCode: "SMA",
    flightNo: "SMA-101",
    from: "Kathmandu (KTM)",
    fromCode: "KTM",
    to: "Lukla (LUA - Everest)",
    toCode: "LUA",
    depTime: "06:30 AM",
    arrTime: "07:00 AM",
    duration: "30 min",
    priceNpr: 14500,
    priceUsd: 110,
    carryOn: "5 kg",
    checkIn: "10 kg",
    seatsAvailable: 4,
    refundable: false,
  },
];

const AIRPORTS = [
  "Kathmandu (KTM)",
  "Pokhara (PKR)",
  "Lukla (LUA - Everest)",
  "Bhairahawa (BWA - Lumbini)",
  "Bharatpur (BHR - Chitwan)",
];

const SEATS = [
  "2A",
  "2B",
  "2C",
  "3A",
  "3B",
  "3C",
  "4A",
  "4B",
  "4C",
];

const INITIAL_PASSENGER = {
  fullName: "",
  email: "",
  phone: "",
  passport: "",
};

const formatPrice = (amount, currency) =>
  currency === "NPR"
    ? `NRs. ${amount.toLocaleString("en-IN")}`
    : `$${amount.toLocaleString("en-US")}`;

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-black text-slate-900">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}

function FlightCard({ flight, currency, onBook }) {
  const price = currency === "NPR" ? flight.priceNpr : flight.priceUsd;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 font-black text-teal-800">
            {flight.airlineCode}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              {flight.airline}
            </h3>
            <p className="text-xs text-slate-500">
              Flight {flight.flightNo}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${
                flight.refundable
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {flight.refundable ? "Refundable" : "Non-refundable"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <div>
            <p className="text-xl font-black text-slate-900">
              {flight.depTime}
            </p>
            <p className="text-xs font-bold text-slate-500">
              {flight.fromCode}
            </p>
          </div>

          <div className="flex min-w-20 flex-col items-center gap-1">
            <span className="text-[10px] text-slate-500">
              {flight.duration}
            </span>
            <div className="relative w-full border-t border-dashed border-teal-400">
              <Plane className="absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white text-teal-700" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-700">
              Non-stop
            </span>
          </div>

          <div>
            <p className="text-xl font-black text-slate-900">
              {flight.arrTime}
            </p>
            <p className="text-xs font-bold text-slate-500">
              {flight.toCode}
            </p>
          </div>
        </div>

        <div className="text-xs leading-6 text-slate-500">
          <p className="flex items-center gap-2">
            <Luggage className="h-4 w-4" />
            Carry-on: {flight.carryOn}
          </p>
          <p>Checked: {flight.checkIn}</p>
          <p>{flight.seatsAvailable} seats listed available</p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
          <div>
            <p className="text-xs text-slate-500">Price per passenger</p>
            <p className="text-2xl font-black text-teal-700">
              {formatPrice(price, currency)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onBook(flight)}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-800"
          >
            Select flight <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

// --------------------------------------------------
// MAIN FLIGHT BOOKING COMPONENT
// --------------------------------------------------

export default function TripzoFlightBooking() {
  const [currency, setCurrency] = useState("NPR");
  const [step, setStep] = useState("SEARCH");

  const [fromCity, setFromCity] = useState("Kathmandu (KTM)");
  const [toCity, setToCity] = useState("Pokhara (PKR)");
  const [departDate, setDepartDate] = useState("2026-10-31");
  const [paxCount, setPaxCount] = useState(1);

  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState("3A");
  const [passenger, setPassenger] = useState(INITIAL_PASSENGER);
  const [issuedTicket, setIssuedTicket] = useState(null);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState("2026-10-31");
  const [airlineFilter, setAirlineFilter] = useState("All Airlines");
  const [luggageFilter, setLuggageFilter] = useState("Any");
  const [departureFilter, setDepartureFilter] = useState("Any time");
  const [sortBy, setSortBy] = useState("cheapest");

  const availableFlights = useMemo(
    () =>
      INITIAL_FLIGHTS.filter(
        (flight) =>
          flight.from === fromCity && flight.to === toCity
      ).sort((a, b) => {
        const priceA = currency === "NPR" ? a.priceNpr : a.priceUsd;
        const priceB = currency === "NPR" ? b.priceNpr : b.priceUsd;
        return priceA - priceB;
      }),
    [fromCity, toCity, currency]
  );

  const unitPrice = selectedFlight
    ? currency === "NPR"
      ? selectedFlight.priceNpr
      : selectedFlight.priceUsd
    : 0;

  const totalAmount = unitPrice * paxCount;

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSearch = (event) => {
    event.preventDefault();

    if (fromCity === toCity) {
      window.alert("Departure and destination must be different.");
      return;
    }

    if (!departDate) {
      window.alert("Please select a departure date.");
      return;
    }

    setSearchSubmitted(true);
    setStep("RESULTS");
    scrollTop();
  };

  const handleSwapAirports = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleBookFlight = (flight) => {
    setSelectedFlight(flight);
    setSelectedSeat("3A");
    setPassenger(INITIAL_PASSENGER);
    setPaymentMessage("");
    setStep("CHECKOUT");
    scrollTop();
  };

  const handlePassengerChange = (event) => {
    const { name, value } = event.target;

    setPassenger((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleProceedToPayment = (event) => {
    event.preventDefault();

    if (!selectedFlight) return;

    setPaymentMessage("");
    setStep("KHALTI_PAY");
    scrollTop();
  };

  // DEMO ONLY: This does not contact Khalti or verify payment.
  const handleDemoPayment = () => {
    if (!selectedFlight) return;

    const ticket = {
      pnr: `TPZ-${Math.floor(100000 + Math.random() * 900000)}`,
      flight: selectedFlight,
      passenger: { ...passenger },
      seat: selectedSeat,
      passengerCount: paxCount,
      totalAmount,
      currency,
      issuedDate: new Date().toLocaleDateString(),
      departureDate: departDate,
    };

    setIssuedTicket(ticket);
    setStep("ETICKET");
    scrollTop();
  };

  const resetBooking = () => {
    setSelectedFlight(null);
    setSelectedSeat("3A");
    setPassenger(INITIAL_PASSENGER);
    setIssuedTicket(null);
    setPaymentMessage("");
    setSearchSubmitted(false);
    setStep("SEARCH");
    scrollTop();
  };
  const domesticFares = [
    {
      id: 1,
      airline: "SHREE AIRLINES",
      price: 5800,
      time: "07:00 AM",
      luggage: "Included",
    },
    {
      id: 2,
      airline: "BUDDHA AIR",
      price: 5910,
      time: "08:30 AM",
      luggage: "Included",
    },
    {
      id: 3,
      airline: "YETI AIRLINES",
      price: 5910,
      time: "10:00 AM",
      luggage: "Included",
    },
    {
      id: 4,
      airline: "SHREE AIRLINES",
      price: 6735,
      time: "11:30 AM",
      luggage: "Not included",
    },
    {
      id: 5,
      airline: "SHREE AIRLINES",
      price: 6890,
      time: "01:00 PM",
      luggage: "Included",
    },
    {
      id: 6,
      airline: "YETI AIRLINES",
      price: 6906,
      time: "03:00 PM",
      luggage: "Not included",
    },
    {
      id: 7,
      airline: "SHREE AIRLINES",
      price: 7346,
      time: "04:30 PM",
      luggage: "Included",
    },
    {
      id: 8,
      airline: "SHREE AIRLINES",
      price: 7802,
      time: "06:00 PM",
      luggage: "Included",
    },
  ];

  const filteredFares = domesticFares
    .filter(
      (fare) =>
        airlineFilter === "All Airlines" || fare.airline === airlineFilter,
    )
    .filter((fare) => luggageFilter === "Any" || fare.luggage === luggageFilter)
    .filter((fare) => {
      if (departureFilter === "Any time") return true;

      const hour =
        Number(fare.time.split(":")[0]) +
        (fare.time.includes("PM") && fare.time.startsWith("12") === false
          ? 12
          : 0);

      if (departureFilter === "Morning") return hour < 12;
      if (departureFilter === "Afternoon") return hour >= 12 && hour < 17;
      if (departureFilter === "Evening") return hour >= 17;
      return true;
    })
    .sort((a, b) => (sortBy === "cheapest" ? a.price - b.price : 0));

  const fareCalendar = [
    { day: 18, price: 7802 },
    { day: 19, price: 5800 },
    { day: 20, price: 6517 },
    { day: 21, price: 14856 },
    { day: 22, price: 5800 },
    { day: 23, price: 5800 },
    { day: 24, price: 5800 },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6EF] font-sans text-[#13294B]">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#13294B] text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <button
            type="button"
            onClick={resetBooking}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xl font-black tracking-wide">
              <Plane className="h-5 w-5 -rotate-45" />
              TRIPZO
            </span>
            <span>
              <span className="block text-sm font-black">
                NEPAL TRAVEL PORTAL
              </span>
              <span className="text-[10px] text-teal-300">
                DISCOVER MORE. TRAVEL BETTER.
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1">
            {["NPR", "USD"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCurrency(item)}
                className={`rounded-lg px-4 py-2 text-xs font-bold ${
                  currency === item
                    ? "bg-teal-600 text-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {item === "NPR" ? "🇳🇵 NPR" : "🌐 USD"}
              </button>
            ))}
          </div>
        </div>
      </header>
      {/* SEARCH PAGE */}
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
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-500/20 px-4 py-2 text-xs font-bold text-teal-100">
                <Plane className="h-4 w-4" />
                YOUR JOURNEY STARTS HERE
              </span>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                Explore Nepal.
                <span className="block text-teal-300">
                  Find your next flight.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                Explore domestic routes and manage your booking in one place.
              </p>

              <form
                onSubmit={handleSearch}
                className="mt-10 rounded-2xl bg-white p-5 text-[#13294B] shadow-2xl sm:p-7"
              >
                <div className="mb-5 flex items-center gap-2 font-black">
                  <Search className="h-5 w-5 text-teal-700" />
                  Search domestic flights
                </div>

                <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label
                      htmlFor="fromCity"
                      className="mb-2 block text-xs font-bold text-slate-500"
                    >
                      FROM
                    </label>
                    <select
                      id="fromCity"
                      value={fromCity}
                      onChange={(event) => setFromCity(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-[#F4F6EF] p-4 text-sm font-bold outline-none focus:border-teal-600"
                    >
                      {AIRPORTS.map((airport) => (
                        <option key={airport} value={airport}>
                          {airport}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-center md:col-span-1">
                    <button
                      type="button"
                      onClick={handleSwapAirports}
                      aria-label="Swap departure and destination"
                      className="rounded-full border border-slate-200 p-3 text-teal-700 transition hover:bg-teal-50"
                    >
                      <ArrowRightLeft className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="md:col-span-3">
                    <label
                      htmlFor="toCity"
                      className="mb-2 block text-xs font-bold text-slate-500"
                    >
                      TO
                    </label>
                    <select
                      id="toCity"
                      value={toCity}
                      onChange={(event) => setToCity(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-[#F4F6EF] p-4 text-sm font-bold outline-none focus:border-teal-600"
                    >
                      {AIRPORTS.map((airport) => (
                        <option key={airport} value={airport}>
                          {airport}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="departDate"
                      className="mb-2 block text-xs font-bold text-slate-500"
                    >
                      DEPARTURE
                    </label>
                    <input
                      id="departDate"
                      type="date"
                      min={new Date().toLocaleDateString("en-CA")}
                      value={departDate}
                      onChange={(event) => setDepartDate(event.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-[#F4F6EF] p-4 text-sm font-bold outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label
                      htmlFor="paxCount"
                      className="mb-2 block text-xs font-bold text-slate-500"
                    >
                      PASSENGERS
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#F4F6EF] p-3">
                      <Users className="h-5 w-5 text-teal-700" />
                      <select
                        id="paxCount"
                        value={paxCount}
                        onChange={(event) =>
                          setPaxCount(Number(event.target.value))
                        }
                        className="w-full bg-transparent text-sm font-bold outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map((count) => (
                          <option key={count} value={count}>
                            {count} {count === 1 ? "Adult" : "Adults"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-9">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-4 font-black text-white transition hover:bg-teal-800"
                    >
                      <Search className="h-5 w-5" />
                      Search flights
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>

          {/* POPULAR DESTINATIONS */}
          <section className="mx-auto max-w-7xl px-4 py-14">
            <SectionTitle
              eyebrow="Explore Nepal"
              title="Popular flight routes"
              description="Choose a destination to start searching."
            />

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  destination: "Pokhara (PKR)",
                  title: "Kathmandu to Pokhara",
                  duration: "20–25 min",
                  price: 5800,
                },
                {
                  destination: "Lukla (LUA - Everest)",
                  title: "Kathmandu to Lukla",
                  duration: "30 min",
                  price: 14500,
                },
                {
                  destination: "Bhairahawa (BWA - Lumbini)",
                  title: "Kathmandu to Bhairahawa",
                  duration: "35 min",
                  price: 6200,
                },
              ].map((route) => (
                <button
                  type="button"
                  key={route.destination}
                  onClick={() => {
                    setFromCity("Kathmandu (KTM)");
                    setToCity(route.destination);
                    setStep("SEARCH");
                    scrollTop();
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">
                      <Clock className="mr-1 inline h-3.5 w-3.5" />
                      {route.duration}
                    </span>
                    <Plane className="h-5 w-5 text-teal-700" />
                  </div>
                  <h3 className="font-black">{route.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    From {formatPrice(route.price, currency)}
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-bold text-teal-700">
                    Search route <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      {/* SEARCH RESULTS */}
      
      {step === "RESULTS" && (
        <div className="min-h-screen bg-slate-50 text-slate-900">
          {/* Selected Route Header */}
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-indigo-600">
                    SELECTED ROUTE
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    ONE WAY : {fromCity} - {toCity}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    » SAT, OCT 31, 2026 | {paxCount} ADULT
                    {paxCount > 1 ? "S" : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStage("SEARCH")}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold hover:bg-slate-100"
                >
                  Modify Search
                </button>
              </div>

              {/* Date navigation */}
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDate("2026-10-30")}
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    selectedDate === "2026-10-30"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  OCT 30, 2026
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate("2026-10-31")}
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    selectedDate === "2026-10-31"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  SAT, OCT 31
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate("2026-11-01")}
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    selectedDate === "2026-11-01"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  NOV 1, 2026 →
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-7">
            {/* Filters */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">7 Filters</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Narrow down your flight options
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAirlineFilter("All Airlines");
                    setLuggageFilter("Any");
                    setDepartureFilter("Any time");
                    setSortBy("cheapest");
                  }}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Reset Filters
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={airlineFilter}
                  onChange={(e) => setAirlineFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <option>All Airlines</option>
                  <option>SHREE AIRLINES</option>
                  <option>BUDDHA AIR</option>
                  <option>YETI AIRLINES</option>
                </select>

                <select
                  value={luggageFilter}
                  onChange={(e) => setLuggageFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <option value="Any">Luggage Option</option>
                  <option value="Included">Luggage Included</option>
                  <option value="Not included">Luggage Not Included</option>
                </select>

                <select
                  value={departureFilter}
                  onChange={(e) => setDepartureFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <option>Any time</option>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <option value="cheapest">Cheapest First</option>
                </select>
              </div>
            </div>

            {/* Results + Sidebar */}
            <div className="mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
              {/* Flight results */}
              <section>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">7 Filter Search</h2>
                    <p className="mt-1 text-xs font-bold tracking-wider text-slate-500">
                      DOMESTIC CARRIER LOWEST FARES
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    ● REAL-TIME API SYNCHRONIZED
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredFares.map((fare) => (
                    <div
                      key={fare.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Plane size={23} />
                        </div>

                        <div>
                          <h3 className="font-extrabold">{fare.airline}</h3>

                          <p className="mt-1 text-sm text-slate-500">
                            KTM → PKR · {fare.time}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Luggage: {fare.luggage}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        <div className="sm:text-right">
                          <p className="text-xs text-slate-500">
                            Price per adult
                          </p>
                          <p className="text-xl font-black text-indigo-700">
                            NPR {fare.price.toLocaleString("en-US")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFlight(fare);
                            setStage("CHECKOUT");
                          }}
                          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredFares.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                      <p className="font-bold">
                        No flights match these filters.
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Try changing your airline, luggage, or departure-time
                        filters.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Departure fare calendar */}
              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black">Departure</h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  KTM → PKR
                </p>

                <p className="mt-1 text-xs text-slate-400">OCT 2026</p>

                <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {fareCalendar.map((day) => (
                    <button
                      key={day.day}
                      type="button"
                      onClick={() =>
                        setSelectedDate(
                          `2026-10-${String(day.day).padStart(2, "0")}`,
                        )
                      }
                      className={`min-w-0 rounded-lg px-1 py-2 text-center transition ${
                        selectedDate ===
                        `2026-10-${String(day.day).padStart(2, "0")}`
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-50 hover:bg-indigo-50"
                      }`}
                    >
                      <span className="block text-xs font-bold">{day.day}</span>
                      <span className="mt-1 block text-[9px]">
                        {day.price.toLocaleString("en-US")}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-semibold text-emerald-700">
                    Lowest Fare Today:
                  </p>
                  <p className="mt-1 text-xl font-black text-emerald-800">
                    NPR{" "}
                    {Math.min(
                      ...fareCalendar.map((day) => day.price),
                    ).toLocaleString("en-US")}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
      {/* PASSENGER CHECKOUT */}
      {step === "CHECKOUT" && selectedFlight && (
        <main className="mx-auto max-w-5xl px-4 py-8">
          <button
            type="button"
            onClick={() => setStep("RESULTS")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to flights
          </button>

          <SectionTitle
            eyebrow="Step 2 of 3"
            title="Passenger details"
            description="Enter the passenger information for this booking."
          />

          <div className="grid gap-6 lg:grid-cols-5">
            <form
              onSubmit={handleProceedToPayment}
              className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-bold"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={passenger.fullName}
                    onChange={handlePassengerChange}
                    required
                    autoComplete="name"
                    placeholder="Name as shown on ID"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={passenger.email}
                    onChange={handlePassengerChange}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold"
                  >
                    Phone number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={passenger.phone}
                    onChange={handlePassengerChange}
                    required
                    autoComplete="tel"
                    placeholder="+977 98XXXXXXXX"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="passport"
                    className="mb-2 block text-sm font-bold"
                  >
                    Passport / citizenship number
                  </label>
                  <input
                    id="passport"
                    name="passport"
                    value={passenger.passport}
                    onChange={handlePassengerChange}
                    required
                    placeholder="Enter document number"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="mb-3 font-black">Choose your seat</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {SEATS.map((seat) => (
                    <button
                      type="button"
                      key={seat}
                      onClick={() => setSelectedSeat(seat)}
                      aria-pressed={selectedSeat === seat}
                      className={`rounded-xl border p-3 text-sm font-bold transition ${
                        selectedSeat === seat
                          ? "border-teal-700 bg-teal-700 text-white"
                          : "border-slate-200 bg-[#F4F6EF] hover:border-teal-600"
                      }`}
                    >
                      {seat}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Sample seat selection only. Actual availability must be
                  confirmed by the airline or booking backend.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-teal-700 p-4 font-black text-white transition hover:bg-teal-800"
              >
                Continue to payment
                <ArrowRight className="ml-2 inline h-5 w-5" />
              </button>
            </form>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <h3 className="text-lg font-black">Booking summary</h3>

              <div className="my-5 rounded-xl bg-[#F4F6EF] p-4">
                <p className="font-black">{selectedFlight.airline}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Flight {selectedFlight.flightNo}
                </p>
                <div className="my-4 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xl font-black">
                      {selectedFlight.fromCode}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedFlight.depTime}
                    </p>
                  </div>
                  <Plane className="h-5 w-5 text-teal-700" />
                  <div className="text-right">
                    <p className="text-xl font-black">
                      {selectedFlight.toCode}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedFlight.arrTime}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  <CalendarDays className="mr-2 inline h-4 w-4" />
                  {departDate}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Price per passenger</span>
                  <span className="font-bold">
                    {formatPrice(unitPrice, currency)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Passengers</span>
                  <span className="font-bold">{paxCount}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Selected seat</span>
                  <span className="font-bold">{selectedSeat}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
                  <span className="font-black">Total</span>
                  <span className="text-xl font-black text-teal-700">
                    {formatPrice(totalAmount, currency)}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </main>
      )}
      {/* PAYMENT DEMO */}
      {step === "KHALTI_PAY" && selectedFlight && (
        <main className="mx-auto max-w-lg px-4 py-10">
          <button
            type="button"
            onClick={() => setStep("CHECKOUT")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to passenger details
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="rounded-xl bg-purple-700 p-5 text-center text-white">
              <Wallet className="mx-auto h-8 w-8" />
              <h1 className="mt-2 text-2xl font-black">Khalti payment</h1>
              <p className="mt-1 text-xs text-purple-100">
                Tripzo flight booking
              </p>
            </div>

            <div className="my-6 space-y-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Flight</span>
                <span className="text-right font-bold">
                  {selectedFlight.flightNo}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Passenger</span>
                <span className="text-right font-bold">
                  {passenger.fullName}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Date</span>
                <span className="font-bold">{departDate}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-4">
                <span className="font-black">Total amount</span>
                <span className="text-xl font-black text-purple-700">
                  {formatPrice(totalAmount, currency)}
                </span>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-black">Development demo</p>
              <p className="mt-1 text-xs leading-5">
                The button below simulates a successful payment. It does not
                charge money or verify a transaction with Khalti.
              </p>
            </div>

            {paymentMessage && (
              <p className="mb-4 text-sm text-red-600">{paymentMessage}</p>
            )}

            <button
              type="button"
              onClick={handleDemoPayment}
              className="w-full rounded-xl bg-purple-700 p-4 font-black text-white transition hover:bg-purple-800"
            >
              Simulate successful payment
              <CheckCircle2 className="ml-2 inline h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setStep("CHECKOUT")}
              className="mt-3 w-full rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </main>
      )}
      {/* E-TICKET */}
      {step === "ETICKET" && issuedTicket && (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="bg-[#13294B] p-8 text-center text-white">
              <CheckCircle2 className="mx-auto h-12 w-12 text-teal-300" />
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-teal-300">
                Demo booking confirmation
              </p>
              <h1 className="mt-2 text-3xl font-black">TRIPZO</h1>
              <p className="mt-3 text-sm text-white/70">Booking reference</p>
              <p className="mt-1 font-mono text-2xl font-black">
                {issuedTicket.pnr}
              </p>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                This is a sample ticket generated by the frontend demo. It is
                not a real airline ticket or proof of payment.
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Passenger
                  </p>
                  <p className="mt-1 font-black">
                    {issuedTicket.passenger.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 break-all font-bold">
                    {issuedTicket.passenger.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Airline
                  </p>
                  <p className="mt-1 font-black">
                    {issuedTicket.flight.airline}
                  </p>
                  <p className="text-sm text-slate-500">
                    {issuedTicket.flight.flightNo}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Seat
                  </p>
                  <p className="mt-1 font-black">{issuedTicket.seat}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Route
                  </p>
                  <p className="mt-1 font-black">
                    {issuedTicket.flight.fromCode} →{" "}
                    {issuedTicket.flight.toCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Departure
                  </p>
                  <p className="mt-1 font-black">
                    {issuedTicket.departureDate}
                  </p>
                  <p className="text-sm text-slate-500">
                    {issuedTicket.flight.depTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Passengers
                  </p>
                  <p className="mt-1 font-black">
                    {issuedTicket.passengerCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Total amount
                  </p>
                  <p className="mt-1 text-xl font-black text-teal-700">
                    {formatPrice(
                      issuedTicket.totalAmount,
                      issuedTicket.currency,
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-5">
                <div className="flex items-center gap-3 rounded-xl bg-[#F4F6EF] p-4">
                  <Ticket className="h-8 w-8 shrink-0 text-teal-700" />
                  <div>
                    <p className="font-black">Tripzo booking record</p>
                    <p className="text-xs text-slate-500">
                      Created {issuedTicket.issuedDate}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 rounded-xl bg-teal-700 p-4 font-black text-white hover:bg-teal-800"
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={resetBooking}
                  className="flex-1 rounded-xl bg-slate-100 p-4 font-black text-slate-700 hover:bg-slate-200"
                >
                  Book another flight
                </button>
              </div>
            </div>
          </div>
        </main>
      )}
      {/* FOOTER */}
      <footer className="mt-12 border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-black text-[#13294B]">TRIPZO NEPAL</p>
            <p className="mt-1 text-xs text-slate-500">
              Your journey, made simpler.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Sample flight data · Demo booking interface
          </p>
        </div>
      </footer>
    </div>
  );
}
