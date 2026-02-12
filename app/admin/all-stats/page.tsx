"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession } from "@/lib/adminSession";
import {
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminSession, Club } from "@/types";
import { BarChart3, Users, TrendingUp, Clock, Award } from "lucide-react";

interface ClubStatsData {
    club: Club;
    totalMembers: number;
    totalCheckIns: number;
    activeToday: number;
    activeNow: number;
    totalHours: number;
    avgHoursPerMember: number;
    topMembers: { name: string; usn: string; checkIns: number; hours: number }[];
}

const CLUBS: Club[] = ["SOSC", "Challengers", "SRC"];

const clubColors: Record<string, { primary: string; bg: string }> = {
    SOSC: { primary: "#374151", bg: "#f3f4f6" },
    Challengers: { primary: "#4b5563", bg: "#f3f4f6" },
    SRC: { primary: "#6b7280", bg: "#f3f4f6" },
};

export default function AllClubStatsPage() {
    const [admin, setAdmin] = useState<AdminSession | null>(null);
    const [clubStats, setClubStats] = useState<ClubStatsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClub, setSelectedClub] = useState<Club | "all">("all");
    const router = useRouter();

    useEffect(() => {
        const session = getAdminSession();
        if (!session) return;

        // Only SOSC admins can access this page
        if (session.club !== "SOSC") {
            router.push("/admin");
            return;
        }

        setAdmin(session);
        fetchAllClubStats();
    }, [router]);

    const fetchAllClubStats = async () => {
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const allStats: ClubStatsData[] = [];

            for (const club of CLUBS) {
                const membersQuery = query(
                    collection(db, "members"),
                    where("club", "==", club)
                );
                const membersSnap = await getDocs(membersQuery);
                const memberIds = membersSnap.docs.map((d) => d.id);
                const memberNames: Record<string, { name: string; usn: string }> = {};
                membersSnap.docs.forEach((d) => {
                    const data = d.data();
                    memberNames[d.id] = { name: data.name || "Unknown", usn: data.usn || d.id };
                });

                let totalCheckIns = 0;
                let activeToday = 0;
                let activeNow = 0;
                let totalHours = 0;
                const memberCheckIns: Record<string, { count: number; hours: number }> = {};

                if (memberIds.length > 0) {
                    const batches = [];
                    for (let i = 0; i < memberIds.length; i += 30) {
                        batches.push(memberIds.slice(i, i + 30));
                    }

                    for (const batch of batches) {
                        const allAttendanceQuery = query(
                            collection(db, "attendance"),
                            where("userId", "in", batch),
                            where("type", "==", "member")
                        );
                        const allAttendanceSnap = await getDocs(allAttendanceQuery);

                        allAttendanceSnap.docs.forEach((doc) => {
                            const data = doc.data();
                            totalCheckIns++;

                            const checkIn = data.checkIn?.toDate?.();
                            const checkOut = data.checkOut?.toDate?.();

                            if (!memberCheckIns[data.userId]) {
                                memberCheckIns[data.userId] = { count: 0, hours: 0 };
                            }
                            memberCheckIns[data.userId].count++;

                            if (checkIn && checkOut) {
                                const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                                totalHours += hours;
                                memberCheckIns[data.userId].hours += hours;
                            }

                            if (!data.checkOut) {
                                activeNow++;
                            }

                            if (checkIn && checkIn >= todayStart) {
                                activeToday++;
                            }
                        });
                    }
                }

                const topMembers = Object.entries(memberCheckIns)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
                    .map(([id, stats]) => ({
                        name: memberNames[id]?.name || "Unknown",
                        usn: memberNames[id]?.usn || id,
                        checkIns: stats.count,
                        hours: Math.round(stats.hours * 10) / 10,
                    }));

                allStats.push({
                    club,
                    totalMembers: membersSnap.size,
                    totalCheckIns,
                    activeToday,
                    activeNow,
                    totalHours: Math.round(totalHours * 10) / 10,
                    avgHoursPerMember: membersSnap.size > 0
                        ? Math.round((totalHours / membersSnap.size) * 10) / 10
                        : 0,
                    topMembers,
                });
            }

            setClubStats(allStats);
        } catch (error) {
            console.error("Error fetching club stats:", error);
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

    if (admin?.club !== "SOSC") return null;

    const displayedStats = selectedClub === "all"
        ? clubStats
        : clubStats.filter((s) => s.club === selectedClub);

    const totals = clubStats.reduce(
        (acc, s) => ({
            members: acc.members + s.totalMembers,
            checkIns: acc.checkIns + s.totalCheckIns,
            activeNow: acc.activeNow + s.activeNow,
            hours: acc.hours + s.totalHours,
        }),
        { members: 0, checkIns: 0, activeNow: 0, hours: 0 }
    );

    return (
        <div>
            <div style={{ marginBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    <BarChart3 size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
                    All Club Statistics
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    Overview of all club members and attendance — SOSC Admin exclusive
                </p>
            </div>

            {/* Overall Stats */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Total Members (All Clubs)</p>
                            <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totals.members}</p>
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Users size={24} color="#374151" />
                        </div>
                    </div>
                </div>
                <div className="admin-stat-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Total Check-ins</p>
                            <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totals.checkIns}</p>
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <TrendingUp size={24} color="#4b5563" />
                        </div>
                    </div>
                </div>
                <div className="admin-stat-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Active Now</p>
                            <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totals.activeNow}</p>
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Clock size={24} color="#6b7280" />
                        </div>
                    </div>
                </div>
                <div className="admin-stat-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Total Hours Logged</p>
                            <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totals.hours}h</p>
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Award size={24} color="#374151" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Club Filter */}
            <div style={{ margin: "1.5rem 0 1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                    onClick={() => setSelectedClub("all")}
                    className={`admin-filter-btn ${selectedClub === "all" ? "active" : ""}`}
                >
                    All Clubs
                </button>
                {CLUBS.map((club) => (
                    <button
                        key={club}
                        onClick={() => setSelectedClub(club)}
                        className={`admin-filter-btn ${selectedClub === club ? "active" : ""}`}
                        style={
                            selectedClub === club
                                ? { background: clubColors[club].primary, borderColor: clubColors[club].primary }
                                : {}
                        }
                    >
                        {club}
                    </button>
                ))}
            </div>

            {/* Per-Club Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {displayedStats.map((stat) => {
                    const cc = clubColors[stat.club];
                    return (
                        <div key={stat.club} className="admin-card">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                                <div
                                    style={{
                                        width: 36, height: 36, borderRadius: "0.5rem",
                                        background: cc.bg, display: "flex", alignItems: "center",
                                        justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: cc.primary,
                                    }}
                                >
                                    {stat.club.charAt(0)}
                                </div>
                                <h3 style={{ fontWeight: 600, fontSize: "1.1rem" }}>{stat.club}</h3>
                            </div>

                            <div
                                style={{
                                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                                    gap: "1rem", marginBottom: "1.25rem", padding: "1rem",
                                    background: "var(--bg-secondary)", borderRadius: "0.75rem",
                                }}
                            >
                                <div>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Members</p>
                                    <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stat.totalMembers}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Check-ins</p>
                                    <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stat.totalCheckIns}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Now</p>
                                    <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stat.activeNow}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Hours</p>
                                    <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stat.totalHours}h</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Avg Hrs/Member</p>
                                    <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stat.avgHoursPerMember}h</p>
                                </div>
                            </div>

                            {stat.topMembers.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <Award size={16} color={cc.primary} />
                                        Top Members
                                    </h4>
                                    <div className="admin-table-wrapper">
                                        <table className="admin-table admin-table-sm">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th>USN</th>
                                                    <th>Check-ins</th>
                                                    <th>Hours</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stat.topMembers.map((member, idx) => (
                                                    <tr key={member.usn}>
                                                        <td>
                                                            <span
                                                                style={{
                                                                    width: 24, height: 24, display: "inline-flex",
                                                                    alignItems: "center", justifyContent: "center",
                                                                    borderRadius: "50%",
                                                                    background: idx < 3 ? cc.bg : "#f9fafb",
                                                                    color: idx < 3 ? cc.primary : "var(--text-muted)",
                                                                    fontSize: "0.75rem", fontWeight: 700,
                                                                }}
                                                            >
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontWeight: 500 }}>{member.name}</td>
                                                        <td style={{ color: "var(--text-secondary)" }}>{member.usn}</td>
                                                        <td>{member.checkIns}</td>
                                                        <td>{member.hours}h</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
