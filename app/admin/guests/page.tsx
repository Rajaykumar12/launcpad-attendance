"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserCheck, Search, Calendar, Phone, BookOpen } from "lucide-react";

interface GuestRow {
    id: string;
    usn: string;
    fullName: string;
    phoneNumber: string;
    purpose: string;
    createdAt: string;
    checkIn: string;
    checkOut: string | null;
    duration: string;
}

export default function AdminGuestsPage() {
    const [guests, setGuests] = useState<GuestRow[]>([]);
    const [filteredGuests, setFilteredGuests] = useState<GuestRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGuests();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            setFilteredGuests(
                guests.filter(
                    (g) =>
                        g.fullName.toLowerCase().includes(q) ||
                        g.usn.toLowerCase().includes(q) ||
                        g.purpose.toLowerCase().includes(q) ||
                        g.phoneNumber.includes(q)
                )
            );
        } else {
            setFilteredGuests(guests);
        }
    }, [searchQuery, guests]);

    const fetchGuests = async () => {
        try {
            // Fetch all guests
            const guestsQuery = query(collection(db, "guests"), orderBy("createdAt", "desc"));
            const guestsSnap = await getDocs(guestsQuery);

            // Fetch all guest attendance records
            const attendanceQuery = query(
                collection(db, "attendance"),
                orderBy("checkIn", "desc")
            );
            const attendanceSnap = await getDocs(attendanceQuery);

            // Build a map of guest attendance (userId -> attendance data)
            const attendanceMap: Record<string, { checkIn: Date; checkOut: Date | null }> = {};
            attendanceSnap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.type === "guest") {
                    const checkIn = data.checkIn?.toDate?.();
                    const checkOut = data.checkOut?.toDate?.();
                    if (!attendanceMap[data.userId]) {
                        attendanceMap[data.userId] = { checkIn, checkOut };
                    }
                }
            });

            const guestList: GuestRow[] = guestsSnap.docs.map((doc) => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate?.();
                const attendance = attendanceMap[doc.id];

                let duration = "-";
                let checkIn = "-";
                let checkOut: string | null = null;

                if (attendance) {
                    checkIn = attendance.checkIn
                        ? attendance.checkIn.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "-";

                    if (attendance.checkOut) {
                        checkOut = attendance.checkOut.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        });
                        const diffMs = attendance.checkOut.getTime() - attendance.checkIn.getTime();
                        const hours = Math.floor(diffMs / (1000 * 60 * 60));
                        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        duration = `${hours}h ${mins}m`;
                    } else {
                        duration = "Still here";
                    }
                }

                return {
                    id: doc.id,
                    usn: data.usn || "-",
                    fullName: data.fullName || "Unknown",
                    phoneNumber: data.phoneNumber || "-",
                    purpose: data.purpose || "-",
                    createdAt: createdAt
                        ? createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })
                        : "-",
                    checkIn,
                    checkOut,
                    duration,
                };
            });

            setGuests(guestList);
            setFilteredGuests(guestList);
        } catch (error) {
            console.error("Error fetching guests:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    <UserCheck size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
                    Guest Records
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    All guest registrations and visit details
                </p>
            </div>

            {/* Search */}
            <div className="admin-filters">
                <div className="admin-search-box" style={{ flex: 1 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by name, USN, phone, or purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
            </div>

            {/* Summary */}
            <div className="admin-summary-bar">
                <span>
                    Showing <strong>{filteredGuests.length}</strong> of {guests.length} guests
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                    {guests.filter((g) => g.duration === "Still here").length} currently visiting
                </span>
            </div>

            {/* Guests Cards (mobile-friendly) */}
            <div className="admin-card">
                {filteredGuests.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", textAlign: "center", padding: "3rem" }}>
                        {searchQuery ? "No guests match your search" : "No guest records found"}
                    </p>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="admin-table-wrapper admin-desktop-only">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>USN</th>
                                        <th>Phone</th>
                                        <th>Purpose</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
                                        <th>Duration</th>
                                        <th>Registered</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGuests.map((guest) => (
                                        <tr key={guest.id}>
                                            <td style={{ fontWeight: 500 }}>{guest.fullName}</td>
                                            <td style={{ color: "var(--text-secondary)" }}>{guest.usn}</td>
                                            <td style={{ color: "var(--text-secondary)" }}>{guest.phoneNumber}</td>
                                            <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {guest.purpose}
                                            </td>
                                            <td style={{ fontSize: "0.85rem" }}>{guest.checkIn}</td>
                                            <td style={{ fontSize: "0.85rem" }}>{guest.checkOut || "-"}</td>
                                            <td>
                                                <span
                                                    className="admin-badge"
                                                    style={{
                                                        background: guest.duration === "Still here" ? "#f3f4f6" : "#f9fafb",
                                                        color: guest.duration === "Still here" ? "#374151" : "#6b7280",
                                                    }}
                                                >
                                                    {guest.duration}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                                {guest.createdAt}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="admin-mobile-only">
                            {filteredGuests.map((guest) => (
                                <div key={guest.id} className="admin-guest-card">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "1rem" }}>{guest.fullName}</div>
                                            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{guest.usn}</div>
                                        </div>
                                        <span
                                            className="admin-badge"
                                            style={{
                                                background: guest.duration === "Still here" ? "#f3f4f6" : "#f9fafb",
                                                color: guest.duration === "Still here" ? "#374151" : "#6b7280",
                                            }}
                                        >
                                            {guest.duration}
                                        </span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
                                            <Phone size={12} /> {guest.phoneNumber}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
                                            <Calendar size={12} /> {guest.createdAt}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", display: "flex", alignItems: "flex-start", gap: "0.25rem", color: "var(--text-secondary)" }}>
                                        <BookOpen size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                                        {guest.purpose}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
