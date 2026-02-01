import type { Course } from './types';

export const MOCK_ENROLLED_COURSES: Course[] = [
    {
        id: '1',
        code: 'CS3099',
        name: 'Secure Attendance System Project',
        instructor: 'Dr. Ironite',
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

export const USE_MOCK_DATA = true;
