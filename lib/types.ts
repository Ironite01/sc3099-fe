export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'student' | 'instructor' | 'admin';
    face_enrolled: boolean;
}

export interface RegisterPayload {
    email: string;
    password: string;
    full_name: string;
    role?: string;
}

export interface Course {
    id: string;
    code: string;
    name: string;
    // Backend fields
    semester?: string;
    is_active?: boolean;
    venue_name?: string | null;
    venue_latitude?: number | null;
    venue_longitude?: number | null;
    geofence_radius_meters?: number | null;
    enrolled_at?: string;
    // Mock / legacy-only fields (not returned by real API)
    instructor?: string;
    schedule?: string;
    status?: 'pending' | 'approved' | 'rejected';
}

export interface Session {
    id: string;
    course_id: string;
    course_code: string;
    name: string;
    session_type?: 'lecture' | 'tutorial' | 'lab' | 'other';
    status: 'scheduled' | 'active' | 'closed' | 'cancelled';
    scheduled_start: string;
    scheduled_end: string;
    checkin_opens_at: string;
    checkin_closes_at: string;
    venue_name: string | null;
    venue_latitude?: number | null;
    venue_longitude?: number | null;
    geofence_radius_meters?: number | null;
    require_liveness_check?: boolean;
    require_face_match?: boolean;
}

export interface AttendancePayload {
    session_id: string;
    face_image: string;
    location: GeolocationCoords;
    liveness_token: string;
    liveness_challenge_type?: 'passive' | 'blink' | 'head_turn';
    device_fingerprint: string;
    qr_code?: string;
}

export interface GeolocationCoords {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export type CheckinStatus = 'pending' | 'approved' | 'flagged' | 'rejected' | 'appealed';

export interface AttendanceResult {
    id: string;
    session_id: string;
    student_id: string;
    status: CheckinStatus;
    checked_in_at: string;
    latitude: number;
    longitude: number;
    distance_from_venue_meters: number;
    liveness_passed: boolean;
    liveness_score: number | null;
    risk_score: number | null;
    risk_factors: Record<string, any>[];
}

export interface StudentCheckin {
    id: string;
    session_id: string;
    session_name: string;
    course_id: string;
    course_code: string;
    course_name: string;
    status: CheckinStatus;
    checked_in_at: string;
    risk_score: number | null;
}

export interface LivenessChallenge {
    type: 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'nod';
    instruction: string;
    duration: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    status?: number;
}

export interface DeviceRecord {
    id: string;
    device_fingerprint?: string;
    device_name: string | null;
    platform: string | null;
    is_trusted: boolean;
    trust_score: 'low' | 'medium' | 'high';
    is_active: boolean;
    first_seen_at: string;
    last_seen_at: string;
    total_checkins: number;
}
