"use client";

import React from "react";

// Helper function to get the time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

// No skeleton is needed here because the main page.jsx
// now handles the loading state for the whole app.

export default function GreetingCard({ residentName }) {
  const greeting = getGreeting();
  
  // Use a default name if residentName isn't loaded yet
  const displayName = residentName || "Resident";

  return (
    // This styling now perfectly matches your Schedule, Report,
    // and Education content blocks for a consistent minimal design.
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800">
        {greeting}, {displayName}!
      </h2>
      <p className="text-gray-600 mt-1">
        Welcome to your dashboard. Here are your updates.
      </p>
    </div>
  );
}