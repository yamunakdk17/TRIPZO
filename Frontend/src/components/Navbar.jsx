import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Bus, Car, Hotel, Sparkles, User, House, Menu, X } from "lucide-react";

const TAB_PATHS = {
  home: "/",
  flights: "/flights",
  buses: "/buses",
  taxi: "/taxi",
  stays: "/stays",
  planner: "/planner",
  account: "/account",
};

export default function Navbar({ activeTab, setActiveTab, currency, setCurrency }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const navs = [
    { id: "home", label: "Home", icon: House },
    { id: "flights", label: "Flights", icon: Plane },
    { id: "buses", label: "Buses & Jeeps", icon: Bus },
    { id: "taxi", label: "Airport Taxi", icon: Car },
    { id: "stays", label: "Hotels & Lodges", icon: Hotel },
    { id: "planner", label: "AI Trip Planner", icon: Sparkles, badge: "AI" },
  ];
  const goToTab = (tab) => {
    setActiveTab(tab);
    navigate(TAB_PATHS[tab] || "/");
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav onKeyDown={(event) => { if (event.key === "Escape") setMobileOpen(false); }} className="sticky top-0 z-50 border-b border-white/10 bg-[#13294B] text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="tripzo-mobile-menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/25 text-white transition hover:bg-white/10 focus-visible:outline-white md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <button type="button" onClick={() => goToTab("home")} aria-label="Tripzo home" className="group flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3 md:flex-none">
          <span className="rounded-xl bg-[#327D81] p-2 font-bold text-white shadow-sm transition group-hover:bg-[#286467]">
            <Plane className="h-5 w-5 -rotate-45" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-black leading-none tracking-wider text-white sm:text-xl">TRIPZO</span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-widest text-[#73C1B8] min-[360px]:block">Nepal All-in-One</span>
          </span>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {navs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} type="button" onClick={() => goToTab(item.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${isActive ? "bg-[#327D81] text-white shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && <span className="ml-0.5 rounded-full bg-amber-400 px-1.5 text-[9px] font-black uppercase text-slate-900">{item.badge}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div aria-label="Currency" className="flex items-center rounded-xl border border-white/10 bg-white/10 p-1 text-[11px] font-semibold sm:text-xs">
            <button type="button" aria-pressed={currency === "NPR"} onClick={() => setCurrency("NPR")} className={`rounded-lg px-2 py-1 transition-all sm:px-2.5 ${currency === "NPR" ? "bg-[#327D81] font-bold text-white shadow-sm" : "text-white/70 hover:text-white"}`}>NPR</button>
            <button type="button" aria-pressed={currency === "USD"} onClick={() => setCurrency("USD")} className={`rounded-lg px-2 py-1 transition-all sm:px-2.5 ${currency === "USD" ? "bg-[#327D81] font-bold text-white shadow-sm" : "text-white/70 hover:text-white"}`}>USD</button>
          </div>
          <button type="button" onClick={() => goToTab("account")} className={`hidden items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-white/20 sm:flex ${activeTab === "account" ? "bg-[#327D81]" : "bg-white/10"}`}>
            <User className="h-4 w-4 text-[#73C1B8]" />
            <span>My bookings</span>
          </button>
        </div>
      </div>

      <div id="tripzo-mobile-menu" aria-hidden={!mobileOpen} className={`absolute left-0 top-full z-50 w-[min(21rem,calc(100vw-1.5rem))] origin-top-left rounded-b-xl border border-slate-200 bg-white text-[#13294B] shadow-xl transition duration-150 md:hidden ${mobileOpen ? "visible translate-y-0 opacity-100" : "invisible pointer-events-none -translate-y-2 opacity-0"}`}>
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-extrabold">Main menu</div>
        <div className="py-1">
          {navs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} type="button" onClick={() => goToTab(item.id)} tabIndex={mobileOpen ? 0 : -1} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-[#F2F7F6] ${isActive ? "font-extrabold text-[#327D81]" : "font-medium text-[#2454A6]"}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">{item.badge}</span>}
              </button>
            );
          })}
          <div className="my-1 border-t border-slate-100" />
          <button type="button" onClick={() => goToTab("account")} tabIndex={mobileOpen ? 0 : -1} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-[#F2F7F6] ${activeTab === "account" ? "font-extrabold text-[#327D81]" : "font-medium text-[#2454A6]"}`}>
            <User className="h-4 w-4 shrink-0" />
            <span>My bookings</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
