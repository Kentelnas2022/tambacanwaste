"use client";

import { useEffect, useState } from 'react';
// Assuming '@/supabaseClient' correctly resolves to src/supabaseClient.ts
import { supabase } from '@/supabaseClient'; 
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function AuthStatusChecker({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserStatus = async () => {
      // 1. Get the current authenticated user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        // If the user is somehow accessing the protected layout without a session, redirect to login
        router.push('/login');
        return;
      }

      // 2. Check the database if this user's email is still marked as pending
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_registrations')
        .select('id')
        .eq('email', user.email)
        .maybeSingle(); 

      if (pendingError) {
        console.error("Error checking pending status:", pendingError);
        setIsLoading(false);
        return;
      }
      
      if (pendingData) {
        // User found in pending table! Block access.
        Swal.fire({
          title: 'Account Pending Approval ⏱️',
          text: 'Your registration is currently being reviewed by a Barangay Official. You will be able to log in once your account is approved.',
          icon: 'warning',
          confirmButtonText: 'Return to Login',
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then(() => {
          // Force sign out and redirect to prevent unauthorized access loop
          supabase.auth.signOut();
          router.push('/login');
        });
        
        return; // Stop loading the rest of the application
      }

      // 3. User is approved (not in pending table), proceed to app
      setIsLoading(false);
    };

    checkUserStatus();
  }, [router]);

  if (isLoading) {
    // Show a loading screen while the database check runs
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-lg text-gray-600">Verifying account status...</p>
      </div>
    );
  }

  // If the check passes, render the rest of the application (children)
  return <>{children}</>;
}