import { Sparkles, ShieldAlert } from "lucide-react";

export default function AiPlanner({ formatPrice }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#13294B] text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
          <Sparkles className="text-[#327D81]" /> AI Trip & Budget Analyzer
        </h2>
        <p className="text-xs text-white/70">
          Complete package calculator including permits (TIMS, ACAP), guides,
          and teahouse stays.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-[#13294B]">
          Annapurna Base Camp (ABC) - 10 Days Package
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-[#F4F6EF] p-4 rounded-xl border border-slate-200">
          <div>
            <span class="text-slate-500 block">Flight / Transport</span>
            <strong>Included</strong>
          </div>
          <div>
            <span class="text-slate-500 block">Permits (TIMS/ACAP)</span>
            <strong>Included</strong>
          </div>
          <div>
            <span class="text-slate-500 block">Altitude Risk</span>
            <strong className="text-amber-600 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Moderate (4,130m)
            </strong>
          </div>
          <div>
            <span class="text-slate-500 block">Total Estimated Cost</span>
            <strong className="text-[#327D81] text-sm font-black">
              {formatPrice(45000)}
            </strong>
          </div>
        </div>
        <button
          onClick={() => alert("Full Trek Package Booked!")}
          className="bg-[#327D81] text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md"
        >
          Book Complete Package
        </button>
      </div>
    </div>
  );
}
