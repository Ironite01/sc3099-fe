import type { Course, Session, User } from './types';

export const MOCK_USER: User = {
    id: 'mock-student-1',
    email: 'student@example.com',
    full_name: 'Alex Student',
    role: 'student',
    face_enrolled: true,
};

export const MOCK_ENROLLED_COURSES: Course[] = [
    {
        id: '1',
        code: 'CS3099',
        name: 'Secure Attendance System Project',
        instructor: 'Dr. Wilson',
        schedule: 'Mon & Wed 2:00 PM',
        status: 'approved',
    },
    {
        id: '2',
        code: 'CS2030',
        name: 'Programming Methodology II',
        instructor: 'Prof. Tan',
        schedule: 'Tue & Thu 10:00 AM',
        status: 'approved',
    },
    {
        id: '3',
        code: 'CS2040',
        name: 'Data Structures and Algorithms',
        instructor: 'Dr. Lee',
        schedule: 'Wed & Fri 4:00 PM',
        status: 'pending',
    },
];

export const MOCK_AVAILABLE_COURSES: Course[] = [
    {
        id: '4',
        code: 'CS3230',
        name: 'Design and Analysis of Algorithms',
        instructor: 'Prof. Halim',
        schedule: 'Mon & Thu 12:00 PM',
        status: 'approved',
    },
    {
        id: '5',
        code: 'CS3244',
        name: 'Machine Learning',
        instructor: 'Dr. Ooi',
        schedule: 'Tue & Fri 2:00 PM',
        status: 'approved',
    },
    {
        id: '6',
        code: 'CS4248',
        name: 'Natural Language Processing',
        instructor: 'Prof. Kan',
        schedule: 'Wed 10:00 AM',
        status: 'approved',
    },
    {
        id: '7',
        code: 'CS3216',
        name: 'Software Product Engineering',
        instructor: 'Prof. Damith',
        schedule: 'Mon 6:00 PM',
        status: 'approved',
    },
];

export const USE_MOCK_DATA = false;

export const MOCK_ACTIVE_SESSIONS: Session[] = [
    {
        id: 'session-1',
        course_id: '1',
        course_code: 'CS3099',
        name: 'Week 10 Lecture',
        session_type: 'lecture',
        status: 'active',
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        checkin_opens_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        checkin_closes_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        venue_name: '108B Canberra Walk',
        venue_latitude: 1.4484446067128445,
        venue_longitude: 103.83203408153204,
        geofence_radius_meters: 100,
        require_liveness_check: true,
        require_face_match: true,
    },
    {
        id: 'session-2',
        course_id: '2',
        course_code: 'CS2030',
        name: 'Week 10 Tutorial',
        session_type: 'tutorial',
        status: 'active',
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        checkin_opens_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        checkin_closes_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        venue_name: '108B Canberra Walk',
        venue_latitude: 1.4484446067128445,
        venue_longitude: 103.83203408153204,
        geofence_radius_meters: 100,
        require_liveness_check: true,
        require_face_match: false,
    },
];
