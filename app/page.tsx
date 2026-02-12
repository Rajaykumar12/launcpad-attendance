"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { saveSession, getSession } from "@/lib/session";
import { User } from "lucide-react";

export default function HomePage() {
  const [serialNumber, setSerialNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user already has an active session
    const session = getSession();
    if (session) {
      router.push("/status");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!serialNumber.trim()) return;

    setLoading(true);

    try {
      // Check if member exists
      const memberRef = doc(db, "members", serialNumber.trim());
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        // Member found - create attendance record
        const attendanceRef = await addDoc(collection(db, "attendance"), {
          userId: serialNumber.trim(),
          type: "member",
          checkIn: serverTimestamp(),
          checkOut: null,
        });

        // Save session
        saveSession({
          attendanceId: attendanceRef.id,
          userId: serialNumber.trim(),
          type: "member",
          checkInTime: new Date().toISOString(),
        });

        // Log analytics event
        if (typeof window !== "undefined") {
          import("firebase/analytics").then(({ logEvent }) => {
            const { analytics } = require("@/lib/firebase");
            if (analytics) {
              logEvent(analytics, "check_in", {
                type: "member",
                method: "manual_entry"
              });
            }
          });
        }

        // Redirect to status page
        router.push("/status");
      } else {
        // Member not found - redirect to guest registration
        router.push("/guest-registration");
      }
    } catch (error) {
      console.error("Error checking member:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <div className="card" style={{ width: "100%" }}>
        <div className="text-center mb-6">
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 1rem",
              background: "var(--accent-primary)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <User size={32} color="white" />
          </div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            Welcome
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            Enter your USN to check in
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="usn" className="label">
              USN
            </label>
            <input
              id="usn"
              type="text"
              className="input"
              placeholder="Enter your USN"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !serialNumber.trim()}>
            {loading ? (
              <>
                <span className="spinner" />
                Checking...
              </>
            ) : (
              "Check In"
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Not a member?{" "}
            <a
              href="/guest-registration"
              style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: "600" }}
            >
              Register as Guest
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
