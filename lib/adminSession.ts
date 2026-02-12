import { AdminSession } from "@/types";

const ADMIN_SESSION_KEY = "admin_session";

export function saveAdminSession(data: AdminSession): void {
    if (typeof window !== "undefined") {
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(data));
    }
}

export function getAdminSession(): AdminSession | null {
    if (typeof window !== "undefined") {
        const data = localStorage.getItem(ADMIN_SESSION_KEY);
        return data ? JSON.parse(data) : null;
    }
    return null;
}

export function clearAdminSession(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem(ADMIN_SESSION_KEY);
    }
}
