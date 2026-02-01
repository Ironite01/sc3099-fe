export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'student' | 'instructor' | 'admin';
    face_enrolled: boolean;
}

export interface Course {
    id: string;
    code: string;
    name: string;
    instructor: string;
    schedule: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface AttendancePayload {
    course_id: string;
    face_image: string;
    location: GeolocationCoords;
    liveness_token: string;
}

export interface GeolocationCoords {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export interface AttendanceResult {
    success: boolean;
    message: string;
    timestamp: string;
    course_name?: string;
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
