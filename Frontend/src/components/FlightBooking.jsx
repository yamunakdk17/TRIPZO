import React, { useState } from "react";
import { FLIGHTS_DATA } from "../data/mockData";
import { Plane, Luggage, CheckCircle } from "lucide-react";

export default function FlightBooking({ currency, formatPrice }) {
  const [selectedFlight, setSelectedFlight] = useState(null);

  return (
    <div className="space-y-6">
      {/* SEARCH BOX */}
      <div className="bg-[#13294B] text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
          <Plane className="text-[#327D81]" /> Nepal Domestic Flight Search
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold uppercase text-[#327D81] tracking-wider">
              From
            </label>
            <select className="w-full bg-transparent font-bold text-sm text-white outline-none mt-1">
              <option className="text-slate-900">Kathmandu (KTM)</option>
              <option className="text-slate-900">Pokhara (PKR)</option>
            </select>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold uppercase text-[#327D81] tracking-wider">
              To
            </label>
            <select className="w-full bg-transparent font-bold text-sm text-white outline-none mt-1">
              <option className="text-slate-900">Pokhara (PKR)</option>
              <option className="text-slate-900">Lukla (LUA)</option>
              <option className="text-slate-900">Bhairahawa (BWA)</option>
            </select>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold uppercase text-[#327D81] tracking-wider">
              Departure Date
            </label>
            <input
              type="date"
              defaultValue="2026-10-31"
              className="w-full bg-transparent font-bold text-sm text-white outline-none mt-1"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full bg-[#327D81] hover:bg-[#286467] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all text-sm">
              Search Flights
            </button>
          </div>
        </div>
      </div>

      {/* DATE RIBBON */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {[
            "Wed, Oct 28",
            "Thu, Oct 29",
            "Fri, Oct 30",
            "Sat, Oct 31",
            "Sun, Nov 01",
            "Mon, Nov 02",
            "Tue, Nov 03",
          ].map((d, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-lg text-center border text-xs cursor-pointer transition-all ${
                i === 3
                  ? "bg-[#13294B] text-white border-[#13294B] shadow-md ring-2 ring-[#327D81]"
                  : "bg-[#F4F6EF] text-[#13294B] border-slate-200 hover:border-[#327D81]"
              }`}
            >
              <div className="font-semibold text-[11px] opacity-80">{d}</div>
              <div className="font-extrabold mt-1">
                {formatPrice(5800 + i * 120)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLIGHT LIST */}
      <div className="space-y-4">
        {FLIGHTS_DATA.map((flight) => (
          <div
            key={flight.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-lg border font-black text-xs bg-red-100 text-red-600 border-red-200">
                {flight.code}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#13294B]">
                  {flight.airline}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {flight.flightNo}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6">
              <div className="text-center">
                <p className="text-lg font-black text-[#13294B]">
                  {flight.depTime}
                </p>
                <p className="text-[11px] font-bold text-slate-500">KTM</p>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold">
                  {flight.duration}
                </span>
                <div className="w-24 h-[2px] bg-slate-300 my-1"></div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  Non-stop
                </span>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-[#13294B]">
                  {flight.arrTime}
                </p>
                <p className="text-[11px] font-bold text-slate-500">PKR</p>
              </div>
            </div>

            <div className="flex items-center justify-between md:flex-col md:items-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
              <p className="text-xl font-black text-[#327D81]">
                {formatPrice(flight.priceNpr)}
              </p>
              <button
                onClick={() => setSelectedFlight(flight)}
                className="mt-2 bg-[#327D81] hover:bg-[#286467] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm"
              >
                Book Ticket
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CONFIRM MODAL */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-center">
            <CheckCircle className="w-12 h-12 text-[#327D81] mx-auto" />
            <h3 className="text-lg font-black text-[#13294B]">
              Confirm Ticket Issue
            </h3>
            <p className="text-xs text-slate-600">
              {selectedFlight.airline} ({selectedFlight.flightNo}) • KTM to PKR
            </p>
            <div className="bg-[#F4F6EF] p-3 rounded-xl font-black text-[#327D81] text-xl">
              {formatPrice(selectedFlight.priceNpr)}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedFlight(null)}
                className="flex-1 py-2.5 rounded-xl border font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("E-Ticket Generated Successfully!");
                  setSelectedFlight(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#327D81] text-white font-bold text-xs"
              >
                Issue E-Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
