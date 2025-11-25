"use server";

import { createClient } from "@supabase/supabase-js";

// Initialize the Admin Client using the Service Role Key
// This only runs on the server, so it is safe.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function approveUserAction(userData) {
  try {
    // 1. Create the user in Supabase Auth (This was failing on client side)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        purok: userData.purok,
        mobile_number: userData.mobile_number,
        role: userData.role,
      },
    });

    if (authError) throw new Error(authError.message);

    // 2. Delete the pending registration request
    // We use admin here too to ensure we have permission to delete it
    const { error: deleteError } = await supabaseAdmin
      .from("pending_registrations")
      .delete()
      .eq("id", userData.id);

    if (deleteError) throw new Error(deleteError.message);

    return { success: true };
  } catch (error) {
    console.error("Approval Error:", error);
    return { success: false, error: error.message };
  }
}