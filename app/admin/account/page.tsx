"use client";

import { useState, useEffect } from "react";
import { getAdminSession, saveAdminSession } from "@/lib/adminSession";
import { doc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { AdminSession } from "@/types";
import { Settings, User, Lock, Save } from "lucide-react";

export default function AdminAccountPage() {
    const [admin, setAdmin] = useState<AdminSession | null>(null);
    const [loading, setLoading] = useState(true);

    // Name change state
    const [name, setName] = useState("");
    const [nameLoading, setNameLoading] = useState(false);
    const [nameMsg, setNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const session = getAdminSession();
        if (session) {
            setAdmin(session);
            setName(session.name);
        }
        setLoading(false);
    }, []);

    const handleNameChange = async () => {
        if (!admin || !name.trim()) return;
        if (name.trim() === admin.name) {
            setNameMsg({ type: "error", text: "Name is the same as before." });
            return;
        }

        setNameLoading(true);
        setNameMsg(null);

        try {
            // Update name in Firestore admins collection
            const adminRef = doc(db, "admins", admin.uid);
            await updateDoc(adminRef, { name: name.trim() });

            // Update local session
            const updatedSession = { ...admin, name: name.trim() };
            saveAdminSession(updatedSession);
            setAdmin(updatedSession);

            setNameMsg({ type: "success", text: "Name updated successfully." });
        } catch (error) {
            console.error("Error updating name:", error);
            setNameMsg({ type: "error", text: "Failed to update name. Please try again." });
        } finally {
            setNameLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPwMsg({ type: "error", text: "All fields are required." });
            return;
        }

        if (newPassword.length < 6) {
            setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPwMsg({ type: "error", text: "New passwords do not match." });
            return;
        }

        setPwLoading(true);
        setPwMsg(null);

        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                setPwMsg({ type: "error", text: "You must be signed in. Please log out and log back in." });
                setPwLoading(false);
                return;
            }

            // Re-authenticate first
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPwMsg({ type: "success", text: "Password updated successfully." });
        } catch (error: unknown) {
            console.error("Error updating password:", error);
            const firebaseErr = error as { code?: string };
            if (firebaseErr.code === "auth/wrong-password" || firebaseErr.code === "auth/invalid-credential") {
                setPwMsg({ type: "error", text: "Current password is incorrect." });
            } else if (firebaseErr.code === "auth/requires-recent-login") {
                setPwMsg({ type: "error", text: "Session expired. Please log out and log back in first." });
            } else {
                setPwMsg({ type: "error", text: "Failed to update password. Please try again." });
            }
        } finally {
            setPwLoading(false);
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
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    <Settings size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
                    Account Settings
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    Manage your admin profile and security
                </p>
            </div>

            {/* Account Info */}
            <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    <User size={18} color="#374151" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Profile</h2>
                </div>

                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem",
                    padding: "1rem", background: "var(--bg-secondary)", borderRadius: "0.75rem",
                    marginBottom: "1.25rem", fontSize: "0.85rem",
                }}>
                    <div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Email</p>
                        <p style={{ fontWeight: 500 }}>{admin?.email}</p>
                    </div>
                    <div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Club</p>
                        <p style={{ fontWeight: 500 }}>{admin?.club}</p>
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="label">Display Name</label>
                    <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={nameLoading}
                        placeholder="Your name"
                    />
                </div>

                {nameMsg && (
                    <div style={{
                        padding: "0.6rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.8rem",
                        marginBottom: "1rem",
                        background: nameMsg.type === "success" ? "#f3f4f6" : "#f3f4f6",
                        border: `1px solid ${nameMsg.type === "success" ? "#d1d5db" : "#d1d5db"}`,
                        color: nameMsg.type === "success" ? "#374151" : "#6b7280",
                    }}>
                        {nameMsg.text}
                    </div>
                )}

                <button
                    onClick={handleNameChange}
                    className="btn btn-primary"
                    style={{ width: "auto", padding: "0.5rem 1.25rem", fontSize: "0.875rem", background: "#374151" }}
                    disabled={nameLoading || !name.trim()}
                >
                    {nameLoading ? (
                        <><span className="spinner" /> Saving...</>
                    ) : (
                        <><Save size={16} /> Update Name</>
                    )}
                </button>
            </div>

            {/* Password Change */}
            <div className="admin-card">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    <Lock size={18} color="#374151" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Change Password</h2>
                </div>

                <div className="form-group">
                    <label className="label">Current Password</label>
                    <input
                        className="input"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={pwLoading}
                        placeholder="Enter current password"
                    />
                </div>

                <div className="form-group">
                    <label className="label">New Password</label>
                    <input
                        className="input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={pwLoading}
                        placeholder="At least 6 characters"
                    />
                </div>

                <div className="form-group">
                    <label className="label">Confirm New Password</label>
                    <input
                        className="input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={pwLoading}
                        placeholder="Re-enter new password"
                    />
                </div>

                {pwMsg && (
                    <div style={{
                        padding: "0.6rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.8rem",
                        marginBottom: "1rem",
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        color: pwMsg.type === "success" ? "#374151" : "#6b7280",
                    }}>
                        {pwMsg.text}
                    </div>
                )}

                <button
                    onClick={handlePasswordChange}
                    className="btn btn-primary"
                    style={{ width: "auto", padding: "0.5rem 1.25rem", fontSize: "0.875rem", background: "#374151" }}
                    disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                >
                    {pwLoading ? (
                        <><span className="spinner" /> Updating...</>
                    ) : (
                        <><Lock size={16} /> Change Password</>
                    )}
                </button>
            </div>
        </div>
    );
}
