import { useEffect, useState } from "react";
import {
  Hotel,
  Wifi,
  Flame,
  Star,
  LoaderCircle,
  MapPin,
  Users,
  CalendarDays,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export default function StaysBooking({ formatPrice }) {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
  });

  async function loadHotels() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/hotels`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load hotels.");
      }

      setHotels(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHotels();
  }, []);

  function selectRoom(hotel, room) {
    setSelectedHotel(hotel);
    setSelectedRoom(room);
    setSuccess("");
    setError("");
  }

  async function reserveRoom(event) {
    event.preventDefault();

    if (!selectedHotel || !selectedRoom) {
      setError("Please select a room.");
      return;
    }

    try {
      setBooking(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/hotels/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          roomId: selectedRoom.id,
          ...form,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Reservation failed.");
      }

      setSuccess(
        `Reservation #${result.data.reservationId} created successfully.`,
      );

      setSelectedHotel(null);
      setSelectedRoom(null);

      setForm({
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        checkIn: "",
        checkOut: "",
        guests: 1,
      });

      await loadHotels();
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#13294B] text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
          <Hotel className="text-[#327D81]" />
          Hotels & Stays
        </h2>

        <p className="text-xs text-white/70">
          Hotels and room prices are managed directly from the Tripzo admin
          system.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center">
          <LoaderCircle className="animate-spin mx-auto text-[#327D81]" />
          <p className="text-sm text-slate-500 mt-3">Loading hotels...</p>
        </div>
      ) : hotels.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center">
          <Hotel className="mx-auto text-slate-300" size={40} />
          <p className="font-bold mt-3">No hotels available</p>
          <p className="text-sm text-slate-500 mt-1">
            Add hotels from the Tripzo admin dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-bold">
                    <Star size={12} fill="currentColor" />
                    {Number(hotel.rating || hotel.starRating || 0).toFixed(1)}
                  </div>

                  <h3 className="font-black text-lg mt-2">{hotel.name}</h3>

                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin size={13} />
                    {hotel.address || hotel.city}, {hotel.country}
                  </p>

                  {hotel.description && (
                    <p className="text-sm text-slate-600 mt-3 max-w-xl">
                      {hotel.description}
                    </p>
                  )}

                  <div className="flex gap-4 mt-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Wifi size={14} className="text-[#327D81]" />
                      {hotel.wifi}
                    </span>

                    <span className="flex items-center gap-1">
                      <Flame size={14} className="text-[#327D81]" />
                      {hotel.shower}
                    </span>
                  </div>
                </div>

                <div className="md:min-w-[250px]">
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    AVAILABLE ROOMS
                  </p>

                  <div className="space-y-2">
                    {(hotel.rooms || []).map((room) => (
                      <button
                        key={room.id}
                        onClick={() => selectRoom(hotel, room)}
                        className="w-full text-left border border-slate-200 hover:border-[#327D81] rounded-xl p-3 transition"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-sm">
                            {room.roomName}
                          </span>

                          <span className="font-black text-[#327D81]">
                            {formatPrice(room.price, room.currency)}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 flex gap-3">
                          <span>{room.roomType}</span>

                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {room.capacity}
                          </span>

                          <span>{room.availableRooms} available</span>
                        </div>
                      </button>
                    ))}

                    {!hotel.rooms?.length && (
                      <p className="text-xs text-slate-400">
                        No rooms currently available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRoom && selectedHotel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={reserveRoom}
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl"
          >
            <h3 className="text-xl font-black">
              Reserve {selectedRoom.roomName}
            </h3>

            <p className="text-sm text-slate-500 mt-1">{selectedHotel.name}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <input
                required
                placeholder="Full name"
                value={form.guestName}
                onChange={(e) =>
                  setForm({ ...form, guestName: e.target.value })
                }
                className="border rounded-xl px-4 py-3 text-sm"
              />

              <input
                required
                type="email"
                placeholder="Email"
                value={form.guestEmail}
                onChange={(e) =>
                  setForm({ ...form, guestEmail: e.target.value })
                }
                className="border rounded-xl px-4 py-3 text-sm"
              />

              <input
                required
                placeholder="Phone"
                value={form.guestPhone}
                onChange={(e) =>
                  setForm({ ...form, guestPhone: e.target.value })
                }
                className="border rounded-xl px-4 py-3 text-sm"
              />

              <input
                required
                type="number"
                min="1"
                max={selectedRoom.capacity}
                placeholder="Guests"
                value={form.guests}
                onChange={(e) =>
                  setForm({ ...form, guests: Number(e.target.value) })
                }
                className="border rounded-xl px-4 py-3 text-sm"
              />

              <label className="text-xs font-bold text-slate-500">
                <span className="block mb-1">
                  <CalendarDays size={13} className="inline mr-1" />
                  Check in
                </span>

                <input
                  required
                  type="date"
                  value={form.checkIn}
                  onChange={(e) =>
                    setForm({ ...form, checkIn: e.target.value })
                  }
                  className="border rounded-xl px-4 py-3 text-sm w-full"
                />
              </label>

              <label className="text-xs font-bold text-slate-500">
                <span className="block mb-1">
                  <CalendarDays size={13} className="inline mr-1" />
                  Check out
                </span>

                <input
                  required
                  type="date"
                  value={form.checkOut}
                  onChange={(e) =>
                    setForm({ ...form, checkOut: e.target.value })
                  }
                  className="border rounded-xl px-4 py-3 text-sm w-full"
                />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedHotel(null);
                  setSelectedRoom(null);
                }}
                className="flex-1 border rounded-xl py-3 font-bold text-sm"
              >
                Cancel
              </button>

              <button
                disabled={booking}
                className="flex-1 bg-[#327D81] text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
              >
                {booking ? "Reserving..." : "Reserve Room"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
