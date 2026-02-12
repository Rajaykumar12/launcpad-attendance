export interface Member {
    serialNumber: string;
    // Add other member fields as needed
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
}

export interface SessionData {
    attendanceId: string;
    userId: string;
    type: "member" | "guest";
    checkInTime: string;
    userName?: string;
}
