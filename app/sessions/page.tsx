'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getEnrolledCourses, getCurrentUser } from '@/lib/api';

interface Course {
    id: string;
    course_code: string;
    course_name: string;
    enrolled_at: string;
}

export default function SessionsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError('');

        // Check authentication
        const userResult = await getCurrentUser();
        if (!userResult.success) {
            router.push('/login');
            return;
        }

        // Load enrolled courses
        const coursesResult = await getEnrolledCourses();
        if (coursesResult.success && coursesResult.data) {
            setCourses(coursesResult.data);
        } else {
            setError(coursesResult.error || 'Failed to load courses');
        }

        setIsLoading(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <main className="sessions-page">
                <div className="loading-screen">
                    <div className="spinner large"></div>
                    <p>Loading courses...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="sessions-page">
            {/* Header */}
            <header className="page-header">
                <button onClick={() => router.push('/')} className="back-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h1>My Courses</h1>
            </header>

            {/* Error Display */}
            {error && (
                <div className="error-banner" role="alert">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Courses List */}
            {courses.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <p>You are not enrolled in any courses yet</p>
                    <button onClick={() => router.push('/')} className="primary-button">
                        Go to Home
                    </button>
                </div>
            ) : (
                <div className="courses-list">
                    {courses.map(course => (
                        <div key={course.id} className="course-card">
                            <div className="course-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                            </div>
                            <div className="course-info">
                                <h3 className="course-name">{course.course_name}</h3>
                                <p className="course-code">{course.course_code}</p>
                                <p className="course-enrolled">
                                    Enrolled on {formatDate(course.enrolled_at)}
                                </p>
                            </div>
                            <div className="course-actions">
                                <button
                                    onClick={() => router.push('/')}
                                    className="icon-button"
                                    aria-label="View sessions"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Section */}
            <section className="info-section">
                <div className="info-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <div>
                        <h4>About Course Enrollment</h4>
                        <p>
                            Course enrollment is managed by your instructor.
                            Active sessions from your enrolled courses will appear on the home page.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
