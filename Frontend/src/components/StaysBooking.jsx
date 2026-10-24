import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Hotel,
  Wifi,
  Flame,
  Star,
  LoaderCircle,
  MapPin,
  Users,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Check,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote,
  ShieldCheck,
  Navigation,
  BedDouble,
  Clock3,
  Phone,
  Mail,
  X,
  ExternalLink,
  Car,
  Utensils,
  Wind,
  Waves,
  Dumbbell,
  ParkingCircle,
  Coffee,
  Sparkles,
  Info,
  Map,
  CircleCheck,
  Building2,
  ReceiptText,
  DoorOpen,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const DEFAULT_IMAGE = null;

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0;
  }

  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function getHotelImage(hotel) {
  return (
    hotel?.imageUrl ||
    hotel?.image_url ||
    hotel?.image ||
    hotel?.photo ||
    hotel?.photoUrl ||
    hotel?.images?.find((item) => item.isPrimary)?.imageUrl ||
    hotel?.images?.[0]?.imageUrl ||
    DEFAULT_IMAGE
  );
}

function getRoomImage(hotel, room) {
  return (
    room?.imageUrl ||
    room?.image_url ||
    room?.image ||
    hotel?.imageUrl ||
    hotel?.image_url ||
    hotel?.images?.find((item) => item.isPrimary)?.imageUrl ||
    hotel?.images?.[0]?.imageUrl ||
    DEFAULT_IMAGE
  );
}

function getHotelRating(hotel) {
  return safeNumber(
    hotel?.rating ?? hotel?.starRating ?? hotel?.star_rating,
    0,
  );
}

function getHotelStars(hotel) {
  return Math.round(
    safeNumber(hotel?.starRating ?? hotel?.star_rating ?? hotel?.rating, 0),
  );
}

function getRoomPrice(room) {
  return safeNumber(
    room?.price ?? room?.pricePerNight ?? room?.price_per_night ?? room?.amount,
    0,
  );
}

function getRoomCurrency(room, hotel) {
  return room?.currency || hotel?.currency || "NPR";
}

function paymentLabel(method) {
  switch (method) {
    case "cash":
      return "Pay at hotel";
    case "card":
      return "Credit / Debit Card";
    case "wallet":
      return "Digital Wallet";
    case "mobile":
      return "Mobile Banking";
    default:
      return method;
  }
}

function paymentIcon(method) {
  switch (method) {
    case "cash":
      return <Banknote size={18} />;
    case "card":
      return <CreditCard size={18} />;
    case "wallet":
      return <Wallet size={18} />;
    case "mobile":
      return <Smartphone size={18} />;
    default:
      return <CreditCard size={18} />;
  }
}

function buildMapsUrl(hotel) {
  const query = [hotel?.name, hotel?.address, hotel?.city, hotel?.country]
    .filter(Boolean)
    .join(", ");

  if (!query) return "https://www.google.com/maps";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

function getReachInfo(hotel) {
  if (hotel?.howToReach) {
    return hotel.howToReach;
  }

  if (hotel?.how_to_reach) {
    return hotel.how_to_reach;
  }

  const city = hotel?.city || "the destination";

  return `The property is located in ${city}. Open the map for the exact hotel location and directions.`;
}

function getDistance(hotel) {
  return (
    hotel?.distance ||
    hotel?.distanceFromCenter ||
    hotel?.distance_from_center ||
    "Location available on map"
  );
}

function normalizeAmenities(hotel) {
  const amenities = [];

  if (hotel?.wifi) {
    amenities.push({
      key: "wifi",
      label: hotel.wifi,
      icon: Wifi,
    });
  }

  if (hotel?.shower) {
    amenities.push({
      key: "shower",
      label: hotel.shower,
      icon: Flame,
    });
  }

  if (hotel?.parking) {
    amenities.push({
      key: "parking",
      label: hotel.parking,
      icon: ParkingCircle,
    });
  }

  if (hotel?.restaurant) {
    amenities.push({
      key: "restaurant",
      label: hotel.restaurant,
      icon: Utensils,
    });
  }

  if (hotel?.airConditioning || hotel?.air_conditioning) {
    amenities.push({
      key: "air",
      label: "Air conditioning",
      icon: Wind,
    });
  }

  if (hotel?.pool) {
    amenities.push({
      key: "pool",
      label: "Swimming pool",
      icon: Waves,
    });
  }

  if (hotel?.gym) {
    amenities.push({
      key: "gym",
      label: "Fitness centre",
      icon: Dumbbell,
    });
  }

  if (hotel?.breakfast) {
    amenities.push({
      key: "breakfast",
      label: hotel.breakfast === true ? "Breakfast available" : hotel.breakfast,
      icon: Coffee,
    });
  }

  if (Array.isArray(hotel?.amenities)) {
    hotel.amenities.forEach((item, index) => {
      const label =
        typeof item === "string"
          ? item
          : item?.name || item?.label || item?.title;

      if (!label) return;

      amenities.push({
        key: `custom-${index}-${label}`,
        label,
        icon: Sparkles,
      });
    });
  }

  if (!amenities.length) {
    return [];
  }

  return amenities;
}

function getRoomFacilities(room) {
  const facilities = [];

  if (room?.wifi) {
    facilities.push(room.wifi);
  }

  if (room?.breakfast) {
    facilities.push(
      room.breakfast === true ? "Breakfast included" : room.breakfast,
    );
  }

  if (room?.airConditioning || room?.air_conditioning) {
    facilities.push("Air conditioning");
  }

  if (room?.bathroom) {
    facilities.push(room.bathroom);
  }

  if (room?.bedType || room?.bed_type) {
    facilities.push(room.bedType || room.bed_type);
  }

  if (Array.isArray(room?.facilities)) {
    room.facilities.forEach((item) => {
      const label = typeof item === "string" ? item : item?.name || item?.label;

      if (label) facilities.push(label);
    });
  }

  return [...new Set(facilities)];
}

function StepIndicator({ currentStep }) {
  const steps = [
    { id: 1, label: "Hotel & Room" },
    { id: 2, label: "Your Details" },
    { id: 3, label: "Payment" },
    { id: 4, label: "Confirmation" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {steps.map((step, index) => {
          const active = currentStep === step.id;
          const completed = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center min-w-max flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center font-black text-sm",
                    completed
                      ? "bg-[#327D81] text-white"
                      : active
                        ? "bg-[#13294B] text-white"
                        : "bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {completed ? <Check size={17} /> : step.id}
                </div>

                <span
                  className={[
                    "text-xs font-bold hidden sm:block",
                    active || completed ? "text-[#13294B]" : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={[
                    "h-px flex-1 mx-3",
                    currentStep > step.id ? "bg-[#327D81]" : "bg-slate-200",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stars({ value = 0 }) {
  const stars = Math.min(Math.max(Math.round(value), 0), 5);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          fill={star <= stars ? "currentColor" : "none"}
          className={star <= stars ? "text-amber-400" : "text-slate-300"}
        />
      ))}
    </div>
  );
}

function RatingBadge({ hotel }) {
  const rating = getHotelRating(hotel);

  return (
    <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-lg">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
        <Star size={16} className="text-amber-500" fill="currentColor" />
      </div>

      <div>
        <p className="font-black text-[#13294B] text-sm">
          {rating > 0 ? rating.toFixed(1) : "New"}
        </p>

        <p className="text-[10px] text-slate-500">Traveller rating</p>
      </div>
    </div>
  );
}

function HotelHero({ hotel }) {
  const gallery = Array.isArray(hotel?.images) ? [...hotel.images].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary))) : [];
  const [selectedImage, setSelectedImage] = useState({ hotelId: null, index: 0 });
  const imageIndex = selectedImage.hotelId === hotel?.id ? selectedImage.index : 0;
  const image = gallery[imageIndex]?.imageUrl || getHotelImage(hotel);
  const mapsUrl = buildMapsUrl(hotel);
  const stars = getHotelStars(hotel);

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="relative h-[280px] md:h-[360px]">
        {image ? <img src={image} alt={gallery[imageIndex]?.altText || hotel?.name || "Hotel"} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="flex h-full flex-col items-center justify-center bg-slate-100 text-slate-500"><Hotel size={42}/><span className="mt-2 text-sm">Hotel photo not provided</span></div>}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        <div className="absolute left-5 bottom-5">
          <RatingBadge hotel={hotel} />
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute right-5 bottom-5 inline-flex items-center gap-2 bg-white text-[#13294B] px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-slate-50"
        >
          <Navigation size={15} />
          Open Map
          <ExternalLink size={13} />
        </a>
      </div>

      {gallery.length > 1 && <div className="flex gap-2 overflow-x-auto border-b p-3">{gallery.map((item,index)=><button key={item.id || item.imageUrl} type="button" onClick={()=>setSelectedImage({hotelId:hotel.id,index})} aria-label={`Show hotel photo ${index+1}`} aria-pressed={imageIndex===index} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${imageIndex===index?"border-teal-700":"border-transparent"}`}><img src={item.imageUrl} alt={item.altText || `${hotel?.name} photo ${index+1}`} className="h-full w-full object-cover" onError={event=>{event.currentTarget.style.display="none";}}/></button>)}</div>}

      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-[#13294B] text-white text-[10px] font-black uppercase tracking-wide">
                Hotel
              </span>

              {stars > 0 && (
                <div className="flex items-center gap-1">
                  <Stars value={stars} />
                  <span className="text-xs text-slate-500">{stars}-star</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-[#13294B] mt-3">
              {hotel?.name}
            </h2>

            <div className="flex items-start gap-2 text-sm text-slate-500 mt-2">
              <MapPin size={17} className="text-[#327D81] mt-0.5 shrink-0" />

              <span>
                {hotel?.address || hotel?.city}, {hotel?.country || "Nepal"}
              </span>
            </div>
          </div>

          <div className="md:text-right">
            <p className="text-[10px] uppercase tracking-wide font-black text-slate-400">
              Location
            </p>

            <p className="font-bold text-[#13294B] mt-1">
              {getDistance(hotel)}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Easy access for travellers
            </p>
          </div>
        </div>

        {hotel?.description && (
          <p className="text-sm leading-6 text-slate-600 mt-5">
            {hotel.description}
          </p>
        )}
      </div>
    </div>
  );
}

function AmenitiesCard({ hotel }) {
  const amenities = normalizeAmenities(hotel);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#E7F3F3] flex items-center justify-center">
          <Sparkles size={17} className="text-[#327D81]" />
        </div>

        <div>
          <h3 className="font-black text-[#13294B]">Hotel facilities</h3>

          <p className="text-xs text-slate-500">
            Facilities available for travellers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {amenities.map((amenity) => {
          const Icon = amenity.icon || Sparkles;

          return (
            <div
              key={amenity.key}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <Icon size={18} className="text-[#327D81]" />

              <p className="text-xs font-bold text-slate-700 mt-2">
                {amenity.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReachCard({ hotel }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E7F3F3] flex items-center justify-center shrink-0">
            <Map size={18} className="text-[#327D81]" />
          </div>

          <div>
            <h3 className="font-black text-[#13294B]">
              Location & how to reach
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Helpful information before you travel
            </p>
          </div>
        </div>

        <a
          href={buildMapsUrl(hotel)}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-2 text-xs font-black text-[#327D81]"
        >
          Directions
          <ExternalLink size={13} />
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-5">
        <ReachItem
          icon={MapPin}
          title="Address"
          value={`${hotel?.address || hotel?.city || "See map"}, ${
            hotel?.country || "Nepal"
          }`}
        />

        <ReachItem
          icon={Navigation}
          title="Distance"
          value={getDistance(hotel)}
        />

        <ReachItem
          icon={Car}
          title="How to reach"
          value={getReachInfo(hotel)}
        />
      </div>

      <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200">
        <div className="relative h-44 bg-gradient-to-br from-[#E7F3F3] via-white to-slate-100">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute left-[12%] top-[30%] w-40 h-px bg-[#327D81] rotate-12" />
            <div className="absolute left-[35%] top-[55%] w-56 h-px bg-[#13294B] -rotate-12" />
            <div className="absolute left-[60%] top-[35%] w-32 h-px bg-[#327D81] rotate-45" />
          </div>

          <div className="absolute left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-[#327D81]/20 rounded-full animate-ping" />

              <div className="relative w-12 h-12 rounded-full bg-[#327D81] text-white flex items-center justify-center shadow-xl border-4 border-white">
                <MapPin size={20} />
              </div>
            </div>
          </div>

          <div className="absolute left-4 bottom-4 bg-white/95 rounded-xl px-3 py-2 shadow-md">
            <p className="text-[10px] font-black uppercase text-slate-400">
              Hotel location
            </p>

            <p className="text-xs font-bold text-[#13294B]">{hotel?.name}</p>
          </div>

          <a
            href={buildMapsUrl(hotel)}
            target="_blank"
            rel="noreferrer"
            className="absolute right-4 bottom-4 bg-[#13294B] text-white rounded-xl px-3 py-2 text-xs font-bold inline-flex items-center gap-2"
          >
            <Navigation size={13} />
            View on Maps
          </a>
        </div>
      </div>
    </div>
  );
}

function ReachItem({ icon: Icon, title, value }) {
  return (
    <div className="border border-slate-100 rounded-xl bg-slate-50 p-3">
      <Icon size={16} className="text-[#327D81]" />

      <p className="text-[10px] uppercase tracking-wide font-black text-slate-400 mt-2">
        {title}
      </p>

      <p className="text-xs font-bold text-slate-700 mt-1 leading-5">{value}</p>
    </div>
  );
}

function RoomCard({ hotel, room, selected, onSelect, formatPrice }) {
  const price = getRoomPrice(room);
  const currency = getRoomCurrency(room, hotel);
  const availableRooms = safeNumber(
    room?.availableRooms ?? room?.available_rooms,
    0,
  );
  const capacity = safeNumber(room?.capacity, 2);
  const facilities = getRoomFacilities(room);

  return (
    <button
      type="button"
      onClick={() => onSelect(room)}
      className={[
        "w-full text-left rounded-2xl border overflow-hidden transition-all",
        selected
          ? "border-[#327D81] ring-2 ring-[#327D81]/15 shadow-lg"
          : "border-slate-200 hover:border-[#327D81]/60 hover:shadow-md",
      ].join(" ")}
    >
      <div className="grid md:grid-cols-[220px_1fr]">
        <div className="relative h-44 md:h-full min-h-[190px]">
          <img
            src={getRoomImage(hotel, room)}
            alt={room?.roomName || room?.room_name || "Room"}
            className="w-full h-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          {selected && (
            <div className="absolute top-3 left-3 bg-[#327D81] text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
              <Check size={16} />
            </div>
          )}
        </div>

        <div className="p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wide bg-[#E7F3F3] text-[#327D81] px-2 py-1 rounded-md">
                  {room?.roomType || room?.room_type || "Standard"}
                </span>

                {availableRooms > 0 && (
                  <span className="text-[10px] font-bold text-green-600">
                    {availableRooms} available
                  </span>
                )}
              </div>

              <h4 className="text-lg font-black text-[#13294B] mt-2">
                {room?.roomName || room?.room_name || "Room"}
              </h4>

              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users size={13} />
                  Up to {capacity} guests
                </span>

                <span className="flex items-center gap-1">
                  <BedDouble size={13} />
                  {room?.bedType || room?.bed_type || "Comfortable bed"}
                </span>
              </div>
            </div>

            <div className="md:text-right">
              <p className="text-xl font-black text-[#327D81]">
                {formatPrice
                  ? formatPrice(price, currency)
                  : `${currency} ${price.toLocaleString()}`}
              </p>

              <p className="text-[10px] text-slate-400 font-bold">per night</p>
            </div>
          </div>

          {room?.description && (
            <p className="text-xs text-slate-500 leading-5 mt-3">
              {room.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {facilities.slice(0, 5).map((facility) => (
              <span
                key={facility}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1"
              >
                <Check size={11} className="text-[#327D81]" />
                {facility}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {selected ? "Selected room" : "Select this room"}
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-black text-[#327D81]">
              Continue
              <ChevronRight size={15} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function BookingSummary({ hotel, room, form, paymentMethod, formatPrice }) {
  const nights = calculateNights(form.checkIn, form.checkOut);
  const price = getRoomPrice(room);
  const currency = getRoomCurrency(room, hotel);
  const roomTotal = price * nights * Number(form.rooms || 1);
  const total = roomTotal;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex gap-3">
          <img
            src={getHotelImage(hotel)}
            alt={hotel?.name}
            className="w-20 h-20 rounded-xl object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <div className="min-w-0">
            <h3 className="font-black text-[#13294B] truncate">
              {hotel?.name}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              {room?.roomName ||
                room?.room_name ||
                room?.roomType ||
                "Selected room"}
            </p>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MapPin size={11} />
              {hotel?.city}, {hotel?.country || "Nepal"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <SummaryLine label="Check-in" value={formatDate(form.checkIn)} />

        <SummaryLine label="Check-out" value={formatDate(form.checkOut)} />

        <SummaryLine
          label="Guests"
          value={`${form.guests} guest${Number(form.guests) === 1 ? "" : "s"}`}
        />
        <SummaryLine label="Rooms" value={String(form.rooms || 1)} />

        <SummaryLine
          label="Nights"
          value={`${nights} night${nights === 1 ? "" : "s"}`}
        />

        <div className="h-px bg-slate-100 my-4" />

        <SummaryLine
          label={`${form.rooms || 1} room${Number(form.rooms) === 1 ? "" : "s"} × ${nights} nights`}
          value={
            formatPrice
              ? formatPrice(roomTotal, currency)
              : `${currency} ${roomTotal.toLocaleString()}`
          }
        />

        <div className="pt-3 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <span className="font-black text-[#13294B]">Total</span>

            <span className="text-xl font-black text-[#327D81]">
              {formatPrice
                ? formatPrice(total, currency)
                : `${currency} ${total.toLocaleString()}`}
            </span>
          </div>
        </div>

        {paymentMethod && (
          <div className="mt-4 bg-slate-50 rounded-xl p-3 flex items-center gap-2">
            <CreditCard size={15} className="text-[#327D81]" />

            <div>
              <p className="text-[10px] uppercase font-black text-slate-400">
                Payment
              </p>

              <p className="text-xs font-bold text-slate-700">
                {paymentLabel(paymentMethod)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-700 text-right">{value}</span>
    </div>
  );
}

function PaymentMethod({ method, selected, onSelect, title, description, disabled = false }) {
  const icon = paymentIcon(method);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(method)}
      className={[
        "w-full text-left border rounded-2xl p-4 transition-all disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-[#327D81] bg-[#E7F3F3] ring-2 ring-[#327D81]/10"
          : "border-slate-200 bg-white hover:border-[#327D81]/50",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            "w-10 h-10 rounded-xl flex items-center justify-center",
            selected
              ? "bg-[#327D81] text-white"
              : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {icon}
        </div>

        <div className="flex-1">
          <p className="font-black text-sm text-[#13294B]">{title}</p>

          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>

        <div
          className={[
            "w-5 h-5 rounded-full border flex items-center justify-center",
            selected ? "border-[#327D81]" : "border-slate-300",
          ].join(" ")}
        >
          {selected && (
            <div className="w-2.5 h-2.5 bg-[#327D81] rounded-full" />
          )}
        </div>
      </div>
    </button>
  );
}

function ConfirmationScreen({
  hotel,
  room,
  bookingData,
  form,
  paymentMethod,
  formatPrice,
  onClose,
}) {
  const reservationId =
    bookingData?.bookingReference ||
    bookingData?.reservationId ||
    bookingData?.id ||
    bookingData?.reservation?.id ||
    "PENDING";

  const status = bookingData?.status || "PENDING";

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm overflow-y-auto p-4">
      <div className="min-h-full flex items-center justify-center">
        <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden">
          <div className="bg-[#13294B] text-white p-7 md:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="w-14 h-14 bg-[#327D81] rounded-2xl flex items-center justify-center mb-4">
                  <CircleCheck size={30} />
                </div>

                <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-black">
                  Tripzo Hotel Booking
                </p>

                <h2 className="text-2xl md:text-3xl font-black mt-2">
                  {bookingData?.status === "CONFIRMED" ? "Booking confirmed" : "Booking request received"}
                </h2>

                <p className="text-sm text-white/70 mt-2">
                  Your hotel reservation has been submitted successfully.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-5 md:p-7">
            <div className="grid md:grid-cols-[1fr_280px] gap-6">
              <div>
                <div className="border border-slate-200 rounded-2xl p-5">
                  <div className="flex gap-4">
                    <img
                      src={getHotelImage(hotel)}
                      alt={hotel?.name}
                      className="w-24 h-24 rounded-xl object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />

                    <div>
                      <h3 className="font-black text-[#13294B] text-lg">
                        {hotel?.name}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        {room?.roomName ||
                          room?.room_name ||
                          room?.roomType ||
                          "Selected room"}
                      </p>

                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <MapPin size={12} />
                        {hotel?.city}, {hotel?.country || "Nepal"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <ConfirmationInfo
                    label="Reservation"
                    value={`#${reservationId}`}
                    icon={ReceiptText}
                  />

                  <ConfirmationInfo
                    label="Status"
                    value={status}
                    icon={CircleCheck}
                  />

                  <ConfirmationInfo
                    label="Check-in"
                    value={formatDate(form.checkIn)}
                    icon={CalendarDays}
                  />

                  <ConfirmationInfo
                    label="Check-out"
                    value={formatDate(form.checkOut)}
                    icon={CalendarDays}
                  />
                </div>

                <div className="mt-5 border border-slate-200 rounded-2xl p-5">
                  <h4 className="font-black text-[#13294B]">Booking status</h4>

                  <div className="mt-5 space-y-4">
                    <StatusStep
                      active
                      done
                      title="Booking requested"
                      text="Your room reservation is recorded. Payment is due at the property."
                    />

                    <StatusStep
                      active={status === "CONFIRMED"}
                      done={status === "CONFIRMED"}
                      title="Hotel confirmation"
                      text="The property confirms the room availability."
                    />

                    <StatusStep
                      active={status === "COMPLETED"}
                      done={status === "COMPLETED"}
                      title="Stay completed"
                      text="Enjoy your stay with Tripzo."
                    />
                  </div>
                </div>
              </div>

              <div>
                <BookingSummary
                  hotel={hotel}
                  room={room}
                  form={form}
                  paymentMethod={paymentMethod}
                  formatPrice={formatPrice}
                />

                <div className="mt-4 bg-[#E7F3F3] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="text-[#327D81] mt-0.5" />

                    <div>
                      <p className="font-black text-[#13294B] text-sm">
                        Keep your reservation reference
                      </p>

                      <p className="text-xs text-slate-600 mt-1 leading-5">
                        Use reservation #{reservationId} when contacting Tripzo
                        or the hotel about this stay.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full mt-4 bg-[#13294B] text-white rounded-xl py-3.5 font-black text-sm hover:bg-[#0f203a]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmationInfo({ label, value, icon: Icon }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3">
      <Icon size={15} className="text-[#327D81]" />

      <p className="text-[10px] uppercase font-black text-slate-400 mt-2">
        {label}
      </p>

      <p className="text-xs font-black text-[#13294B] mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function StatusStep({ active, done, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={[
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            done
              ? "bg-[#327D81] text-white"
              : active
                ? "bg-[#13294B] text-white"
                : "bg-slate-100 text-slate-400",
          ].join(" ")}
        >
          {done ? <Check size={14} /> : <Clock3 size={14} />}
        </div>

        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      <div className="pb-4">
        <p className="font-black text-sm text-[#13294B]">{title}</p>

        <p className="text-xs text-slate-500 mt-1">{text}</p>
      </div>
    </div>
  );
}

function InputField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  min,
  max,
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-black text-slate-600 mb-2">
        {Icon && <Icon size={13} className="text-[#327D81]" />}
        {label}
      </span>

      <input
        required={required}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#327D81] focus:ring-2 focus:ring-[#327D81]/10 bg-white"
      />
    </label>
  );
}

export default function StaysBooking({ formatPrice }) {
  const [hotels, setHotels] = useState([]);

  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [confirmation, setConfirmation] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
    rooms: 1,
  });

  const loadHotels = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let homeSearch = null;
      try { homeSearch = JSON.parse(sessionStorage.getItem("tripzoHomeSearch") || "null"); } catch { homeSearch = null; }
      const params = new URLSearchParams();
      if (homeSearch?.service === "hotels") {
        if (homeSearch.city?.trim()) params.set("city", homeSearch.city.trim());
        if (homeSearch.guests) params.set("guests", homeSearch.guests);
      }
      const response = await fetch(`${API_URL}/hotels${params.size ? `?${params.toString()}` : ""}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load hotels.");
      }

      const data = result.data || [];
      setHotels(data);
      if (homeSearch?.service === "hotels") {
        setForm((current) => ({ ...current, checkIn: homeSearch.checkIn || current.checkIn, checkOut: homeSearch.checkOut || current.checkOut, guests: Number(homeSearch.guests) || current.guests, rooms: Number(homeSearch.rooms) || current.rooms }));
        const selected = data.find((hotel) => String(hotel.id) === String(homeSearch.hotelId));
        if (selected) { setSelectedHotel(selected); setSelectedRoom(null); setStep(1); }
      }
    } catch (err) {
      setError(err?.message || "Unable to load hotels. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHotels(), 0);

    return () => window.clearTimeout(timer);
  }, [loadHotels]);

  function selectHotel(hotel) {
    setSelectedHotel(hotel);
    setSelectedRoom(null);
    setStep(1);
    setError("");
    setSuccess("");
  }

  function selectRoom(room) {
    setSelectedRoom(room);
    setError("");
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function validateDates() {
    if (!form.checkIn || !form.checkOut) {
      return "Please select check-in and check-out dates.";
    }

    const nights = calculateNights(form.checkIn, form.checkOut);

    if (nights <= 0) {
      return "Check-out must be after check-in.";
    }

    return "";
  }

  function goToDetails() {
    if (!selectedHotel || !selectedRoom) {
      setError("Please select a room first.");
      return;
    }

    const dateError = validateDates();

    if (dateError) {
      setError(dateError);
      return;
    }

    setError("");
    setStep(2);
  }

  function goToPayment() {
    if (!form.guestName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.guestEmail.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!form.guestPhone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!form.guests || Number(form.guests) < 1) {
      setError("Please enter the number of guests.");
      return;
    }

    const capacity = safeNumber(selectedRoom?.capacity, 999);

    if (!Number.isSafeInteger(Number(form.rooms)) || Number(form.rooms) < 1) {
      setError("Select at least one room.");
      return;
    }

    if (Number(form.guests) > capacity * Number(form.rooms)) {
      setError(`The selected rooms support up to ${capacity * Number(form.rooms)} guests.`);
      return;
    }

    setError("");
    setStep(3);
  }

  async function reserveRoom() {
    if (!selectedHotel || !selectedRoom) {
      setError("Please select a hotel room.");
      return;
    }

    const dateError = validateDates();

    if (dateError) {
      setError(dateError);
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
          ...(sessionStorage.getItem("tripzoCustomerToken") ? { Authorization: `Bearer ${sessionStorage.getItem("tripzoCustomerToken")}` } : {}),
        },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          roomId: selectedRoom.id,
          guestName: form.guestName,
          guestEmail: form.guestEmail,
          guestPhone: form.guestPhone,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
          rooms: Number(form.rooms),

          paymentMethod,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Reservation failed.");
      }

      setConfirmation(result.data || result);
      setStep(4);

      setSuccess(
        `Reservation #${
          result?.data?.reservationId || result?.data?.id || "created"
        } created successfully.`,
      );

      await loadHotels();
    } catch (err) {
      setError(err?.message || "Reservation failed. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  function closeConfirmation() {
    setConfirmation(null);
    setSelectedHotel(null);
    setSelectedRoom(null);
    setStep(1);

    setForm({
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      checkIn: "",
      checkOut: "",
      guests: 1,
      rooms: 1,
    });

    setPaymentMethod("cash");
    setSuccess("");
    setError("");
  }

  const nights = useMemo(
    () => calculateNights(form.checkIn, form.checkOut),
    [form.checkIn, form.checkOut],
  );

  const selectedRoomPrice = useMemo(
    () => getRoomPrice(selectedRoom),
    [selectedRoom],
  );

  const currency = getRoomCurrency(selectedRoom, selectedHotel);

  const roomTotal = selectedRoomPrice * nights * Number(form.rooms || 1);
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#13294B] text-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                <Hotel size={13} />
                Tripzo Stays
              </div>

              <h1 className="text-2xl md:text-3xl font-black mt-3">
                Hotels & Stays
              </h1>

              <p className="text-sm text-white/65 mt-2 max-w-2xl">
                Find your stay, compare rooms and facilities, check the
                location, choose your travel dates and complete your reservation
                from one place.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:min-w-[300px]">
              <HeaderStat
                icon={Building2}
                value={hotels.length}
                label="Hotels"
              />

              <HeaderStat icon={ShieldCheck} value="Safe" label="Booking" />

              <HeaderStat icon={MapPin} value="Local" label="Locations" />
            </div>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex items-start gap-3">
          <Info size={17} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            <p className="font-bold">Something needs attention</p>
            <p className="mt-1">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-500"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* SUCCESS */}
      {success && !confirmation && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm flex items-center gap-3">
          <CircleCheck size={18} />
          {success}
        </div>
      )}

      {/* STEP INDICATOR */}
      {selectedHotel && <StepIndicator currentStep={step} />}

      {/* HOTEL LIST */}
      {!selectedHotel && (
        <>
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <LoaderCircle
                className="animate-spin mx-auto text-[#327D81]"
                size={30}
              />

              <p className="text-sm font-bold text-slate-600 mt-4">
                Loading hotels...
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Getting the latest hotel information from Tripzo.
              </p>
            </div>
          ) : hotels.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Hotel className="mx-auto text-slate-300" size={48} />

              <p className="font-black text-[#13294B] mt-4">
                No hotels available
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Add hotels and rooms from the Tripzo admin dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {hotels.map((hotel) => {
                const rooms = hotel.rooms || [];
                const cheapestRoom = [...rooms].sort(
                  (a, b) => getRoomPrice(a) - getRoomPrice(b),
                )[0];

                return (
                  <div
                    key={hotel.id}
                    className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                  >
                    <div className="grid lg:grid-cols-[330px_1fr]">
                      <div className="relative h-64 lg:h-full min-h-[300px]">
                        {getHotelImage(hotel) ? <img src={getHotelImage(hotel)} alt={hotel.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="flex h-full min-h-[300px] flex-col items-center justify-center bg-slate-100 text-slate-500"><Hotel size={38}/><span className="mt-2 text-xs">Photo not provided</span></div>}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />

                        <div className="absolute top-4 left-4">
                          <RatingBadge hotel={hotel} />
                        </div>

                        <a
                          href={buildMapsUrl(hotel)}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-4 left-4 right-4 bg-white/95 text-[#13294B] rounded-xl py-2.5 text-xs font-black flex items-center justify-center gap-2"
                        >
                          <Navigation size={14} />
                          View hotel location
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      <div className="p-5 md:p-7">
                        <div className="flex flex-col md:flex-row md:justify-between gap-5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-1 bg-[#13294B] text-white rounded-md text-[10px] font-black">
                                HOTEL
                              </span>

                              <Stars value={getHotelStars(hotel)} />

                              <span className="text-xs text-slate-500">
                                {getHotelRating(hotel)
                                  ? `${getHotelRating(hotel).toFixed(1)} rating`
                                  : "New property"}
                              </span>
                            </div>

                            <h2 className="text-xl md:text-2xl font-black text-[#13294B] mt-3">
                              {hotel.name}
                            </h2>

                            <p className="flex items-start gap-1.5 text-sm text-slate-500 mt-2">
                              <MapPin
                                size={15}
                                className="text-[#327D81] mt-0.5 shrink-0"
                              />

                              <span>
                                {hotel.address || hotel.city},{" "}
                                {hotel.country || "Nepal"}
                              </span>
                            </p>

                            {hotel.description && (
                              <p className="text-sm text-slate-600 leading-6 mt-4 max-w-2xl">
                                {hotel.description}
                              </p>
                            )}
                          </div>

                          {cheapestRoom && (
                            <div className="md:text-right shrink-0">
                              <p className="text-[10px] uppercase font-black tracking-wide text-slate-400">
                                From
                              </p>

                              <p className="text-2xl font-black text-[#327D81] mt-1">
                                {formatPrice
                                  ? formatPrice(
                                      getRoomPrice(cheapestRoom),
                                      getRoomCurrency(cheapestRoom, hotel),
                                    )
                                  : `${getRoomCurrency(
                                      cheapestRoom,
                                      hotel,
                                    )} ${getRoomPrice(
                                      cheapestRoom,
                                    ).toLocaleString()}`}
                              </p>

                              <p className="text-[10px] text-slate-400 font-bold">
                                per night
                              </p>
                            </div>
                          )}
                        </div>

                        {/* FACILITIES */}
                        <div className="mt-5">
                          <p className="text-[10px] uppercase tracking-wide font-black text-slate-400 mb-2">
                            Facilities
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {normalizeAmenities(hotel)
                              .slice(0, 6)
                              .map((amenity) => {
                                const Icon = amenity.icon || Sparkles;

                                return (
                                  <span
                                    key={amenity.key}
                                    className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600"
                                  >
                                    <Icon
                                      size={13}
                                      className="text-[#327D81]"
                                    />

                                    {amenity.label}
                                  </span>
                                );
                              })}
                          </div>
                        </div>

                        {/* REACH */}
                        <div className="grid sm:grid-cols-3 gap-2 mt-5">
                          <MiniInfo
                            icon={MapPin}
                            label="Location"
                            value={hotel.city || hotel.country || "Available"}
                          />

                          <MiniInfo
                            icon={Navigation}
                            label="Distance"
                            value={getDistance(hotel)}
                          />

                          <MiniInfo
                            icon={Car}
                            label="Reach"
                            value="Taxi / Bus / Car"
                          />
                        </div>

                        {/* ROOMS */}
                        <div className="mt-6 border-t border-slate-100 pt-5">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-black text-[#13294B]">
                                Available rooms
                              </h3>

                              <p className="text-xs text-slate-500 mt-1">
                                Compare room type, facilities and price.
                              </p>
                            </div>

                            <span className="text-xs font-bold text-slate-400">
                              {rooms.length} option
                              {rooms.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {rooms.map((room) => (
                              <RoomCard
                                key={room.id}
                                hotel={hotel}
                                room={room}
                                selected={false}
                                onSelect={() => {
                                  selectHotel(hotel);
                                  selectRoom(room);
                                }}
                                formatPrice={formatPrice}
                              />
                            ))}

                            {!rooms.length && (
                              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                                <p className="text-sm font-bold text-slate-600">
                                  No rooms currently available
                                </p>

                                <p className="text-xs text-slate-400 mt-1">
                                  Please check another hotel.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SELECTED HOTEL BOOKING FLOW */}
      {selectedHotel && (
        <div className="space-y-5">
          {/* BACK TO HOTELS */}
          <button
            type="button"
            onClick={() => {
              setSelectedHotel(null);
              setSelectedRoom(null);
              setStep(1);
              setError("");
            }}
            className="inline-flex items-center gap-2 text-sm font-black text-[#13294B] hover:text-[#327D81]"
          >
            <ChevronLeft size={17} />
            Back to hotels
          </button>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <HotelHero hotel={selectedHotel} />

              <div className="grid lg:grid-cols-[1fr_320px] gap-5">
                <div className="space-y-5">
                  <AmenitiesCard hotel={selectedHotel} />

                  <ReachCard hotel={selectedHotel} />

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <DoorOpen size={18} className="text-[#327D81]" />

                      <div>
                        <h3 className="font-black text-[#13294B]">
                          Choose your room
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Select the room that fits your trip.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(selectedHotel.rooms || []).map((room) => (
                        <RoomCard
                          key={room.id}
                          hotel={selectedHotel}
                          room={room}
                          selected={selectedRoom?.id === room.id}
                          onSelect={selectRoom}
                          formatPrice={formatPrice}
                        />
                      ))}

                      {!selectedHotel.rooms?.length && (
                        <div className="rounded-xl bg-slate-50 p-5 text-center">
                          <p className="font-bold text-slate-600">
                            No available rooms
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5 lg:sticky lg:top-5 lg:self-start">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-black text-[#13294B]">Stay dates</h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Choose when you will arrive and leave.
                    </p>

                    <div className="space-y-4 mt-5">
                      <InputField
                        label="Check-in"
                        icon={CalendarDays}
                        type="date"
                        value={form.checkIn}
                        onChange={(event) =>
                          updateForm("checkIn", event.target.value)
                        }
                        required
                      />

                      <InputField
                        label="Check-out"
                        icon={CalendarDays}
                        type="date"
                        value={form.checkOut}
                        onChange={(event) =>
                          updateForm("checkOut", event.target.value)
                        }
                        required
                      />

                      <InputField
                        label="Guests"
                        icon={Users}
                        type="number"
                        min="1"
                        max={Number(selectedRoom?.capacity || 10) * Number(form.rooms || 1)}
                        value={form.guests}
                        onChange={(event) =>
                          updateForm("guests", Number(event.target.value))
                        }
                        required
                      />
                      <InputField
                        label="Rooms"
                        icon={Hotel}
                        type="number"
                        min="1"
                        max={Math.max(1, Number(selectedRoom?.availableRooms || 1))}
                        value={form.rooms}
                        onChange={(event) => updateForm("rooms", Number(event.target.value))}
                        required
                      />
                    </div>

                    {nights > 0 && selectedRoom && (
                      <div className="mt-5 bg-[#E7F3F3] rounded-xl p-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Stay</span>

                          <span className="font-black text-[#13294B]">
                            {nights} night
                            {nights === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="flex justify-between mt-2 text-xs">
                          <span className="text-slate-500">Room total</span>

                          <span className="font-black text-[#327D81]">
                            {formatPrice
                              ? formatPrice(roomTotal, currency)
                              : `${currency} ${roomTotal.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={goToDetails}
                      disabled={!selectedRoom}
                      className="w-full mt-5 bg-[#327D81] text-white rounded-xl py-3.5 font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#28696d]"
                    >
                      Continue to traveller details
                      <ChevronRight size={16} className="inline ml-1" />
                    </button>
                  </div>

                  <div className="bg-[#13294B] text-white rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        size={20}
                        className="text-[#68B5B8] mt-0.5"
                      />

                      <div>
                        <p className="font-black text-sm">
                          Tripzo booking protection
                        </p>

                        <p className="text-xs text-white/60 mt-1 leading-5">
                          Your reservation information is sent securely to the
                          Tripzo booking system.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="grid lg:grid-cols-[1fr_340px] gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-[#E7F3F3] flex items-center justify-center">
                    <Users size={19} className="text-[#327D81]" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-[#13294B]">
                      Traveller information
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      Enter the details used for this hotel reservation.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <InputField
                    label="Full name"
                    value={form.guestName}
                    onChange={(event) =>
                      updateForm("guestName", event.target.value)
                    }
                    placeholder="Enter your full name"
                    required
                  />

                  <InputField
                    label="Email address"
                    icon={Mail}
                    type="email"
                    value={form.guestEmail}
                    onChange={(event) =>
                      updateForm("guestEmail", event.target.value)
                    }
                    placeholder="you@example.com"
                    required
                  />

                  <InputField
                    label="Phone number"
                    icon={Phone}
                    value={form.guestPhone}
                    onChange={(event) =>
                      updateForm("guestPhone", event.target.value)
                    }
                    placeholder="+977 98XXXXXXXX"
                    required
                  />

                  <InputField
                    label="Number of guests"
                    icon={Users}
                    type="number"
                    min="1"
                    max={Number(selectedRoom?.capacity || 10) * Number(form.rooms || 1)}
                    value={form.guests}
                    onChange={(event) =>
                      updateForm("guests", Number(event.target.value))
                    }
                    required
                  />
                  <InputField
                    label="Number of rooms"
                    icon={Hotel}
                    type="number"
                    min="1"
                    max={Math.max(1, Number(selectedRoom?.availableRooms || 1))}
                    value={form.rooms}
                    onChange={(event) => updateForm("rooms", Number(event.target.value))}
                    required
                  />
                </div>

                <div className="mt-6 bg-slate-50 rounded-2xl p-5">
                  <div className="flex gap-3">
                    <Info size={18} className="text-[#327D81] mt-0.5" />

                    <div>
                      <p className="font-black text-[#13294B] text-sm">
                        Stay information
                      </p>

                      <div className="grid sm:grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-[10px] uppercase font-black text-slate-400">
                            Check-in
                          </p>

                          <p className="text-xs font-bold text-slate-700 mt-1">
                            {formatDate(form.checkIn)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-black text-slate-400">
                            Check-out
                          </p>

                          <p className="text-xs font-bold text-slate-700 mt-1">
                            {formatDate(form.checkOut)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-black text-slate-400">
                            Duration
                          </p>

                          <p className="text-xs font-bold text-slate-700 mt-1">
                            {nights} night
                            {nights === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-7">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-slate-200 rounded-xl py-3.5 font-black text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} className="inline mr-1" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={goToPayment}
                    className="flex-[2] bg-[#327D81] text-white rounded-xl py-3.5 font-black text-sm hover:bg-[#28696d]"
                  >
                    Continue to payment
                    <ChevronRight size={16} className="inline ml-1" />
                  </button>
                </div>
              </div>

              <div>
                <BookingSummary
                  hotel={selectedHotel}
                  room={selectedRoom}
                  form={form}
                  formatPrice={formatPrice}
                />
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="grid lg:grid-cols-[1fr_340px] gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-[#E7F3F3] flex items-center justify-center">
                    <CreditCard size={19} className="text-[#327D81]" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-[#13294B]">
                      Payment
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      Select how you want to pay for your stay.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <PaymentMethod
                    method="cash"
                    selected={paymentMethod === "cash"}
                    onSelect={setPaymentMethod}
                    title="Pay at hotel"
                    description="Reserve now and pay directly at the property."
                  />

                  <PaymentMethod
                    method="card"
                    selected={paymentMethod === "card"}
                    onSelect={setPaymentMethod}
                    title="Credit / Debit Card"
                    description="Unavailable until a payment provider is configured."
                    disabled
                  />

                  <PaymentMethod
                    method="wallet"
                    selected={paymentMethod === "wallet"}
                    onSelect={setPaymentMethod}
                    title="Digital Wallet"
                    description="For supported digital wallet payment."
                    disabled
                  />

                  <PaymentMethod
                    method="mobile"
                    selected={paymentMethod === "mobile"}
                    onSelect={setPaymentMethod}
                    title="Mobile Banking"
                    description="For supported mobile banking providers."
                    disabled
                  />
                </div>

                {paymentMethod !== "cash" && (
                  <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <Info size={17} className="text-amber-600 mt-0.5" />

                      <div>
                        <p className="font-black text-amber-800 text-sm">
                          Payment provider required
                        </p>

                        <p className="text-xs text-amber-700 mt-1 leading-5">
                          The interface is ready for online payment, but actual
                          card/wallet/mobile payment requires a payment gateway
                          connected to your backend.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={17} className="text-[#327D81]" />

                    <p className="font-black text-sm text-[#13294B]">
                      Payment selection
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 leading-5">
                    Selected method:
                    <span className="font-black text-slate-700 ml-1">
                      {paymentLabel(paymentMethod)}
                    </span>
                  </p>
                </div>

                <div className="flex gap-3 mt-7">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 border border-slate-200 rounded-xl py-3.5 font-black text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} className="inline mr-1" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={reserveRoom}
                    disabled={booking}
                    className="flex-[2] bg-[#327D81] text-white rounded-xl py-3.5 font-black text-sm disabled:opacity-50 hover:bg-[#28696d]"
                  >
                    {booking ? (
                      <>
                        <LoaderCircle
                          size={16}
                          className="inline animate-spin mr-2"
                        />
                        Creating booking...
                      </>
                    ) : (
                      <>
                        Confirm booking
                        <Check size={16} className="inline ml-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <BookingSummary
                  hotel={selectedHotel}
                  room={selectedRoom}
                  form={form}
                  paymentMethod={paymentMethod}
                  formatPrice={formatPrice}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION */}
      {confirmation && selectedHotel && selectedRoom && (
        <ConfirmationScreen
          hotel={selectedHotel}
          room={selectedRoom}
          bookingData={confirmation}
          form={form}
          paymentMethod={paymentMethod}
          formatPrice={formatPrice}
          onClose={closeConfirmation}
        />
      )}
    </div>
  );
}

function HeaderStat({ icon: Icon, value, label }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-xl p-3">
      <Icon size={16} className="text-[#68B5B8]" />

      <p className="font-black text-sm mt-2">{value}</p>

      <p className="text-[10px] text-white/50">{label}</p>
    </div>
  );
}

function MiniInfo({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
      <Icon size={14} className="text-[#327D81]" />

      <p className="text-[9px] uppercase tracking-wide font-black text-slate-400 mt-2">
        {label}
      </p>

      <p className="text-xs font-bold text-slate-700 mt-1">{value}</p>
    </div>
  );
}
