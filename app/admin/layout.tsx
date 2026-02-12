"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAdminSession, clearAdminSession } from "@/lib/adminSession";
import { AdminSession } from "@/types";
import {
    LayoutDashboard,
    Users,
    UserCheck,
    BarChart3,
    LogOut,
    Shield,
    Menu,
    X,
    Settings,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [admin, setAdmin] = useState<AdminSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Don't apply layout to login page
    const isLoginPage = pathname === "/admin/login";

    useEffect(() => {
        if (isLoginPage) {
            setLoading(false);
            return;
        }

        const session = getAdminSession();
        if (!session) {
            router.push("/admin/login");
        } else {
            setAdmin(session);
        }
        setLoading(false);
    }, [router, isLoginPage]);

    const handleLogout = () => {
        clearAdminSession();
        router.push("/admin/login");
    };

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            </div>
        );
    }

    if (!admin) return null;

    const clubColors: Record<string, string> = {
        SOSC: "#374151",
        Challengers: "#4b5563",
        SRC: "#6b7280",
    };

    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/members", label: "Members", icon: Users },
        { href: "/admin/guests", label: "Guests", icon: UserCheck },
        { href: "/admin/stats", label: "Club Stats", icon: BarChart3 },
        { href: "/admin/account", label: "Account", icon: Settings },
    ];

    // SOSC gets extra all-clubs overview page
    if (admin.club === "SOSC") {
        navItems.push({ href: "/admin/all-stats", label: "All Club Stats", icon: BarChart3 });
    }

    return (
        <div className="admin-wrapper">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="admin-sidebar-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "0.5rem",
                                background: clubColors[admin.club] || "#6366f1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Shield size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{admin.club}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Admin Panel</div>
                        </div>
                    </div>
                    <button
                        className="admin-sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="admin-nav">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                className={`admin-nav-item ${isActive ? "active" : ""}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </a>
                        );
                    })}
                </nav>

                <div className="admin-sidebar-footer">
                    <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{admin.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{admin.email}</div>
                    </div>
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-main">
                <header className="admin-header">
                    <button className="admin-menu-btn" onClick={() => setSidebarOpen(true)}>
                        <Menu size={20} />
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                            className="admin-club-badge"
                            style={{ background: clubColors[admin.club] || "#6366f1" }}
                        >
                            {admin.club}
                        </span>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                            {admin.name}
                        </span>
                    </div>
                </header>

                <div className="admin-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
