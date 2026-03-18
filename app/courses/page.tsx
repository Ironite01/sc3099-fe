'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, LogOut } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import CourseCard from '@/components/CourseCard';
import { getMyCourses } from '@/lib/api';
import type { Course } from '@/lib/types';

export default function CoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCourses() {
            const result = await getMyCourses();

            if (result.success && result.data) {
                setCourses(result.data);
            } else {
                setError(result.error || 'Failed to load courses');
            }

            setIsLoading(false);
        }

        fetchCourses();
    }, []);

    // Real backend doesn't return a status field on enrolled courses — every
    // course in the list is already enrolled/active.  Only apply the filter
    // when mock data is used (status will be set).
    const approvedCourses = courses.filter(c => !c.status || c.status === 'approved');
    const pendingCourses = courses.filter(c => c.status === 'pending');

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader
                title="My Courses"
                showBack
                backHref="/dashboard"
                rightAction={
                    <button
                        className="icon-button"
                        onClick={() => router.push('/login')}
                        aria-label="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                }
            />

            <div className="page-content">
                <div style={{ marginBottom: '1rem' }}>
                    <button
                            className="primary-button"
                            style={{ width: '100%' }}
                        onClick={() => router.push('/dashboard')}
                    >
                        Back to Dashboard
                    </button>
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading courses...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>{error}</p>
                        <button
                            className="primary-button"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <>
                        <section className="courses-section">
                            <div className="section-header">
                                <h2>My Enrolled Courses</h2>
                                <button
                                    className="text-button"
                                    onClick={() => router.push('/courses/register')}
                                >
                                    <Plus size={18} />
                                    Register Course
                                </button>
                            </div>

                            {approvedCourses.length === 0 ? (
                                <div className="empty-state">
                                    <Calendar size={48} />
                                    <p>No approved courses yet</p>
                                    <button
                                        className="primary-button"
                                        onClick={() => router.push('/courses/register')}
                                    >
                                        Register for a Course
                                    </button>
                                </div>
                            ) : (
                                <div className="courses-grid">
                                    {approvedCourses.map(course => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {pendingCourses.length > 0 && (
                            <section className="courses-section">
                                <h2>Pending Approval</h2>
                                <div className="courses-grid">
                                    {pendingCourses.map(course => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            showStatus
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
