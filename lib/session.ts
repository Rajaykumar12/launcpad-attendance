import { SessionData } from "@/types";

const SESSION_KEY = "attendance_session";

export function saveSession(data: SessionData): void {
    if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }
}

export function getSession(): SessionData | null {
    if (typeof window !== "undefined") {
        const data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    }
    return null;
}

export function clearSession(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
    }
}
