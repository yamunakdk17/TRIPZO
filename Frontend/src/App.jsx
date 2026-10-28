import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import FlightBooking from "./components/FlightBooking";
import BusBooking from "./components/BusBooking";
import AirportTaxi from "./components/AirportTaxi";
import StaysBooking from "./components/StaysBooking";
import AiPlanner from "./components/AiPlanner";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerAccount from "./components/CustomerAccount";
import Home from "./components/Home";
import HotelDetails from "./pages/HotelDetails";
import TaxiDetails from "./pages/TaxiDetails";

const TAB_BY_PATH = {
  "/": "home",
  "/home": "home",
  "/flights": "flights",
  "/buses": "buses",
  "/taxi": "taxi",
  "/taxis": "taxi",
  "/stays": "stays",
  "/planner": "planner",
  "/account": "account",
};

function AppShell() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    TAB_BY_PATH[location.pathname] || "home",
  );
  const [currency, setCurrency] = useState("NPR");

  useEffect(() => {
    const nextTab = TAB_BY_PATH[location.pathname] || "home";
    setActiveTab(nextTab);
  }, [location.pathname]);

  const formatPrice = (amount, fromCurrency = "NPR") => {
    const value = Number(amount);

    if (Number.isNaN(value)) {
      return "—";
    }

    if (fromCurrency === currency) {
      return currency === "NPR"
        ? `NPR ${value.toLocaleString()}`
        : `$${value.toLocaleString()}`;
    }

    if (fromCurrency === "USD" && currency === "NPR") {
      return `NPR ${(value * 133).toLocaleString()}`;
    }

    if (fromCurrency === "NPR" && currency === "USD") {
      return `$${(value / 133).toFixed(2)}`;
    }

    return `${currency} ${value.toLocaleString()}`;
  };

  if (window.location.pathname.startsWith("/admin")) {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-[#F4F6EF] text-[#13294B] font-sans antialiased flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home setActiveTab={setActiveTab} />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route
            path="/flights"
            element={<FlightBooking currency={currency} formatPrice={formatPrice} />}
          />
          <Route path="/buses" element={<BusBooking formatPrice={formatPrice} />} />
          <Route path="/taxi" element={<AirportTaxi formatPrice={formatPrice} />} />
          <Route path="/taxis" element={<AirportTaxi formatPrice={formatPrice} />} />
          <Route path="/taxis/:slug" element={<TaxiDetails />} />
          <Route path="/taxi/:slug" element={<TaxiDetails />} />
          <Route path="/stays" element={<StaysBooking formatPrice={formatPrice} />} />
          <Route path="/hotels" element={<StaysBooking formatPrice={formatPrice} />} />
          <Route path="/planner" element={<AiPlanner formatPrice={formatPrice} />} />
          <Route path="/account" element={<CustomerAccount />} />
          <Route path="/hotels/:slug" element={<HotelDetails />} />
          <Route path="/hotel/:slug" element={<HotelDetails />} />
          <Route path="*" element={<Home setActiveTab={setActiveTab} />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
