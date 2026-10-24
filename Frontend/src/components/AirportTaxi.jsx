import { useCallback, useEffect, useState } from "react";
import {
  Car,
  ShieldCheck,
  LoaderCircle,
  Clock,
  MapPin,
  CheckCircle2,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  User,
  Phone,
  CalendarDays,
  Route,
  CircleDot,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Info,
  Users,
  RefreshCw,
  Navigation2,
  Timer,
  BadgeCheck,
  LockKeyhole,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const steps = [
  { id: 1, label: "Route" },
  { id: 2, label: "Vehicle" },
  { id: 3, label: "Details" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Confirm" },
];

const defaultForm = {
  customerName: "",
  customerPhone: "",
  pickupDate: "",
  pickupTime: "",
  passengers: 1,
  pickupNote: "",
};

const defaultPayment = {
  method: "cash",
};

function homeTaxiSearch() {
  try {
    const value = JSON.parse(sessionStorage.getItem("tripzoHomeSearch") || "null");
    if (value?.service === "taxi") return value;
  } catch { /* Use the taxi page's normal defaults. */ }
  return {};
}

export default function AirportTaxi({ formatPrice }) {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState(() => {
    const search = homeTaxiSearch();
    return { ...defaultForm, pickupDate: search.date || "", pickupTime: search.time || "", passengers: Number(search.passengers) || 1 };
  });
  const [payment, setPayment] = useState(defaultPayment);

  const [bookingData, setBookingData] = useState(null);

  const [tripStatus, setTripStatus] = useState("CONFIRMED");


  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/taxis/routes`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load taxi routes.");
      }

      const data = result.data || [];
      setRoutes(data);
      const search = homeTaxiSearch();
      const requested = data.find((route) =>
        (!search.pickup || `${route.pickupLocation}`.toLowerCase().includes(search.pickup.toLowerCase()) || search.pickup.toLowerCase().includes(`${route.pickupLocation}`.toLowerCase())) &&
        (!search.destination || `${route.destination}`.toLowerCase().includes(search.destination.toLowerCase()) || search.destination.toLowerCase().includes(`${route.destination}`.toLowerCase()))
      );
      setSelectedRoute((current) => requested || current || data[0] || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRoutes(), 0);

    return () => window.clearTimeout(timer);
  }, [loadRoutes]);

  useEffect(() => {
    const reference = bookingData?.bookingReference;
    if (step !== 5 || !reference) return undefined;
    let active = true;
    const refreshStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/taxis/bookings/${encodeURIComponent(reference)}`);
        const result = await response.json();
        if (response.ok && active && result.data) {
          setBookingData((current) => ({ ...current, ...result.data }));
          setTripStatus(result.data.status || "CONFIRMED");
        }
      } catch { /* Keep the last server-confirmed booking status visible. */ }
    };
    const initial = window.setTimeout(() => void refreshStatus(), 0);
    const interval = window.setInterval(() => void refreshStatus(), 15000);
    return () => { active = false; window.clearTimeout(initial); window.clearInterval(interval); };
  }, [step, bookingData?.bookingReference]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectRoute(route) {
    setSelectedRoute(route);
    setStep(2);
    setError("");
    setSuccess("");
  }

  function validateStep(currentStep) {
    setError("");

    if (currentStep === 1 && !selectedRoute) {
      setError("Please select a taxi route.");
      return false;
    }

    if (currentStep === 2 && !selectedRoute) {
      setError("Please select a vehicle route.");
      return false;
    }

    if (currentStep === 3) {
      if (!form.customerName.trim()) {
        setError("Please enter your name.");
        return false;
      }

      if (!form.customerPhone.trim()) {
        setError("Please enter your phone number.");
        return false;
      }

      if (!form.pickupDate) {
        setError("Please select the pickup date.");
        return false;
      }

      if (!form.pickupTime) {
        setError("Please select the pickup time.");
        return false;
      }

      if (!form.passengers || form.passengers < 1) {
        setError("Please select the number of passengers.");
        return false;
      }
    }

    if (currentStep === 4 && !payment.method) {
      setError("Please select a payment method.");
      return false;
    }

    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;

    setStep((current) => Math.min(current + 1, 5));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function requestTaxi(event) {
    event.preventDefault();

    if (!validateStep(4)) return;

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
          ...(sessionStorage.getItem("tripzoCustomerToken") ? { Authorization: `Bearer ${sessionStorage.getItem("tripzoCustomerToken")}` } : {}),
        },
        body: JSON.stringify({
          routeId: selectedRoute.id,
          ...form,

          paymentMethod: payment.method,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Taxi booking failed.");
      }

      const booking = result.data || {};

      setBookingData({
        ...booking,
        bookingId: booking.bookingId || booking.id,
        bookingReference: booking.bookingReference,
      });

      setTripStatus(booking.status || "CONFIRMED");
      setSuccess("Your taxi has been booked successfully.");
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  function resetBooking() {
    setStep(1);
    setSelectedRoute(routes[0] || null);
    setForm(defaultForm);
    setPayment(defaultPayment);
    setBookingData(null);
    setTripStatus("BOOKED");
    setError("");
    setSuccess("");
  }

  function openGoogleMaps() {
    if (!selectedRoute) return;

    const origin = encodeURIComponent(selectedRoute.pickupLocation);
    const destination = encodeURIComponent(selectedRoute.destination);

    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <section className="relative overflow-hidden bg-[#13294B] text-white rounded-3xl shadow-xl">
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-[#327D81]/20" />
        <div className="absolute -left-20 -bottom-32 w-72 h-72 rounded-full bg-white/5" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-bold mb-4">
                <ShieldCheck size={15} />
                Tripzo Verified Taxi
              </div>

              <h2 className="text-2xl md:text-3xl font-black">Airport Taxi</h2>

              <p className="text-sm text-white/70 mt-2 max-w-xl">
                Book a verified airport transfer with fixed fares, clear pickup
                information and a simple Tripzo booking experience.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
              <Car className="text-[#56B8BA]" />
              <div>
                <p className="text-xs text-white/60">Available service</p>
                <p className="font-bold">Airport Transfer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STEP PROGRESS */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {steps.map((item, index) => {
            const active = step === item.id;
            const completed = step > item.id;

            return (
              <div key={item.id} className="flex items-center min-w-max flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition ${
                      completed
                        ? "bg-[#327D81] text-white"
                        : active
                          ? "bg-[#13294B] text-white"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {completed ? <CheckCircle2 size={18} /> : item.id}
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      active || completed ? "text-[#13294B]" : "text-slate-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                {index !== steps.length - 1 && (
                  <div
                    className={`h-px flex-1 mx-3 ${
                      completed ? "bg-[#327D81]" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && step !== 5 && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm">
          {success}
        </div>
      )}

      {/* STEP 1 - ROUTE */}
      {step === 1 && (
        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-[#327D81]">
                    Step 1
                  </p>
                  <h3 className="text-xl font-black text-[#13294B] mt-1">
                    Choose your route
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Select where you want to go from the airport.
                  </p>
                </div>

                <Route className="text-[#327D81]" />
              </div>
            </div>

            <div className="p-5 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <LoaderCircle className="animate-spin mr-2" size={20} />
                  Loading routes...
                </div>
              ) : routes.length === 0 ? (
                <div className="py-16 text-center">
                  <Car className="mx-auto text-slate-300" size={38} />
                  <p className="font-bold text-slate-700 mt-3">
                    No taxi routes available
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Ask the Tripzo administrator to add a taxi route.
                  </p>

                  <button
                    type="button"
                    onClick={loadRoutes}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm"
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>
              ) : (
                routes.map((route) => {
                  const active = selectedRoute?.id === route.id;

                  return (
                    <button
                      type="button"
                      key={route.id}
                      onClick={() => selectRoute(route)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                        active
                          ? "border-[#327D81] bg-[#327D81]/5 shadow-sm"
                          : "border-slate-200 hover:border-[#327D81]/50"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                              active
                                ? "bg-[#327D81] text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Car size={21} />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#13294B]">
                                {route.pickupLocation}
                              </span>
                              <ArrowRight
                                size={15}
                                className="text-slate-400"
                              />
                              <span className="font-black text-[#13294B]">
                                {route.destination}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={13} />
                                {route.estimatedMinutes} min
                              </span>

                              <span className="flex items-center gap-1">
                                <Users size={13} />
                                Up to 8 passengers
                              </span>

                              <span className="flex items-center gap-1">
                                <BadgeCheck size={13} />
                                Verified
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs text-slate-400">Fixed fare</p>
                          <p className="text-lg font-black text-[#327D81]">
                            {formatPrice(route.fare, route.currency)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <RoutePreview
            route={selectedRoute}
            formatPrice={formatPrice}
            onOpenMap={openGoogleMaps}
          />
        </section>
      )}

      {/* STEP 2 - VEHICLE */}
      {step === 2 && selectedRoute && (
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs uppercase tracking-wider font-bold text-[#327D81]">
                Step 2
              </p>

              <h3 className="text-xl font-black text-[#13294B] mt-1">
                Choose your taxi
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Your administrator controls the available vehicle type and fixed
                fare.
              </p>

              <div className="mt-5 border-2 border-[#327D81] bg-[#327D81]/5 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-[#327D81] shadow-sm">
                      <Car size={34} />
                    </div>

                    <div>
                      <p className="text-xs text-[#327D81] font-bold uppercase">
                        Selected vehicle
                      </p>

                      <h4 className="text-lg font-black text-[#13294B]">
                        {selectedRoute.vehicleType || "Standard Taxi"}
                      </h4>

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Users size={13} />
                          1–8 passengers
                        </span>

                        <span className="flex items-center gap-1">
                          <ShieldCheck size={13} />
                          Capacity: {selectedRoute.maxPassengers || 4} passengers
                        </span>

                        <span className="flex items-center gap-1">
                          <LockKeyhole size={13} />
                          Fixed fare
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs text-slate-500">Total fare</p>
                    <p className="text-2xl font-black text-[#327D81]">
                      {formatPrice(selectedRoute.fare, selectedRoute.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <MapCard route={selectedRoute} onOpenMap={openGoogleMaps} />
          </div>

          <BookingSummary
            route={selectedRoute}
            form={form}
            formatPrice={formatPrice}
          />
        </section>
      )}

      {/* STEP 3 - CUSTOMER DETAILS */}
      {step === 3 && selectedRoute && (
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
            <p className="text-xs uppercase tracking-wider font-bold text-[#327D81]">
              Step 3
            </p>

            <h3 className="text-xl font-black text-[#13294B] mt-1">
              Passenger & pickup details
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Enter the information your driver needs to reach you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <InputField
                label="Full name"
                icon={User}
                value={form.customerName}
                onChange={(value) => updateForm("customerName", value)}
                placeholder="Your full name"
              />

              <InputField
                label="Phone number"
                icon={Phone}
                value={form.customerPhone}
                onChange={(value) => updateForm("customerPhone", value)}
                placeholder="+977 98XXXXXXXX"
                type="tel"
              />

              <InputField
                label="Pickup date"
                icon={CalendarDays}
                value={form.pickupDate}
                onChange={(value) => updateForm("pickupDate", value)}
                type="date"
              />

              <InputField
                label="Pickup time"
                icon={Clock}
                value={form.pickupTime}
                onChange={(value) => updateForm("pickupTime", value)}
                type="time"
              />

              <div className="md:col-span-2">
                <label className="block">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#13294B] mb-2">
                    <Users size={16} className="text-[#327D81]" />
                    Number of passengers
                  </span>

                  <select
                    value={form.passengers}
                    onChange={(e) =>
                      updateForm("passengers", Number(e.target.value))
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#327D81]/20"
                  >
                    {Array.from({ length: 8 }, (_, index) => index + 1).map(
                      (number) => (
                        <option key={number} value={number}>
                          {number} passenger{number > 1 ? "s" : ""}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#13294B] mb-2">
                    <Info size={16} className="text-[#327D81]" />
                    Pickup note
                  </span>

                  <textarea
                    value={form.pickupNote}
                    onChange={(e) => updateForm("pickupNote", e.target.value)}
                    rows={4}
                    placeholder="Example: I will wait near the airport arrival gate."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[#327D81]/20"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-[#F4F6EF] flex gap-3">
              <ShieldCheck className="text-[#327D81] shrink-0" size={20} />

              <div>
                <p className="text-sm font-bold text-[#13294B]">
                  Your information is used for your taxi booking
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Your driver needs your name and phone number to coordinate
                  pickup.
                </p>
              </div>
            </div>
          </div>

          <BookingSummary
            route={selectedRoute}
            form={form}
            formatPrice={formatPrice}
          />
        </section>
      )}

      {/* STEP 4 - PAYMENT */}
      {step === 4 && selectedRoute && (
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
            <p className="text-xs uppercase tracking-wider font-bold text-[#327D81]">
              Step 4
            </p>

            <h3 className="text-xl font-black text-[#13294B] mt-1">
              Choose payment method
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Select how you want to pay for your taxi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <PaymentOption
                active={payment.method === "cash"}
                icon={Banknote}
                title="Pay on arrival"
                description="Pay the driver after pickup."
                onClick={() =>
                  setPayment({
                    method: "cash",
                  })
                }
              />

              <PaymentOption
                active={payment.method === "card"}
                icon={CreditCard}
                title="Card"
                description="Pay securely by card."
                disabled
                onClick={() =>
                  setPayment({
                    method: "card",
                  })
                }
              />

              <PaymentOption
                active={payment.method === "wallet"}
                icon={Wallet}
                title="Digital Wallet"
                description="Connect your supported wallet."
                disabled
                onClick={() =>
                  setPayment({
                    method: "wallet",
                  })
                }
              />

              <PaymentOption
                active={payment.method === "mobile"}
                icon={Smartphone}
                title="Mobile Payment"
                description="Pay through supported mobile payment."
                disabled
                onClick={() =>
                  setPayment({
                    method: "mobile",
                  })
                }
              />
            </div>

            {payment.method !== "cash" && (
              <div className="mt-5 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                <div className="flex gap-3">
                  <Info size={19} className="shrink-0 mt-0.5" />

                  <div>
                    <p className="font-bold text-sm">
                      Payment integration required
                    </p>

                    <p className="text-xs mt-1">
                      Online payment is unavailable because no payment provider
                      is configured. Choose cash to create a confirmed booking.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-5 rounded-2xl bg-[#F4F6EF]">
              <div className="flex items-center gap-3">
                <LockKeyhole className="text-[#327D81]" size={20} />

                <div>
                  <p className="font-bold text-sm text-[#13294B]">
                    Secure payment
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Tripzo does not store your full card details in the
                    frontend.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <BookingSummary
            route={selectedRoute}
            form={form}
            payment={payment}
            formatPrice={formatPrice}
          />
        </section>
      )}

      {/* STEP 5 - CONFIRMATION / TRACKING */}
      {step === 5 && bookingData && selectedRoute && (
        <section className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <div className="bg-[#13294B] text-white p-7 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#327D81] flex items-center justify-center">
                <CheckCircle2 size={34} />
              </div>

              <p className="text-xs uppercase tracking-widest text-white/60 font-bold mt-5">
                Booking {bookingData.status === "CONFIRMED" ? "confirmed" : "received"}
              </p>

              <h3 className="text-2xl font-black mt-2">Your taxi is booked</h3>

              <p className="text-sm text-white/70 mt-2">
                Booking reference:{" "}
                <span className="font-bold text-white">
                  {bookingData.bookingReference || bookingData.bookingId}
                </span>
              </p>
            </div>

            <div className="p-5 md:p-7">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <MapCard
                    route={selectedRoute}
                    onOpenMap={openGoogleMaps}
                  />
                </div>

                <div className="space-y-4">
                  <TripStatus status={tripStatus} />

                  <div className="border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase font-bold text-slate-400">
                      Trip information
                    </p>

                    <div className="mt-4 space-y-4">
                      <DetailRow
                        icon={MapPin}
                        label="Pickup"
                        value={selectedRoute.pickupLocation}
                      />

                      <DetailRow
                        icon={Navigation2}
                        label="Destination"
                        value={selectedRoute.destination}
                      />

                      <DetailRow
                        icon={CalendarDays}
                        label="Pickup"
                        value={`${form.pickupDate} at ${form.pickupTime}`}
                      />

                      <DetailRow
                        icon={Users}
                        label="Passengers"
                        value={`${form.passengers}`}
                      />

                      <DetailRow
                        icon={CreditCard}
                        label="Payment"
                        value={paymentLabel(payment.method)}
                      />

                      <DetailRow
                        icon={Banknote}
                        label="Fare"
                        value={formatPrice(
                          selectedRoute.fare,
                          selectedRoute.currency,
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoCard
                  icon={Phone}
                  title="Driver contact"
                  text={bookingData.driverName ? `${bookingData.driverName} · ${bookingData.driverPhone || "Phone not provided"}${bookingData.vehicleNumber ? ` · ${bookingData.vehicleNumber}` : ""}` : "No driver has been assigned yet."}
                />

                <InfoCard
                  icon={Timer}
                  title="Estimated time"
                  text={`${selectedRoute.estimatedMinutes || 30} minutes`}
                />

                <InfoCard
                  icon={ShieldCheck}
                  title="Tripzo protection"
                  text="Your booking is recorded in the Tripzo system."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-7">
                <button
                  type="button"
                  onClick={openGoogleMaps}
                  className="flex-1 bg-[#327D81] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Navigation2 size={17} />
                  Open route in Maps
                </button>

                <button
                  type="button"
                  onClick={resetBooking}
                  className="flex-1 border border-slate-200 py-3 rounded-xl font-bold text-[#13294B]"
                >
                  Book another taxi
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* NAVIGATION BUTTONS */}
      {step < 5 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 1}
            className="order-2 sm:order-1 px-5 py-3 rounded-xl border border-slate-200 font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <ChevronLeft size={17} />
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="order-1 sm:order-2 px-6 py-3 rounded-xl bg-[#13294B] text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={requestTaxi}
              disabled={booking}
              className="order-1 sm:order-2 px-6 py-3 rounded-xl bg-[#327D81] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {booking ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Booking taxi...
                </>
              ) : (
                <>
                  <LockKeyhole size={17} />
                  Confirm & Book Taxi
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   ROUTE PREVIEW
------------------------------------------------------- */

function RoutePreview({ route, formatPrice, onOpenMap }) {
  if (!route) {
    return (
      <div className="bg-slate-100 rounded-2xl min-h-[350px] flex items-center justify-center text-center p-8">
        <div>
          <MapPin className="mx-auto text-slate-300" size={42} />
          <p className="font-bold text-slate-600 mt-3">
            Select a route to see details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="relative h-[250px] bg-[#E9F1EC] overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-8 border-white" />
            <div className="absolute bottom-5 right-10 w-40 h-40 rounded-full border-8 border-white" />
            <div className="absolute top-1/2 left-0 right-0 h-3 bg-white rotate-6" />
          </div>

          <div className="absolute top-6 left-6 bg-white rounded-xl shadow-md px-3 py-2 flex items-center gap-2">
            <CircleDot className="text-[#327D81]" size={16} />
            <span className="text-xs font-bold">{route.pickupLocation}</span>
          </div>

          <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-md px-3 py-2 flex items-center gap-2">
            <MapPin className="text-red-500" size={16} />
            <span className="text-xs font-bold">{route.destination}</span>
          </div>

          <div className="absolute left-[35%] top-[48%] right-[25%] h-1 bg-[#327D81] rotate-[12deg] rounded-full" />

          <div className="absolute left-[48%] top-[45%] w-10 h-10 rounded-full bg-[#327D81] text-white flex items-center justify-center shadow-lg">
            <Car size={19} />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-[#13294B] text-sm">
                {route.pickupLocation}
              </p>
              <p className="text-xs text-slate-400 my-1">to</p>
              <p className="font-black text-[#13294B] text-sm">
                {route.destination}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Fare</p>
              <p className="font-black text-[#327D81]">
                {formatPrice(route.fare, route.currency)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenMap}
            className="w-full mt-4 border border-[#327D81] text-[#327D81] rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Navigation2 size={16} />
            Open route in Google Maps
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MAP
------------------------------------------------------- */

function MapCard({ route, onOpenMap }) {
  if (!route) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="font-black text-[#13294B] flex items-center gap-2">
            <MapPin size={17} className="text-[#327D81]" />
            Route preview
          </p>

          <p className="text-xs text-slate-500 mt-1">Route overview only. Driver location is not available.</p>
        </div>

      </div>

      <div className="grid gap-3 bg-[#E9F1EC] p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Pickup</p><p className="font-bold">{route.pickupLocation}</p></div>
        <div className="text-center text-[#327D81]"><ArrowRight className="mx-auto"/><p className="mt-1 text-xs">{route.estimatedDistanceKm ? `${route.estimatedDistanceKm} km · ` : ""}{route.estimatedMinutes || "—"} min</p></div>
        <div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Destination</p><p className="font-bold">{route.destination}</p></div>
        <button
          type="button"
          onClick={onOpenMap}
          className="sm:col-span-3 bg-white shadow-xl rounded-xl px-4 py-2.5 text-xs font-black text-[#13294B] flex items-center justify-center gap-2"
        >
          <Navigation2 size={15} className="text-[#327D81]" />
          Open Maps
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   BOOKING SUMMARY
------------------------------------------------------- */

function BookingSummary({ route, form, payment, formatPrice }) {
  if (!route) return null;

  return (
    <aside className="bg-white rounded-2xl border border-slate-200 p-5 h-fit lg:sticky lg:top-5">
      <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
        Booking summary
      </p>

      <h3 className="font-black text-[#13294B] mt-2">
        {route.pickupLocation} → {route.destination}
      </h3>

      <div className="mt-5 space-y-4">
        <DetailRow
          icon={Car}
          label="Vehicle"
          value={route.vehicleType || "Standard Taxi"}
        />

        <DetailRow
          icon={Clock}
          label="Estimated duration"
          value={`${route.estimatedMinutes || 30} minutes`}
        />

        <DetailRow
          icon={Users}
          label="Passengers"
          value={`${form?.passengers || 1}`}
        />

        {form?.pickupDate && (
          <DetailRow
            icon={CalendarDays}
            label="Pickup"
            value={`${form.pickupDate} ${form.pickupTime || ""}`}
          />
        )}

        {payment && (
          <DetailRow
            icon={CreditCard}
            label="Payment"
            value={paymentLabel(payment.method)}
          />
        )}
      </div>

      <div className="border-t border-slate-100 mt-5 pt-5 flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-400">Total fare</p>
          <p className="text-2xl font-black text-[#327D81]">
            {formatPrice(route.fare, route.currency)}
          </p>
        </div>

        <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded-full">
          Fixed fare
        </span>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------
   PAYMENT
------------------------------------------------------- */

function PaymentOption({ active, icon: Icon, title, description, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-[#327D81] bg-[#327D81]/5"
          : "border-slate-200 hover:border-[#327D81]/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            active ? "bg-[#327D81] text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon size={20} />
        </div>

        <div>
          <p className="font-black text-sm text-[#13294B]">{title}</p>

          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------
   INPUT
------------------------------------------------------- */

function InputField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-bold text-[#13294B] mb-2">
        <Icon size={16} className="text-[#327D81]" />
        {label}
      </span>

      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#327D81] focus:ring-2 focus:ring-[#327D81]/10"
      />
    </label>
  );
}

/* -------------------------------------------------------
   STATUS
------------------------------------------------------- */

function TripStatus({ status }) {
  const statuses = [
    {
      id: "CONFIRMED",
      title: "Booking confirmed",
      description: "Your cash booking is confirmed. Payment is due to the driver.",
    },
    {
      id: "DRIVER_ASSIGNED",
      title: "Driver assigned",
      description: "Driver information will appear here.",
    },
    {
      id: "DRIVER_ARRIVING",
      title: "Driver arriving",
      description: "Your taxi is on the way to pickup.",
    },
    {
      id: "ON_TRIP",
      title: "Trip started",
      description: "You are on the way to your destination.",
    },
    {
      id: "COMPLETED",
      title: "Arrived",
      description: "You have reached your destination.",
    },
  ];

  const currentIndex = Math.max(
    statuses.findIndex((item) => item.id === status),
    0,
  );

  return (
    <div className="border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="font-black text-[#13294B]">Trip status</p>

        <span className="text-[10px] uppercase font-black bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
          {status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {statuses.map((item, index) => {
          const complete = index <= currentIndex;
          const current = index === currentIndex;

          return (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    complete
                      ? "bg-[#327D81] text-white"
                      : "bg-slate-100 text-slate-400"
                  } ${current ? "ring-4 ring-[#327D81]/10" : ""}`}
                >
                  {complete ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <CircleDot size={15} />
                  )}
                </div>

                {index !== statuses.length - 1 && (
                  <div
                    className={`w-px flex-1 min-h-[25px] ${
                      index < currentIndex ? "bg-[#327D81]" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>

              <div className="pb-2">
                <p
                  className={`text-sm font-bold ${
                    complete ? "text-[#13294B]" : "text-slate-400"
                  }`}
                >
                  {item.title}
                </p>

                <p className="text-[11px] text-slate-500 mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   DETAIL ROW
------------------------------------------------------- */

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-[#327D81] mt-0.5 shrink-0" />

      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-wide text-slate-400">
          {label}
        </p>

        <p className="text-sm font-bold text-[#13294B] mt-0.5 break-words">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   INFO CARD
------------------------------------------------------- */

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <Icon className="text-[#327D81]" size={21} />

      <p className="font-black text-sm text-[#13294B] mt-3">{title}</p>

      <p className="text-xs text-slate-500 mt-1 leading-5">{text}</p>
    </div>
  );
}

/* -------------------------------------------------------
   PAYMENT LABEL
------------------------------------------------------- */

function paymentLabel(method) {
  const labels = {
    cash: "Pay on arrival",
    card: "Card",
    wallet: "Digital Wallet",
    mobile: "Mobile Payment",
  };

  return labels[method] || "Pay on arrival";
}
