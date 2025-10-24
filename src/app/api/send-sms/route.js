import { Vonage } from "@vonage/server-sdk";
import { NextResponse } from "next/server";

// Initialize Vonage client
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

export async function POST(request) {
  const from = process.env.VONAGE_SMS_FROM;
  
  try {
    const { to, message } = await request.json(); // Get data from the request body

    // Basic validation
    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' or 'message'" },
        { status: 400 }
      );
    }

    // Send the SMS
    const response = await vonage.sms.send({ to, from, text: message });

    // Check if Vonage reported success
    if (response.messages[0].status === "0") {
      console.log("Message sent successfully");
      return NextResponse.json({ success: true, data: response }, { status: 200 });
    } else {
      // Vonage returned an error
      const errorText = response.messages[0]["error-text"];
      console.error("Vonage error:", errorText);
      return NextResponse.json(
        { success: false, error: `Vonage Error: ${errorText}` },
        { status: 400 }
      );
    }
  } catch (error) {
    // Network or other server error
    console.error("Server error sending SMS:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}