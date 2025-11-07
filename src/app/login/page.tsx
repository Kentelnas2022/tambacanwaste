// app/login/page.tsx
// THIS FILE REMAINS THE SAME FROM THE PREVIOUS FIX

import { Suspense } from "react";
import LoginComponent from "./LoginComponent"; // Import the component you just renamed

// This is a simple loading UI. You can make it look better later.
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p>Loading...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginComponent />
    </Suspense>
  );
}