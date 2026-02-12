"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { saveAdminSession } from "@/lib/adminSession";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password.trim()) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);

        try {
            // Authenticate with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            // Check if user is an admin in Firestore
            const adminRef = doc(db, "admins", user.uid);
            const adminSnap = await getDoc(adminRef);

            if (!adminSnap.exists()) {
                setError("You are not authorized as an admin. Make sure the Firestore admins document ID matches your UID: " + user.uid);
                setLoading(false);
                return;
            }

            const adminData = adminSnap.data();

            // Save admin session
            saveAdminSession({
                uid: user.uid,
                email: user.email || email.trim(),
                name: adminData.name,
                club: adminData.club,
            });

            // Redirect to admin dashboard
            router.push("/admin");
        } catch (err: unknown) {
            console.error("Login error:", err);
            setError("Wrong credentials. Please try again.");
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
                            background: "#374151",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Shield size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                        Admin Login
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
                        Sign in to manage attendance
                    </p>
                </div>

                {error && (
                    <div
                        style={{
                            background: "#f3f4f6",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.5rem",
                            padding: "0.75rem 1rem",
                            marginBottom: "1.5rem",
                            color: "#374151",
                            fontSize: "0.875rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email" className="label">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="label">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ background: "#374151" }}
                        disabled={loading || !email.trim() || !password.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <Shield size={20} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center mt-4">
                    <a
                        href="/"
                        style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}
                    >
                        ← Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
}
