import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import FlightBooking from "./components/FlightBooking";
import BusBooking from "./components/BusBooking";
import AirportTaxi from "./components/AirportTaxi";
import StaysBooking from "./components/StaysBooking";
import AiPlanner from "./components/AiPlanner";

export default function App() {
  const [activeTab, setActiveTab] = useState("flights");
  const [currency, setCurrency] = useState("NPR");

  const formatPrice = (npr) => {
    if (currency === "NPR") {
      return `NPR ${Number(npr).toLocaleString()}`;
    }
    return `$${Math.round(Number(npr) / 133)}`;
  };

  return (
    <div className="min-h-screen bg-[#F4F6EF] text-[#13294B] font-sans antialiased flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === "flights" && (
          <FlightBooking currency={currency} formatPrice={formatPrice} />
        )}
        {activeTab === "buses" && <BusBooking formatPrice={formatPrice} />}
        {activeTab === "taxi" && <AirportTaxi formatPrice={formatPrice} />}
        {activeTab === "stays" && <StaysBooking formatPrice={formatPrice} />}
        {activeTab === "planner" && <AiPlanner formatPrice={formatPrice} />}
      </main>

      <Footer />
    </div>
  );
}
