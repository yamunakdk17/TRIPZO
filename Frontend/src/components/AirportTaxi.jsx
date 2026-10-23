import { Car, Navigation, ShieldCheck } from "lucide-react";

export default function AirportTaxi({ formatPrice }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#13294B] text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
          <Car className="text-[#327D81]" /> Pathao-Style Airport Taxi Ride
        </h2>
        <p className="text-xs text-white/70">
          Instant pickup from Tribhuvan International Airport (TIA) to Thamel,
          Boudha, or Patan.
        </p>
      </div>

      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#13294B] flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-[#327D81]" /> Select Destination
          </h3>
          <div className="space-y-2 text-xs font-semibold">
            <button className="w-full p-3 rounded-xl border border-[#327D81] bg-[#327D81]/10 text-[#13294B] text-left flex justify-between">
              <span>TIA Airport ➔ Thamel</span>
              <span className="font-bold">{formatPrice(850)}</span>
            </button>
            <button className="w-full p-3 rounded-xl border border-slate-200 hover:border-[#327D81] text-left flex justify-between">
              <span>TIA Airport ➔ Boudhanath</span>
              <span className="font-bold">{formatPrice(650)}</span>
            </button>
          </div>
          <button
            onClick={() => alert("Taxi booked! Driver is on the way.")}
            className="w-full bg-[#327D81] text-white font-bold text-xs py-3 rounded-xl shadow-md"
          >
            Request Pickup Now
          </button>
        </div>

        <div className="md:col-span-2 bg-[#F4F6EF] rounded-xl p-4 border border-slate-200 flex flex-col items-center justify-center min-h-[160px] text-center">
          <ShieldCheck className="w-8 h-8 text-[#327D81] mb-2" />
          <p className="text-xs font-bold text-[#13294B]">
            Live Route Map Simulation Active
          </p>
          <p className="text-[11px] text-slate-500">
            Verified Pathao drivers with fixed official fares & no surge
            pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
