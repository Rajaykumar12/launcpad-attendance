"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { saveSession, getSession } from "@/lib/session";

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
    <div className="container" style={{ flex: 1, display: "flex", alignItems: "center" }}>
      <div className="card" style={{ width: "100%" }}>
        <div className="text-center mb-6">
          {/* College Logo */}
          <div style={{ margin: "0 auto 1rem", display: "flex", justifyContent: "center" }}>
            <img
              src="/logos/sahyadri.png"
              alt="Sahyadri College"
              style={{ width: "72px", height: "72px", objectFit: "contain", borderRadius: "0.5rem", display: "block" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling!.removeAttribute("style");
              }}
            />
            <div style={{ display: "none", width: "72px", height: "72px", margin: "0 auto", background: "#f3f4f6", borderRadius: "0.5rem", lineHeight: "72px", fontSize: "0.65rem", color: "#9ca3af", textAlign: "center" }}>
              College
            </div>
          </div>

          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            Sahyadri Launchpad
          </h1>

          {/* Club Logos */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem", marginBottom: "0.5rem" }}>
            {[
              { src: "/logos/sosc.png", alt: "SOSC", label: "SOSC" },
              { src: "/logos/challengers.png", alt: "Challengers", label: "Challengers" },
              { src: "/logos/src.png", alt: "SRC", label: "SRC" },
            ].map((club) => (
              <div key={club.alt} style={{ textAlign: "center" }}>
                <img
                  src={club.src}
                  alt={club.alt}
                  style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "50%" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).style.display = "flex";
                  }}
                />
                <div style={{
                  display: "none", width: "44px", height: "44px", margin: "0 auto",
                  background: "#f3f4f6", borderRadius: "50%", alignItems: "center",
                  justifyContent: "center", fontSize: "0.6rem", color: "#9ca3af", fontWeight: 600,
                }}>
                  {club.label.charAt(0)}
                </div>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{club.label}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
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
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
            <a
              href="/admin/login"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              Admin Panel →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
