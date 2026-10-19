import React from "react";
import { Plane, Bus, Car, Hotel, Sparkles, User } from "lucide-react";

export default function Navbar({
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
}) {
  const navs = [
    { id: "flights", label: "Flights", icon: Plane },
    { id: "buses", label: "Buses & Jeeps", icon: Bus },
    { id: "taxi", label: "Airport Taxi", icon: Car },
    { id: "stays", label: "Hotels & Lodges", icon: Hotel },
    { id: "planner", label: "AI Trip Planner", icon: Sparkles, badge: "AI" },
  ];

  return (
    <nav className="bg-[#13294B] text-white sticky top-0 z-50 shadow-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* LOGO */}
        <div
          onClick={() => setActiveTab("flights")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-[#327D81] group-hover:bg-[#286467] transition-all p-2 rounded-xl text-white font-bold shadow-sm">
            <Plane className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <span className="text-xl font-black tracking-wider text-white block leading-none">
              TRIPZO
            </span>
            <span className="text-[10px] text-[#327D81] font-semibold tracking-widest uppercase block mt-0.5">
              Nepal All-in-One
            </span>
          </div>
        </div>

        {/* NAV LINKS */}
        <div className="hidden md:flex items-center gap-1">
          {navs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#327D81] text-white shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 rounded-full uppercase ml-0.5">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CURRENCY TOGGLE */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/10 p-1 rounded-xl text-xs font-semibold border border-white/10">
            <button
              onClick={() => setCurrency("NPR")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currency === "NPR"
                  ? "bg-[#327D81] text-white shadow-sm font-bold"
                  : "text-white/70 hover:text-white"
              }`}
            >
              🇳🇵 NPR
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currency === "USD"
                  ? "bg-[#327D81] text-white shadow-sm font-bold"
                  : "text-white/70 hover:text-white"
              }`}
            >
              🌐 USD
            </button>
          </div>

          <button className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl border border-white/10 transition-all">
            <User className="w-4 h-4 text-[#327D81]" />
            <span>Sign In</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
