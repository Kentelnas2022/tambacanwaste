"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient"; // Assuming this path works for the client
import { X, Check, User, MapPin, Phone, Shield, Clock } from "lucide-react";
import Swal from "sweetalert2";
// ✅ CORRECTED PATH: ../users-management/ to reach the actions.js file
import { approveUserAction } from "../user-management/actions"; 

export default function UserManagementModal({ isOpen, onClose }) {
  const [pending, setPending] = useState([]);
  const [loadingId, setLoadingId] = useState(null); // Tracks which specific button is loading
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 1. Initial Fetch and Realtime Subscription
  useEffect(() => {
    if (!isOpen) {
      setIsInitialLoad(true);
      setPending([]);
      return;
    } 

    const fetchPending = async () => {
      const { data, error } = await supabase
        .from("pending_registrations")
        .select("*")
        .order("created_at", { ascending: false }); 

      if (!error) setPending(data);
      setIsInitialLoad(false);
    };

    fetchPending();

    // Setup Realtime Subscription
    const channel = supabase
      .channel("realtime_pending_users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pending_registrations" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Add new user to the top of the list
            setPending((prev) => [payload.new, ...prev]); 
          } else if (payload.eventType === "DELETE") {
            // Remove deleted user
            setPending((prev) => prev.filter((user) => user.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when modal closes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // 2. Approve Logic (Calls Server Action)
  const handleApprove = async (user) => {
    setLoadingId(user.id); 

    // Call the Server Action
    const result = await approveUserAction(user);

    if (result.success) {
      // Show success toast (Realtime will handle removing the card)
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      Toast.fire({
        icon: "success",
        title: `${user.name} approved successfully`,
      });
    } else {
      Swal.fire("Error", result.error, "error");
    }
    setLoadingId(null);
  };

  // 3. Decline Logic
  const handleDecline = async (id) => {
    // Note: Since this is just deleting public data, calling supabase directly is fine.
    const { error } = await supabase
      .from("pending_registrations")
      .delete()
      .eq("id", id);

    if (error) {
      Swal.fire("Error", error.message, "error");
    } else {
       // Realtime handles the UI update (removing the card)
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}    
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-red-800 text-white">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <User className="w-5 h-5" /> Pending Approvals
                </h2>
                <p className="text-xs text-red-100 mt-1">
                    Review and manage registration requests in real-time.
                </p>
            </div>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition text-white"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
            {isInitialLoad ? (
                // Loading State
                <div className="flex justify-center items-center py-12">
                     <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin mr-3" />
                     <p className="text-gray-600">Loading pending requests...</p>
                </div>
            ) : pending.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <div className="bg-gray-100 p-4 rounded-full mb-3">
                        <Clock className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm">No pending registration requests at the moment.</p>
                </div>
            ) : (
                // User List
                pending.map((user) => (
                    <div 
                        key={user.id} 
                        className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group"
                    >
                        {/* User Info */}
                        <div className="flex gap-4 items-start">
                            {/* Avatar Initials */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm shrink-0 ${
                                user.role === 'official' ? 'bg-blue-600' : 'bg-orange-500'
                            }`}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            
                            <div>
                                <h3 className="font-bold text-gray-900">{user.name}</h3>
                                <div className="text-sm text-gray-500 mb-2">{user.email}</div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {/* Role Badge */}
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                                        user.role === 'official' 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-orange-50 text-orange-700 border-orange-200'
                                    } flex items-center gap-1`}>
                                        <Shield className="w-3 h-3" /> {user.role.toUpperCase()}
                                    </span>

                                    {/* Purok Badge */}
                                    {user.purok && (
                                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {user.purok}
                                        </span>
                                    )}

                                    {/* Mobile Badge */}
                                    {user.mobile_number && (
                                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {user.mobile_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 mt-2 sm:mt-0">
                            <button
                                onClick={() => handleDecline(user.id)}
                                disabled={loadingId === user.id}
                                className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold transition flex justify-center items-center gap-1"
                            >
                                <X className="w-4 h-4" /> Decline
                            </button>
                            <button
                                onClick={() => handleApprove(user)}
                                disabled={loadingId === user.id}
                                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg text-sm font-semibold transition flex justify-center items-center gap-1 min-w-[100px]"
                            >
                                {loadingId === user.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" /> Approve
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
            Secure Admin Action via Server • Realtime Sync Enabled
        </div>
      </div>
    </div>
  );
}