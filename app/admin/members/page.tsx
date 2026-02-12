"use client";

import { useEffect, useState, Fragment } from "react";
import { getAdminSession } from "@/lib/adminSession";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminSession, Club } from "@/types";
import { Users, Search, Filter, ChevronDown, ChevronUp, Plus, X, Trash2 } from "lucide-react";

interface MemberRow {
    id: string;
    name: string;
    usn: string;
    email: string;
    phone: string;
    club: Club;
    totalCheckIns: number;
    totalHours: number;
    lastCheckIn: string;
    isActive: boolean;
}

interface AttendanceDetail {
    id: string;
    checkIn: string;
    checkOut: string | null;
    duration: string;
}

export default function AdminMembersPage() {
    const [admin, setAdmin] = useState<AdminSession | null>(null);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<MemberRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
    const [loading, setLoading] = useState(true);
    const [expandedMember, setExpandedMember] = useState<string | null>(null);
    const [attendanceDetails, setAttendanceDetails] = useState<Record<string, AttendanceDetail[]>>({});
    const [detailLoading, setDetailLoading] = useState<string | null>(null);

    // Add Member modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ usn: "", name: "", email: "", phone: "" });
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState("");

    useEffect(() => {
        const session = getAdminSession();
        if (session) {
            setAdmin(session);
            fetchMembers(session);
        }
    }, []);

    useEffect(() => {
        let filtered = members;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (m) =>
                    m.name.toLowerCase().includes(q) ||
                    m.usn.toLowerCase().includes(q) ||
                    m.email.toLowerCase().includes(q)
            );
        }
        if (filterStatus === "active") {
            filtered = filtered.filter((m) => m.isActive);
        } else if (filterStatus === "inactive") {
            filtered = filtered.filter((m) => !m.isActive);
        }
        setFilteredMembers(filtered);
    }, [searchQuery, filterStatus, members]);

    const fetchMembers = async (session: AdminSession) => {
        try {
            const membersQuery = query(
                collection(db, "members"),
                where("club", "==", session.club)
            );
            const membersSnap = await getDocs(membersQuery);

            const memberList: MemberRow[] = [];

            for (const memberDoc of membersSnap.docs) {
                const data = memberDoc.data();
                const memberId = memberDoc.id;

                // Fetch attendance for this member
                const attendanceQuery = query(
                    collection(db, "attendance"),
                    where("userId", "==", memberId),
                    where("type", "==", "member")
                );
                const attendanceSnap = await getDocs(attendanceQuery);

                let totalHours = 0;
                let lastCheckIn = "";
                let isActive = false;

                attendanceSnap.docs.forEach((aDoc) => {
                    const aData = aDoc.data();
                    const checkIn = aData.checkIn?.toDate?.();
                    const checkOut = aData.checkOut?.toDate?.();

                    if (checkIn && checkOut) {
                        totalHours += (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                    }
                    if (checkIn && (!lastCheckIn || checkIn > new Date(lastCheckIn))) {
                        lastCheckIn = checkIn.toISOString();
                    }
                    if (!aData.checkOut) {
                        isActive = true;
                    }
                });

                memberList.push({
                    id: memberId,
                    name: data.name || "Unknown",
                    usn: data.usn || memberId,
                    email: data.email || "-",
                    phone: data.phone || "-",
                    club: data.club,
                    totalCheckIns: attendanceSnap.size,
                    totalHours: Math.round(totalHours * 10) / 10,
                    lastCheckIn: lastCheckIn
                        ? new Date(lastCheckIn).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })
                        : "Never",
                    isActive,
                });
            }

            // Sort by name
            memberList.sort((a, b) => a.name.localeCompare(b.name));
            setMembers(memberList);
            setFilteredMembers(memberList);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceDetails = async (memberId: string) => {
        if (attendanceDetails[memberId]) {
            setExpandedMember(expandedMember === memberId ? null : memberId);
            return;
        }

        setDetailLoading(memberId);
        try {
            const attendanceQuery = query(
                collection(db, "attendance"),
                where("userId", "==", memberId),
                where("type", "==", "member"),
                orderBy("checkIn", "desc")
            );
            const attendanceSnap = await getDocs(attendanceQuery);

            const details: AttendanceDetail[] = attendanceSnap.docs.map((doc) => {
                const data = doc.data();
                const checkIn = data.checkIn?.toDate?.();
                const checkOut = data.checkOut?.toDate?.();

                let duration = "Active";
                if (checkIn && checkOut) {
                    const diffMs = checkOut.getTime() - checkIn.getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${hours}h ${mins}m`;
                }

                return {
                    id: doc.id,
                    checkIn: checkIn
                        ? checkIn.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "-",
                    checkOut: checkOut
                        ? checkOut.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : null,
                    duration,
                };
            });

            setAttendanceDetails((prev) => ({ ...prev, [memberId]: details }));
            setExpandedMember(memberId);
        } catch (error) {
            console.error("Error fetching attendance details:", error);
        } finally {
            setDetailLoading(null);
        }
    };

    const handleAddMember = async () => {
        if (!admin || !addForm.usn.trim() || !addForm.name.trim()) {
            setAddError("USN and Name are required.");
            return;
        }

        setAddLoading(true);
        setAddError("");

        try {
            // Use USN as the document ID so check-in page can find them
            const memberRef = doc(db, "members", addForm.usn.trim());
            await setDoc(memberRef, {
                name: addForm.name.trim(),
                usn: addForm.usn.trim(),
                email: addForm.email.trim() || "",
                phone: addForm.phone.trim() || "",
                club: admin.club,
                joinedAt: serverTimestamp(),
            });

            // Reset form & close modal
            setAddForm({ usn: "", name: "", email: "", phone: "" });
            setShowAddModal(false);

            // Refresh members list
            fetchMembers(admin);
        } catch (error) {
            console.error("Error adding member:", error);
            setAddError("Failed to add member. The USN might already exist.");
        } finally {
            setAddLoading(false);
        }
    };

    const handleDeleteMember = async (memberId: string, memberName: string) => {
        if (!admin) return;
        if (!confirm(`Are you sure you want to remove ${memberName} from ${admin.club}?`)) return;

        try {
            await deleteDoc(doc(db, "members", memberId));
            fetchMembers(admin);
        } catch (error) {
            console.error("Error deleting member:", error);
            alert("Failed to delete member.");
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
            <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                        <Users size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
                        {admin?.club} Members
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        View and manage member attendance for {admin?.club}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                    style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.875rem", background: "#374151" }}
                >
                    <Plus size={18} />
                    Add Member
                </button>
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
                <>
                    <div className="admin-overlay" style={{ display: "block" }} onClick={() => setShowAddModal(false)} />
                    <div style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                        background: "var(--bg-card)", borderRadius: "0.75rem", padding: "1.5rem",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", zIndex: 60, width: "90%", maxWidth: 440,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Add Member to {admin?.club}</h2>
                            <button onClick={() => { setShowAddModal(false); setAddError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <X size={20} />
                            </button>
                        </div>

                        {addError && (
                            <div style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "1rem", color: "#374151", fontSize: "0.8rem" }}>
                                {addError}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="label">USN *</label>
                            <input className="input" placeholder="e.g. 4SO21CS001" value={addForm.usn}
                                onChange={(e) => setAddForm({ ...addForm, usn: e.target.value })} disabled={addLoading} />
                        </div>
                        <div className="form-group">
                            <label className="label">Full Name *</label>
                            <input className="input" placeholder="e.g. John Doe" value={addForm.name}
                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} disabled={addLoading} />
                        </div>
                        <div className="form-group">
                            <label className="label">Email</label>
                            <input className="input" type="email" placeholder="e.g. john@example.com" value={addForm.email}
                                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} disabled={addLoading} />
                        </div>
                        <div className="form-group">
                            <label className="label">Phone</label>
                            <input className="input" type="tel" placeholder="e.g. 9876543210" value={addForm.phone}
                                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} disabled={addLoading} />
                        </div>

                        <button onClick={handleAddMember} className="btn btn-primary" style={{ background: "#374151" }} disabled={addLoading || !addForm.usn.trim() || !addForm.name.trim()}>
                            {addLoading ? (<><span className="spinner" /> Adding...</>) : (<><Plus size={18} /> Add Member</>)}
                        </button>
                    </div>
                </>
            )}

            {/* Filters */}
            <div className="admin-filters">
                <div className="admin-search-box">
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by name, USN, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
                <div className="admin-filter-group">
                    <Filter size={16} color="var(--text-muted)" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
                        className="admin-select"
                    >
                        <option value="all">All Members</option>
                        <option value="active">Active Now</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Summary */}
            <div className="admin-summary-bar">
                <span>
                    Showing <strong>{filteredMembers.length}</strong> of {members.length} members
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                    {members.filter((m) => m.isActive).length} currently active
                </span>
            </div>

            {/* Members Table */}
            <div className="admin-card">
                {filteredMembers.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", textAlign: "center", padding: "3rem" }}>
                        {searchQuery ? "No members match your search" : "No members found for this club"}
                    </p>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>USN</th>
                                    <th>Check-ins</th>
                                    <th>Total Hours</th>
                                    <th>Last Check-in</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.map((member) => (
                                    <Fragment key={member.id}>
                                        <tr
                                            style={{ cursor: "pointer" }}
                                            onClick={() => fetchAttendanceDetails(member.id)}
                                        >
                                            <td style={{ fontWeight: 500 }}>{member.name}</td>
                                            <td style={{ color: "var(--text-secondary)" }}>{member.usn}</td>
                                            <td>{member.totalCheckIns}</td>
                                            <td>{member.totalHours}h</td>
                                            <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                                {member.lastCheckIn}
                                            </td>
                                            <td>
                                                <span
                                                    className="admin-badge"
                                                    style={{
                                                        background: member.isActive ? "#f3f4f6" : "#f9fafb",
                                                        color: member.isActive ? "#374151" : "#9ca3af",
                                                    }}
                                                >
                                                    {member.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteMember(member.id, member.name); }}
                                                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem" }}
                                                        title="Remove member"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    {detailLoading === member.id ? (
                                                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                                    ) : expandedMember === member.id ? (
                                                        <ChevronUp size={16} color="var(--text-muted)" />
                                                    ) : (
                                                        <ChevronDown size={16} color="var(--text-muted)" />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedMember === member.id && attendanceDetails[member.id] && (
                                            <tr key={`${member.id}-detail`}>
                                                <td colSpan={7} style={{ padding: 0 }}>
                                                    <div className="admin-detail-panel">
                                                        <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.85rem" }}>
                                                            <div><strong>Email:</strong> {member.email}</div>
                                                            <div><strong>Phone:</strong> {member.phone}</div>
                                                        </div>
                                                        <div style={{ padding: "0 1rem 1rem" }}>
                                                            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                                                                Attendance History
                                                            </h4>
                                                            {attendanceDetails[member.id].length === 0 ? (
                                                                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                                                    No attendance records
                                                                </p>
                                                            ) : (
                                                                <div className="admin-table-wrapper">
                                                                    <table className="admin-table admin-table-sm">
                                                                        <thead>
                                                                            <tr>
                                                                                <th>Check In</th>
                                                                                <th>Check Out</th>
                                                                                <th>Duration</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {attendanceDetails[member.id].map((record) => (
                                                                                <tr key={record.id}>
                                                                                    <td>{record.checkIn}</td>
                                                                                    <td>{record.checkOut || "Still Active"}</td>
                                                                                    <td>
                                                                                        <span
                                                                                            className="admin-badge"
                                                                                            style={{
                                                                                                background: record.duration === "Active" ? "#f3f4f6" : "#f9fafb",
                                                                                                color: record.duration === "Active" ? "#374151" : "#6b7280",
                                                                                            }}
                                                                                        >
                                                                                            {record.duration}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
