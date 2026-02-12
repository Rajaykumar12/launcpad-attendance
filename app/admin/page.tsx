"use client";

import { useEffect, useState } from "react";
import { getAdminSession } from "@/lib/adminSession";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminSession } from "@/types";
import { Users, UserCheck, Clock, TrendingUp } from "lucide-react";

interface DashboardStats {
    totalMembers: number;
    todayCheckIns: number;
    activeNow: number;
    totalGuests: number;
}

export default function AdminDashboardPage() {
    const [admin, setAdmin] = useState<AdminSession | null>(null);
    const [stats, setStats] = useState<DashboardStats>({
        totalMembers: 0,
        todayCheckIns: 0,
        activeNow: 0,
        totalGuests: 0,
    });
    const [recentActivity, setRecentActivity] = useState<
        { id: string; name: string; type: string; time: string; action: string }[]
    >([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = getAdminSession();
        if (session) {
            setAdmin(session);
            fetchDashboardData(session);
        }
    }, []);

    const fetchDashboardData = async (session: AdminSession) => {
        try {
            // Fetch members for this club
            const membersQuery = query(
                collection(db, "members"),
                where("club", "==", session.club)
            );
            const membersSnap = await getDocs(membersQuery);
            const totalMembers = membersSnap.size;

            // Get member IDs for this club
            const memberIds = membersSnap.docs.map((doc) => doc.id);

            // Today's start
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayTimestamp = Timestamp.fromDate(todayStart);

            // Fetch today's attendance for club members
            let todayCheckIns = 0;
            let activeNow = 0;

            if (memberIds.length > 0) {
                // Firestore 'in' queries support max 30 values, batch if needed
                const batches = [];
                for (let i = 0; i < memberIds.length; i += 30) {
                    batches.push(memberIds.slice(i, i + 30));
                }

                for (const batch of batches) {
                    const attendanceQuery = query(
                        collection(db, "attendance"),
                        where("userId", "in", batch),
                        where("type", "==", "member"),
                        where("checkIn", ">=", todayTimestamp)
                    );
                    const attendanceSnap = await getDocs(attendanceQuery);

                    todayCheckIns += attendanceSnap.size;
                    attendanceSnap.docs.forEach((doc) => {
                        const data = doc.data();
                        if (!data.checkOut) {
                            activeNow++;
                        }
                    });
                }
            }

            // Fetch total guests
            const guestsSnap = await getDocs(collection(db, "guests"));
            const totalGuests = guestsSnap.size;

            setStats({
                totalMembers,
                todayCheckIns,
                activeNow,
                totalGuests,
            });

            // Fetch recent attendance activity
            const recentQuery = query(
                collection(db, "attendance"),
                orderBy("checkIn", "desc")
            );
            const recentSnap = await getDocs(recentQuery);
            const recent = recentSnap.docs.slice(0, 10).map((doc) => {
                const data = doc.data();
                const checkIn = data.checkIn?.toDate?.() || new Date();
                return {
                    id: doc.id,
                    name: data.userId || "Unknown",
                    type: data.type || "member",
                    time: checkIn.toLocaleString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                    }),
                    action: data.checkOut ? "Checked Out" : "Checked In",
                };
            });
            setRecentActivity(recent);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
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

    const statCards = [
        {
            label: "Total Members",
            value: stats.totalMembers,
            icon: Users,
            color: "#374151",
            bg: "#f3f4f6",
        },
        {
            label: "Today's Check-ins",
            value: stats.todayCheckIns,
            icon: TrendingUp,
            color: "#4b5563",
            bg: "#f3f4f6",
        },
        {
            label: "Active Now",
            value: stats.activeNow,
            icon: Clock,
            color: "#6b7280",
            bg: "#f9fafb",
        },
        {
            label: "Total Guests",
            value: stats.totalGuests,
            icon: UserCheck,
            color: "#374151",
            bg: "#f3f4f6",
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Welcome back, {admin?.name}
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {admin?.club} Club Dashboard
                </p>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
                {statCards.map((card) => (
                    <div key={card.label} className="admin-stat-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                                    {card.label}
                                </p>
                                <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{card.value}</p>
                            </div>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: "0.75rem",
                                    background: card.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <card.icon size={24} color={card.color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="admin-card" style={{ marginTop: "2rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
                    Recent Activity
                </h2>
                {recentActivity.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", textAlign: "center", padding: "2rem" }}>
                        No recent activity
                    </p>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentActivity.map((activity) => (
                                    <tr key={activity.id}>
                                        <td style={{ fontWeight: 500 }}>{activity.name}</td>
                                        <td>
                                            <span
                                                className="admin-badge"
                                                style={{
                                                    background: activity.type === "member" ? "#f3f4f6" : "#f9fafb",
                                                    color: activity.type === "member" ? "#374151" : "#6b7280",
                                                }}
                                            >
                                                {activity.type}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="admin-badge"
                                                style={{
                                                    background: activity.action === "Checked In" ? "#f3f4f6" : "#f9fafb",
                                                    color: activity.action === "Checked In" ? "#374151" : "#6b7280",
                                                }}
                                            >
                                                {activity.action}
                                            </span>
                                        </td>
                                        <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                            {activity.time}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
