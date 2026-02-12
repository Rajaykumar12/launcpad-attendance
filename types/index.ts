export type Club = "SOSC" | "Challengers" | "SRC";

export interface Member {
    serialNumber: string;
    name: string;
    usn: string;
    email?: string;
    phone?: string;
    club: Club;
    joinedAt?: Date;
}

export interface Guest {
    id?: string;
    usn: string;
    fullName: string;
    phoneNumber: string;
    purpose: string;
    createdAt?: Date;
}

export interface AttendanceRecord {
    id?: string;
    userId: string;
    type: "member" | "guest";
    checkIn: Date;
    checkOut: Date | null;
    userName?: string;
    club?: Club;
}

export interface SessionData {
    attendanceId: string;
    userId: string;
    type: "member" | "guest";
    checkInTime: string;
    userName?: string;
}

export interface AdminUser {
    uid: string;
    email: string;
    name: string;
    club: Club;
}

export interface AdminSession {
    uid: string;
    email: string;
    name: string;
    club: Club;
}

export interface MemberWithAttendance extends Member {
    totalCheckIns: number;
    lastCheckIn?: Date;
    totalHours: number;
    attendanceRecords: AttendanceRecord[];
}

export interface ClubStats {
    club: Club;
    totalMembers: number;
    totalCheckIns: number;
    activeToday: number;
    averageHoursPerMember: number;
}
