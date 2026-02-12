"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { db, analytics } from "@/lib/firebase";
import { getSession, clearSession } from "@/lib/session";
import { CheckCircle, LogOut, Clock } from "lucide-react";

export default function StatusPage() {
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        // Check if user has an active session
        const currentSession = getSession();
        if (!currentSession) {
            // No session found, redirect to home
            router.push("/");
        } else {
            setSession(currentSession);
        }
    }, [router]);

    const handleCheckOut = async () => {
        if (!session) return;

        setLoading(true);

        try {
            // Update attendance record with checkout time
            const attendanceRef = doc(db, "attendance", session.attendanceId);
            await updateDoc(attendanceRef, {
                checkOut: serverTimestamp(),
            });

            // Log check-out event with duration
            if (analytics) {
                const checkInTime = new Date(session.checkInTime).getTime();
                const now = new Date().getTime();
                const durationMinutes = Math.round((now - checkInTime) / 60000);

                logEvent(analytics, "check_out", {
                    type: session.type, // "member" or "guest"
                    duration_minutes: durationMinutes
                });
            }

            // Clear session
            clearSession();

            // Redirect to home
            router.push("/");
        } catch (error) {
            console.error("Error checking out:", error);
            alert("An error occurred during check-out. Please try again.");
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
                <div className="card text-center" style={{ width: "100%" }}>
                    <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
                </div>
            </div>
        );
    }

    const checkInTime = new Date(session.checkInTime);
    const formattedTime = checkInTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
    const formattedDate = checkInTime.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <div className="card" style={{ width: "100%" }}>
                <div className="text-center mb-6">
                    <div
                        style={{
                            width: "80px",
                            height: "80px",
                            margin: "0 auto 1.5rem",
                            background: "#f0fdf4",
                            border: "2px solid var(--accent-success)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <CheckCircle size={40} color="var(--accent-success)" />
                    </div>
                    <h1 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                        You're Checked In
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
                        Have a productive session!
                    </p>
                </div>

                <div
                    style={{
                        background: "var(--bg-secondary)",
                        borderRadius: "0.75rem",
                        padding: "1.5rem",
                        marginBottom: "2rem",
                    }}
                >
                    <div style={{ marginBottom: "1rem" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                            {session.type === "member" ? "USN" : "Name"}
                        </p>
                        <p style={{ fontSize: "1.125rem", fontWeight: "600" }}>
                            {session.userName || session.userId}
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)" }}>
                        <Clock size={16} />
                        <span style={{ fontSize: "0.875rem" }}>
                            Checked in at {formattedTime} on {formattedDate}
                        </span>
                    </div>
                </div>

                <button onClick={handleCheckOut} className="btn btn-danger" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner" />
                            Checking Out...
                        </>
                    ) : (
                        <>
                            <LogOut size={20} />
                            Check Out
                        </>
                    )}
                </button>

                <div className="text-center mt-4">
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                        Make sure to check out when you leave
                    </p>
                </div>
            </div>
        </div>
    );
}
