"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { db, analytics } from "@/lib/firebase";
import { saveSession } from "@/lib/session";
import { UserPlus } from "lucide-react";

export default function GuestRegistrationPage() {
    const [formData, setFormData] = useState({
        usn: "",
        fullName: "",
        phoneNumber: "",
        purpose: "",
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!formData.usn.trim() || !formData.fullName.trim() || !formData.phoneNumber.trim() || !formData.purpose.trim()) {
            alert("Please fill in all fields");
            return;
        }

        setLoading(true);

        try {
            // Create guest document
            const guestRef = await addDoc(collection(db, "guests"), {
                usn: formData.usn.trim(),
                fullName: formData.fullName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                purpose: formData.purpose.trim(),
                createdAt: serverTimestamp(),
            });

            // Create attendance record
            const attendanceRef = await addDoc(collection(db, "attendance"), {
                userId: guestRef.id,
                type: "guest",
                checkIn: serverTimestamp(),
                checkOut: null,
            });

            // Save session
            saveSession({
                attendanceId: attendanceRef.id,
                userId: guestRef.id,
                type: "guest",
                checkInTime: new Date().toISOString(),
                userName: formData.fullName.trim(),
            });

            // Log analytics event
            if (analytics) {
                logEvent(analytics, "check_in", {
                    type: "guest",
                    method: "registration"
                });
            }

            // Redirect to status page
            router.push("/status");
        } catch (error) {
            console.error("Error registering guest:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <div className="card" style={{ width: "100%" }}>
                <div className="text-center mb-6">
                    <div
                        style={{
                            width: "56px",
                            height: "56px",
                            margin: "0 auto 1rem",
                            background: "#374151",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <UserPlus size={28} color="white" />
                    </div>
                    <h1 style={{ fontSize: "clamp(1.25rem, 5vw, 1.875rem)", fontWeight: "700", marginBottom: "0.5rem" }}>
                        Guest Registration
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
                        Please provide your details to check in
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="usn" className="label">
                            USN
                        </label>
                        <input
                            id="usn"
                            name="usn"
                            type="text"
                            className="input"
                            placeholder="Enter your USN"
                            value={formData.usn}
                            onChange={handleChange}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="fullName" className="label">
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            className="input"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phoneNumber" className="label">
                            Phone Number
                        </label>
                        <input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="tel"
                            className="input"
                            placeholder="Enter your phone number"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="purpose" className="label">
                            Purpose of Visit
                        </label>
                        <textarea
                            id="purpose"
                            name="purpose"
                            className="input"
                            placeholder="Enter the purpose of your visit"
                            value={formData.purpose}
                            onChange={handleChange}
                            disabled={loading}
                            rows={3}
                            style={{ resize: "vertical" }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !formData.usn.trim() || !formData.fullName.trim() || !formData.phoneNumber.trim() || !formData.purpose.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" />
                                Registering...
                            </>
                        ) : (
                            "Register & Check In"
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