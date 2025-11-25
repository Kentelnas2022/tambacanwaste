  "use client";

  import { useEffect, useState } from "react";
  import { supabase } from "@/supabaseClient";
  import Swal from "sweetalert2";
  import { approveUserAction } from "./actions"; // ✅ Import the server action

  export default function UsersManagement() {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchPending = async () => {
      const { data, error } = await supabase
        .from("pending_registrations")
        .select("*");

      if (!error) setPending(data);
    };

    useEffect(() => {
      fetchPending();
    }, []);

    const approveUser = async (user) => {
      // Show loading state
      setLoading(true);

      // ✅ Call the Server Action
      const result = await approveUserAction(user);

      setLoading(false);

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "User Approved",
          text: `${user.name} is now registered.`,
        });
        fetchPending(); // Refresh list
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result.error,
        });
      }
    };

    const declineUser = async (id) => {
      const { error } = await supabase.from("pending_registrations").delete().eq("id", id);
      
      if (error) {
        Swal.fire({ icon: "error", title: "Error", text: error.message });
        return;
      }

      Swal.fire({
        icon: "info",
        title: "User Declined",
        text: "Registration request removed.",
      });

      fetchPending();
    };

    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">User Management</h1>

        <div className="space-y-4">
          {pending.map((user) => (
            <div key={user.id} className="border p-4 rounded-xl bg-white shadow-sm">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Purok:</strong> {user.purok}</p>
              <p><strong>Role:</strong> {user.role}</p>

              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => approveUser(user)}
                  disabled={loading}
                  className={`text-white px-4 py-2 rounded-lg ${
                    loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loading ? "Processing..." : "Approve"}
                </button>

                <button
                  onClick={() => declineUser(user.id)}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}

          {pending.length === 0 && (
            <p className="text-gray-500">No pending registrations.</p>
          )}
        </div>
      </div>
    );
  } 