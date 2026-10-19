import React from "react";
import { STAYS_DATA } from "../data/mockData";
import { Hotel, Wifi, Flame, Star } from "lucide-react";

export default function StaysBooking({ formatPrice }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#13294B] text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
          <Hotel className="text-[#327D81]" /> Verified Hotels & Mountain
          Teahouses
        </h2>
        <p className="text-xs text-white/70">
          Analyzed by cleanliness, hot showers, Wi-Fi speed, and local
          hospitality.
        </p>
      </div>

      <div className="space-y-4">
        {STAYS_DATA.map((stay) => (
          <div
            key={stay.id}
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> ★ {stay.rating} / 5.0
                (Cleanliness: {stay.cleanliness})
              </span>
              <h3 className="font-bold text-base mt-2 text-[#13294B]">
                {stay.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {stay.location} • {stay.type}
              </p>
              <div className="flex gap-4 mt-2 text-[11px] text-slate-600 font-medium">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-[#327D81]" /> {stay.wifi}
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#327D81]" /> {stay.shower}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-[#327D81]">
                {formatPrice(stay.priceNpr)} / night
              </p>
              <button
                onClick={() => alert("Room reserved!")}
                className="mt-2 bg-[#327D81] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm"
              >
                Reserve Stay
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
