import { useState } from "react";
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


export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [currency, setCurrency] = useState("NPR");

const formatPrice = (amount, fromCurrency = "NPR") => {
  const value = Number(amount);

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
        {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
        {activeTab === "flights" && (
          <FlightBooking currency={currency} formatPrice={formatPrice} />
        )}
        {activeTab === "buses" && <BusBooking formatPrice={formatPrice} />}
        {activeTab === "taxi" && <AirportTaxi formatPrice={formatPrice} />}
        {activeTab === "stays" && <StaysBooking formatPrice={formatPrice} />}
        {activeTab === "planner" && <AiPlanner formatPrice={formatPrice} />}
        {activeTab === "account" && <CustomerAccount />}
      </main>

      <Footer />
    </div>
  );
}
