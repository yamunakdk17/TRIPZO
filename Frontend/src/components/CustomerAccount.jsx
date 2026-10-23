import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Hotel, Car, LogOut, RefreshCw } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const tokenKey = "tripzoCustomerToken";
const userKey = "tripzoCustomerUser";

export default function CustomerAccount() {
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) || "");
  const [user, setUser] = useState(() => { try { return JSON.parse(sessionStorage.getItem(userKey) || "null"); } catch { return null; } });
  const [bookings, setBookings] = useState([]);
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/customer/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load booking history.");
      setBookings(result.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { const timer = window.setTimeout(() => void loadBookings(), 0); return () => window.clearTimeout(timer); }, [loadBookings]);

  async function submit(event) {
    event.preventDefault(); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const payload = { email: form.get("email"), password: form.get("password") };
    if (mode === "register") payload.fullName = form.get("fullName");
    try {
      const response = await fetch(`${API_URL}/customer/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Account request failed.");
      sessionStorage.setItem(tokenKey, result.token);
      sessionStorage.setItem(userKey, JSON.stringify(result.user));
      setToken(result.token); setUser(result.user); setNotice("Signed in.");
    } catch (e) { setError(e.message); }
  }

  function signOut() {
    sessionStorage.removeItem(tokenKey); sessionStorage.removeItem(userKey);
    setToken(""); setUser(null); setBookings([]); setNotice(""); setError("");
  }

  async function cancel(booking) {
    const segment = booking.bookingType === "hotel" ? "hotels/reservations" : "taxis/bookings";
    setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/${segment}/${encodeURIComponent(booking.bookingReference)}/cancel`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "This booking cannot be cancelled.");
      setNotice("Booking cancelled."); await loadBookings();
    } catch (e) { setError(e.message); }
  }

  return <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Tripzo account</p><h1 className="mt-1 text-2xl font-black">My bookings</h1></div>{token&&<div className="flex items-center gap-2"><span className="text-sm text-slate-600">{user?.fullName}</span><button onClick={()=>void loadBookings()} aria-label="Refresh booking history" className="rounded-lg border p-2"><RefreshCw size={16}/></button><button onClick={signOut} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><LogOut size={15}/>Sign out</button></div>}</div>
    {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice&&<p role="status" className="mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{notice}</p>}
    {!token?<><p className="mt-3 text-sm text-slate-600">Sign in to see hotel and taxi bookings linked to your account.</p><form onSubmit={submit} className="mt-5 grid max-w-lg gap-3">{mode==="register"&&<label className="text-sm font-semibold">Full name<input name="fullName" required minLength="2" maxLength="180" className="mt-1 block w-full rounded-lg border p-3"/></label>}<label className="text-sm font-semibold">Email<input name="email" type="email" required className="mt-1 block w-full rounded-lg border p-3"/></label><label className="text-sm font-semibold">Password<input name="password" type="password" required minLength={mode==="register"?12:1} className="mt-1 block w-full rounded-lg border p-3"/></label><button className="rounded-xl bg-[#13294B] p-3 font-bold text-white">{mode==="register"?"Create account":"Sign in"}</button></form><button onClick={()=>setMode(mode==="register"?"login":"register")} className="mt-4 text-sm font-bold text-teal-700">{mode==="register"?"Already have an account? Sign in":"New to Tripzo? Create an account"}</button></>:loading?<p className="py-10 text-center text-slate-500">Loading your bookings…</p>:!bookings.length?<div className="py-12 text-center"><CalendarDays className="mx-auto text-slate-400"/><p className="mt-3 font-bold">No account bookings yet</p><p className="mt-1 text-sm text-slate-500">Bookings made while signed in will appear here.</p></div>:<div className="mt-6 space-y-3">{bookings.map((item)=><article key={item.bookingReference} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3">{item.bookingType==="hotel"?<Hotel className="mt-1 text-teal-700"/>:<Car className="mt-1 text-teal-700"/>}<div><h2 className="font-black">{item.title}</h2><p className="text-sm text-slate-600">{item.subtitle} · {item.startDate}{item.bookingType==="hotel"?` to ${item.endDate}`:` at ${item.endDate}`}</p><p className="mt-1 text-xs text-slate-500">Ref {item.bookingReference} · {item.travellers} travellers · {item.currency} {Number(item.amount).toLocaleString()} · {item.paymentStatus} · {item.status}</p></div></div>{["CONFIRMED","PENDING"].includes(item.status)&&<button onClick={()=>void cancel(item)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Cancel</button>}</div></article>)}</div>}
    {!token&&<GuestBookingLookup/>}
  </section>;
}

function GuestBookingLookup(){
  const [reference,setReference]=useState("");const [booking,setBooking]=useState(null);const [error,setError]=useState("");const [loading,setLoading]=useState(false);
  async function lookup(event){event.preventDefault();setError("");setBooking(null);const value=reference.trim().toUpperCase();const resource=value.startsWith("HTL-")?"hotels/reservations":value.startsWith("TAX-")?"taxis/bookings":null;if(!resource){setError("Enter the booking reference shown on your confirmation.");return;}setLoading(true);try{const response=await fetch(`${API_URL}/${resource}/${encodeURIComponent(value)}`);const result=await response.json();if(!response.ok)throw new Error(result.message||"Booking not found.");setBooking(result.data);}catch(e){setError(e.message);}finally{setLoading(false);}}
  return <form onSubmit={lookup} className="mt-8 border-t pt-5"><h2 className="font-bold">Look up a guest booking</h2><div className="mt-2 flex max-w-lg gap-2"><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="HTL-… or TAX-…" className="min-w-0 flex-1 rounded-lg border p-3"/><button disabled={loading} className="rounded-lg bg-teal-700 px-4 font-bold text-white">{loading?"Looking…":"Find"}</button></div>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}{booking&&<div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-bold">{booking.hotelName||booking.pickupLocation} {booking.destination?`→ ${booking.destination}`:""}</p><p className="mt-1">Ref {booking.bookingReference} · {booking.status} · {booking.currency} {Number(booking.totalAmount??booking.fare).toLocaleString()}</p></div>}</form>;
}
