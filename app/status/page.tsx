"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { db, analytics } from "@/lib/firebase";
import { getSession, clearSession } from "@/lib/session";
import { CheckCircle, LogOut, Clock, Bell, BellOff } from "lucide-react";

const REMINDER_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours in ms

export default function StatusPage() {
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
    const [elapsed, setElapsed] = useState("");
    const router = useRouter();

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            setNotifPermission("granted");
            setNotificationsEnabled(true);
            return;
        }

        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            setNotifPermission(permission);
            if (permission === "granted") {
                setNotificationsEnabled(true);
            }
        } else {
            setNotifPermission("denied");
        }
    }, []);

    // Send browser notification
    const sendNotification = useCallback((checkInTime: Date) => {
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const now = new Date();
        const diffMs = now.getTime() - checkInTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        new Notification("🔔 Still Checked In!", {
            body: `You've been checked in for ${hours}h ${mins}m. Don't forget to check out when you leave!`,
            icon: "/favicon.ico",
            tag: "checkout-reminder",
            requireInteraction: true,
        });
    }, []);

    useEffect(() => {
        const currentSession = getSession();
        if (!currentSession) {
            router.push("/");
        } else {
            setSession(currentSession);

            // Check if notifications were previously enabled
            if ("Notification" in window) {
                setNotifPermission(Notification.permission);
                const saved = localStorage.getItem("checkout_notif_enabled");
                if (Notification.permission === "granted" && saved === "true") {
                    setNotificationsEnabled(true);
                }
            }
        }
    }, [router]);

    // Elapsed time ticker (updates every minute)
    useEffect(() => {
        if (!session) return;

        const updateElapsed = () => {
            const checkIn = new Date(session.checkInTime);
            const now = new Date();
            const diffMs = now.getTime() - checkIn.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            setElapsed(`${hours}h ${mins}m`);
        };

        updateElapsed();
        const ticker = setInterval(updateElapsed, 60_000);
        return () => clearInterval(ticker);
    }, [session]);

    // 2-hour reminder notifications
    useEffect(() => {
        if (!session || !notificationsEnabled) return;

        const checkInTime = new Date(session.checkInTime);

        // Calculate time until next 2-hour mark
        const now = new Date();
        const elapsedMs = now.getTime() - checkInTime.getTime();
        const msUntilNext = REMINDER_INTERVAL - (elapsedMs % REMINDER_INTERVAL);

        // If already past 2 hours, send one immediately
        if (elapsedMs >= REMINDER_INTERVAL) {
            sendNotification(checkInTime);
        }

        // Schedule the next notification, then repeat every 2 hours
        const firstTimeout = setTimeout(() => {
            sendNotification(checkInTime);

            // Then every 2 hours after that
            const interval = setInterval(() => {
                // Re-check session is still active
                const currentSession = getSession();
                if (!currentSession) {
                    clearInterval(interval);
                    return;
                }
                sendNotification(checkInTime);
            }, REMINDER_INTERVAL);

            // Store interval ID for cleanup
            (window as any).__checkoutInterval = interval;
        }, msUntilNext);

        return () => {
            clearTimeout(firstTimeout);
            if ((window as any).__checkoutInterval) {
                clearInterval((window as any).__checkoutInterval);
            }
        };
    }, [session, notificationsEnabled, sendNotification]);

    const toggleNotifications = async () => {
        if (notificationsEnabled) {
            setNotificationsEnabled(false);
            localStorage.setItem("checkout_notif_enabled", "false");
        } else {
            await requestNotificationPermission();
            if (Notification.permission === "granted") {
                setNotificationsEnabled(true);
                localStorage.setItem("checkout_notif_enabled", "true");
            }
        }
    };

    const handleCheckOut = async () => {
        if (!session) return;

        setLoading(true);

        try {
            const attendanceRef = doc(db, "attendance", session.attendanceId);
            await updateDoc(attendanceRef, {
                checkOut: serverTimestamp(),
            });

            if (analytics) {
                const checkInTime = new Date(session.checkInTime).getTime();
                const now = new Date().getTime();
                const durationMinutes = Math.round((now - checkInTime) / 60000);

                logEvent(analytics, "check_out", {
                    type: session.type,
                    duration_minutes: durationMinutes
                });
            }

            // Clean up notification state
            localStorage.removeItem("checkout_notif_enabled");

            clearSession();
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
                            background: "#f3f4f6",
                            border: "2px solid #374151",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <CheckCircle size={40} color="#374151" />
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

                    {elapsed && (
                        <div style={{
                            marginTop: "0.75rem", padding: "0.5rem 0.75rem",
                            background: "#f3f4f6", borderRadius: "0.5rem",
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            fontSize: "0.85rem", color: "#374151", fontWeight: 500,
                        }}>
                            <Clock size={14} />
                            Session duration: {elapsed}
                        </div>
                    )}
                </div>

                {/* Notification Toggle */}
                <div
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.75rem 1rem", marginBottom: "1.5rem",
                        background: notificationsEnabled ? "#f3f4f6" : "var(--bg-secondary)",
                        border: `1px solid ${notificationsEnabled ? "#d1d5db" : "var(--border-color)"}`,
                        borderRadius: "0.5rem", cursor: "pointer",
                    }}
                    onClick={toggleNotifications}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {notificationsEnabled ? (
                            <Bell size={18} color="#374151" />
                        ) : (
                            <BellOff size={18} color="var(--text-muted)" />
                        )}
                        <div>
                            <p style={{ fontSize: "0.85rem", fontWeight: 500, color: notificationsEnabled ? "#374151" : "var(--text-primary)" }}>
                                {notificationsEnabled ? "Reminders On" : "Enable Reminders"}
                            </p>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {notificationsEnabled
                                    ? "You'll be reminded every 2 hours to check out"
                                    : notifPermission === "denied"
                                        ? "Notifications blocked — enable in browser settings"
                                        : "Get notified every 2 hours if you forget to check out"}
                            </p>
                        </div>
                    </div>
                    <div
                        style={{
                            width: 40, height: 22, borderRadius: 11, padding: 2,
                            background: notificationsEnabled ? "#374151" : "#d1d5db",
                            transition: "background 0.2s",
                        }}
                    >
                        <div
                            style={{
                                width: 18, height: 18, borderRadius: "50%", background: "white",
                                transition: "transform 0.2s",
                                transform: notificationsEnabled ? "translateX(18px)" : "translateX(0)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                        />
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
