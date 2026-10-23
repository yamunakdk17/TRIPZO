import { useEffect, useState } from "react";
import {
  Plane,
  LayoutDashboard,
  Ticket,
  MapPin,
  Hotel,
  Users,
  Settings,
  LogOut,
  Search,
  Plus,
  Pencil,
  Trash2,
  Menu,
  X,
  RefreshCw,
  IndianRupee,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "flights", label: "Flight Management", icon: Plane },
  { id: "bookings", label: "Bookings", icon: Ticket },
  { id: "airports", label: "Airports", icon: MapPin },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "users", label: "Users", icon: Users },
];

const emptyFlight = {
  airlineId: "",
  flightNumber: "",
  departureAirportId: "",
  arrivalAirportId: "",
  departureAt: "",
  arrivalAt: "",
  price: "",
  currency: "NPR",
};

async function request(endpoint, token, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export default function AdminDashboard() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("tripzo_admin_token") || "",
  );
  const [login, setLogin] = useState({ email: "", password: "" });
  const [activePage, setActivePage] = useState("overview");
  const [flights, setFlights] = useState([]);
  const [stats, setStats] = useState(null);
  const [airlines, setAirlines] = useState([]);
  const [airports, setAirports] = useState([]);
  const [flightForm, setFlightForm] = useState(emptyFlight);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadFlights(currentToken = token) {
    const result = await request("/admin/flights", currentToken);
    setFlights(result.data || []);
  }

  async function loadDashboard(currentToken = token) {
    const result = await request("/admin/dashboard", currentToken);
    setStats(result.data || {});
  }

  async function loadFormOptions(currentToken = token) {
    const [airlineResult, airportResult] = await Promise.all([
      request("/admin/airlines", currentToken),
      request("/admin/airports", currentToken),
    ]);

    setAirlines(airlineResult.data || []);
    setAirports(airportResult.data || []);
  }

  async function loadPage() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      await Promise.all([loadFlights(), loadDashboard(), loadFormOptions()]);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("token")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadPage();
  }, [token]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await request("/admin/login", "", {
        method: "POST",
        body: JSON.stringify(login),
      });

      if (!result.token) {
        throw new Error("The server did not return an admin token.");
      }

      sessionStorage.setItem("tripzo_admin_token", result.token);
      setToken(result.token);
      setSuccess("Welcome to Tripzo Admin.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("tripzo_admin_token");
    setToken("");
    setFlights([]);
    setStats(null);
    setError("");
    setSuccess("");
  }

  function startAddFlight() {
    setEditingId(null);
    setFlightForm(emptyFlight);
    setError("");
    setShowForm(true);
  }

  function startEditFlight(flight) {
    setEditingId(flight.id);
    setFlightForm({
      airlineId: String(flight.airlineId ?? ""),
      flightNumber: flight.flightNumber ?? "",
      departureAirportId: String(flight.departureAirportId ?? ""),
      arrivalAirportId: String(flight.arrivalAirportId ?? ""),
      departureAt: flight.departureAt ? flight.departureAt.slice(0, 16) : "",
      arrivalAt: flight.arrivalAt ? flight.arrivalAt.slice(0, 16) : "",
      price: String(flight.price ?? ""),
      currency: flight.currency || "NPR",
    });
    setError("");
    setShowForm(true);
  }

  async function saveFlight(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (flightForm.departureAirportId === flightForm.arrivalAirportId) {
      setError("Departure and arrival airports must be different.");
      setSaving(false);
      return;
    }

    try {
      const endpoint = editingId
        ? `/admin/flights/${editingId}`
        : "/admin/flights";

      await request(endpoint, token, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(flightForm),
      });

      await Promise.all([loadFlights(), loadDashboard()]);
      setShowForm(false);
      setEditingId(null);
      setFlightForm(emptyFlight);
      setSuccess(editingId ? "Flight updated." : "Flight added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteFlight(id) {
    if (!window.confirm("Delete this flight schedule?")) return;

    setError("");
    setSuccess("");

    try {
      await request(`/admin/flights/${id}`, token, {
        method: "DELETE",
      });
      await Promise.all([loadFlights(), loadDashboard()]);
      setSuccess("Flight deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredFlights = flights.filter((flight) =>
    [flight.flightNumber, flight.airline, flight.fromCode, flight.toCode]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const money = (value, currency = "NPR") =>
    `${currency} ${Number(value || 0).toLocaleString()}`;

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F4F6EF] flex items-center justify-center p-5">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#13294B] text-white flex items-center justify-center mb-6">
            <Plane size={28} />
          </div>

          <p className="text-sm font-bold tracking-widest text-[#327D81] uppercase">
            Tripzo Management
          </p>
          <h1 className="text-3xl font-black text-[#13294B] mt-2">
            Admin sign in
          </h1>
          <p className="text-slate-500 text-sm mt-2 mb-7">
            Sign in with an authorized administrator account.
          </p>

          {error && (
            <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
              {error}
            </p>
          )}

          <label className="block text-sm font-semibold mb-2">
            Admin email
          </label>
          <input
            required
            type="email"
            autoComplete="username"
            value={login.email}
            onChange={(e) => setLogin({ ...login, email: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 mb-5 outline-none focus:ring-2 focus:ring-[#327D81]"
            placeholder="admin@example.com"
          />

          <label className="block text-sm font-semibold mb-2">Password</label>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={login.password}
            onChange={(e) => setLogin({ ...login, password: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 mb-6 outline-none focus:ring-2 focus:ring-[#327D81]"
            placeholder="Enter your password"
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#13294B] text-white py-3 font-bold hover:bg-[#203d67] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in securely"}
          </button>

          <p className="text-xs text-slate-400 mt-5">
            Admin access must be verified by the backend.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6EF] text-[#13294B]">
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#13294B] text-white flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#327D81]">
              <Plane size={23} />
            </div>
            <div>
              <div className="font-black tracking-widest text-lg">TRIPZO</div>
              <div className="text-[10px] text-teal-300 tracking-[0.2em] uppercase">
                Admin Console
              </div>
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X />
          </button>
        </div>

        <div className="px-4 py-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 px-3 mb-3">
            Workspace
          </p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setSidebarOpen(false);
                  setError("");
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold mb-1 transition ${
                  activePage === item.id
                    ? "bg-[#327D81] text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-auto p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center font-bold">
              A
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm">Administrator</p>
              <p className="text-xs text-white/50 truncate">
                Authorized account
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="lg:ml-72 min-h-screen">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-5 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <div>
              <h1 className="font-black text-lg sm:text-xl">
                {navigation.find((item) => item.id === activePage)?.label ||
                  "Admin"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Tripzo / Administration
              </p>
            </div>
          </div>
          <button
            onClick={loadPage}
            disabled={loading}
            className="flex items-center gap-2 border rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
          {error && (
            <div className="flex gap-2 items-start p-4 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex gap-2 items-center p-4 mb-5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-sm">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-5">
              <LoaderCircle size={17} className="animate-spin" />
              Loading data from the server...
            </div>
          )}

          {activePage === "overview" && (
            <>
              <div className="mb-8">
                <p className="text-sm text-[#327D81] font-bold">
                  ADMIN OVERVIEW
                </p>
                <h2 className="text-3xl font-black mt-2">Welcome to Tripzo</h2>
                <p className="text-slate-500 mt-2">
                  Manage travel inventory and bookings from one place.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "Flight schedules",
                    value: stats?.flights ?? flights.length,
                    icon: Plane,
                  },
                  {
                    label: "Bookings",
                    value: stats?.bookings ?? "—",
                    icon: Ticket,
                  },
                  {
                    label: "Registered users",
                    value: stats?.users ?? "—",
                    icon: Users,
                  },
                  {
                    label: "Revenue",
                    value:
                      stats?.revenue != null
                        ? money(stats.revenue, stats.currency || "NPR")
                        : "—",
                    icon: IndianRupee,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <div className="p-2 rounded-xl bg-teal-50 text-[#327D81]">
                          <Icon size={19} />
                        </div>
                      </div>
                      <p className="text-2xl font-black mt-5">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <h3 className="font-black text-lg">
                    Recent flight schedules
                  </h3>
                  <button
                    onClick={() => setActivePage("flights")}
                    className="text-sm text-[#327D81] font-bold"
                  >
                    Manage flights →
                  </button>
                </div>
                <FlightTable
                  flights={flights.slice(0, 5)}
                  onEdit={startEditFlight}
                  onDelete={deleteFlight}
                />
              </div>
            </>
          )}

          {activePage === "flights" && (
            <>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
                <div>
                  <p className="text-sm font-bold text-[#327D81]">INVENTORY</p>
                  <h2 className="text-3xl font-black mt-2">
                    Flight Management
                  </h2>
                  <p className="text-slate-500 mt-2">
                    Maintain schedules, routes, and ticket prices.
                  </p>
                </div>
                <button
                  onClick={startAddFlight}
                  className="inline-flex items-center justify-center gap-2 bg-[#13294B] text-white rounded-xl px-5 py-3 font-bold hover:bg-[#203d67]"
                >
                  <Plus size={18} />
                  Add flight
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row gap-3 justify-between">
                  <div>
                    <h3 className="font-bold">Flight schedules</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {filteredFlights.length} records
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      size={17}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search flight, airline, route..."
                      className="w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <FlightTable
                  flights={filteredFlights}
                  onEdit={startEditFlight}
                  onDelete={deleteFlight}
                />
              </div>
            </>
          )}

          {activePage !== "overview" && activePage !== "flights" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center">
              {(() => {
                const item = navigation.find((nav) => nav.id === activePage);
                const Icon = item?.icon || Settings;
                return (
                  <>
                    <div className="w-16 h-16 mx-auto bg-teal-50 text-[#327D81] rounded-2xl flex items-center justify-center">
                      <Icon size={30} />
                    </div>
                    <h2 className="text-2xl font-black mt-5">{item?.label}</h2>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                      This management section will be connected after the
                      flight-management API and database are verified.
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <form
            onSubmit={saveFlight}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto"
          >
            <div className="p-5 sm:p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black">
                  {editingId ? "Edit flight" : "Add a flight"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the schedule and fare details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
                aria-label="Close form"
              >
                <X />
              </button>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Airline" icon={Plane}>
                <select
                  required
                  value={flightForm.airlineId}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      airlineId: e.target.value,
                    })
                  }
                  className="admin-input"
                >
                  <option value="">Select airline</option>
                  {airlines.map((airline) => (
                    <option key={airline.id} value={airline.id}>
                      {airline.airline_name || airline.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Flight number" icon={Ticket}>
                <input
                  required
                  value={flightForm.flightNumber}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      flightNumber: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. BHA251"
                  className="admin-input"
                />
              </Field>

              <Field label="Departure airport" icon={MapPin}>
                <select
                  required
                  value={flightForm.departureAirportId}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      departureAirportId: e.target.value,
                    })
                  }
                  className="admin-input"
                >
                  <option value="">Select departure airport</option>
                  {airports.map((airport) => (
                    <option key={airport.id} value={airport.id}>
                      {airport.iata_code || airport.iata} —{" "}
                      {airport.city || airport.airport_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Arrival airport" icon={MapPin}>
                <select
                  required
                  value={flightForm.arrivalAirportId}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      arrivalAirportId: e.target.value,
                    })
                  }
                  className="admin-input"
                >
                  <option value="">Select arrival airport</option>
                  {airports.map((airport) => (
                    <option key={airport.id} value={airport.id}>
                      {airport.iata_code || airport.iata} —{" "}
                      {airport.city || airport.airport_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Departure date and time" icon={CalendarDays}>
                <input
                  required
                  type="datetime-local"
                  value={flightForm.departureAt}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      departureAt: e.target.value,
                    })
                  }
                  className="admin-input"
                />
              </Field>

              <Field label="Arrival date and time" icon={Clock}>
                <input
                  required
                  type="datetime-local"
                  value={flightForm.arrivalAt}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      arrivalAt: e.target.value,
                    })
                  }
                  className="admin-input"
                />
              </Field>

              <Field label="Ticket price" icon={IndianRupee}>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={flightForm.price}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      price: e.target.value,
                    })
                  }
                  placeholder="e.g. 4500"
                  className="admin-input"
                />
              </Field>

              <Field label="Currency" icon={IndianRupee}>
                <select
                  value={flightForm.currency}
                  onChange={(e) =>
                    setFlightForm({
                      ...flightForm,
                      currency: e.target.value,
                    })
                  }
                  className="admin-input"
                >
                  <option value="NPR">NPR — Nepalese Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                </select>
              </Field>
            </div>

            <div className="p-5 sm:p-6 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border rounded-xl px-5 py-3 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="bg-[#13294B] text-white rounded-xl px-5 py-3 font-bold disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add flight"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .admin-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          padding: 0.75rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .admin-input:focus {
          border-color: #327d81;
          box-shadow: 0 0 0 2px rgb(50 125 129 / 15%);
        }
      `}</style>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-semibold mb-2">
        <Icon size={15} className="text-[#327D81]" />
        {label}
      </span>
      {children}
    </label>
  );
}

function FlightTable({ flights, onEdit, onDelete }) {
  if (!flights.length) {
    return (
      <div className="text-center py-14 px-5">
        <Plane size={30} className="mx-auto text-slate-300" />
        <p className="font-bold mt-3">No flight records to display</p>
        <p className="text-sm text-slate-500 mt-1">
          Flights will appear here when returned by the admin API.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="px-5 py-4">Flight</th>
            <th className="px-5 py-4">Route</th>
            <th className="px-5 py-4">Departure</th>
            <th className="px-5 py-4">Price</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {flights.map((flight) => (
            <tr key={flight.id} className="hover:bg-slate-50/80">
              <td className="px-5 py-4">
                <p className="font-bold">
                  {flight.flightNumber || flight.flight_number}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {flight.airline || "Airline"}
                </p>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <span className="font-bold">{flight.fromCode || "—"}</span>
                <span className="text-slate-400 mx-2">→</span>
                <span className="font-bold">{flight.toCode || "—"}</span>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                {flight.departureAt
                  ? new Date(flight.departureAt).toLocaleString()
                  : "—"}
              </td>
              <td className="px-5 py-4 whitespace-nowrap font-bold">
                {flight.currency || "NPR"}{" "}
                {Number(flight.price || 0).toLocaleString()}
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(flight)}
                    className="p-2 rounded-lg text-blue-700 hover:bg-blue-50"
                    title="Edit flight"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(flight.id)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                    title="Delete flight"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
