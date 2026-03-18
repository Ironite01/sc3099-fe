'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, LogOut, BookOpen, Clock, User, Smartphone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getMe, getMyCourses, getMyCheckins, logout } from '@/lib/api';
import type { User as UserType, Course, StudentCheckin } from '@/lib/types';

function formatCheckinTimestamp(value: string): string | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [recentCheckins, setRecentCheckins] = useState<StudentCheckin[]>([]);
    const [coursesError, setCoursesError] = useState<string | null>(null);
    const [checkinsError, setCheckinsError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function init() {
            const [userResult, coursesResult, checkinsResult] = await Promise.all([
                getMe(),
                getMyCourses(),
                getMyCheckins(5),
            ]);

            if (!userResult.success) {
                // Not authenticated — send to login
                router.replace('/login');
                return;
            }

            setUser(userResult.data ?? null);
            if (coursesResult.success && coursesResult.data) {
                // Backend /courses/enrolled returns enrolled rows without a
                // status field. Only apply status filtering when provided.
                setCourses(coursesResult.data.filter(c => !c.status || c.status === 'approved'));
                setCoursesError(null);
            } else {
                setCourses([]);
                setCoursesError(coursesResult.error || 'Unable to load enrolled courses right now.');
            }

            if (checkinsResult.success && checkinsResult.data) {
                setRecentCheckins(checkinsResult.data);
                setCheckinsError(null);
            } else {
                setRecentCheckins([]);
                setCheckinsError(checkinsResult.error || 'Unable to load your attendance status right now.');
            }
            setIsLoading(false);
        }
        init();
    }, [router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = user?.full_name?.split(' ')[0] ?? 'Student';

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader
                title="Dashboard"
                showBack={false}
                rightAction={
                    <button
                        className="icon-button"
                        onClick={handleLogout}
                        aria-label="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                }
            />

            <div className="page-content">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* Greeting */}
                        <div className="dashboard-greeting">
                            <div className="dashboard-avatar">
                                <User size={28} />
                            </div>
                            <div>
                                <p className="dashboard-greeting-sub">{getGreeting()},</p>
                                <h2 className="dashboard-greeting-name">{firstName}</h2>
                            </div>
                        </div>

                        {/* Primary CTA — Scan QR */}
                        <button
                            className="qr-scan-button"
                            onClick={() => router.push('/scan')}
                        >
                            <div className="qr-scan-icon">
                                <QrCode size={36} />
                            </div>
                            <div className="qr-scan-text">
                                <span className="qr-scan-title">Scan QR to Check In</span>
                                <span className="qr-scan-sub">Point your camera at the session QR code</span>
                            </div>
                        </button>

                        {/* Quick links row */}
                        <div className="dashboard-quick-links">
                            <button
                                className="dashboard-quick-link"
                                onClick={() => router.push('/devices')}
                            >
                                <Smartphone size={18} />
                                <span>My Devices</span>
                            </button>
                            <button
                                className="dashboard-quick-link"
                                onClick={() => router.push('/courses')}
                            >
                                <BookOpen size={18} />
                                <span>My Courses</span>
                            </button>
                        </div>

                        {/* Enrolled Courses */}
                        <section className="dashboard-section">
                            <div className="section-header">
                                <h3 className="section-title">
                                    <BookOpen size={16} />
                                    Enrolled Courses
                                </h3>
                                <button
                                    className="text-button"
                                    onClick={() => router.push('/courses')}
                                >
                                    View all
                                </button>
                            </div>

                            {courses.length === 0 ? (
                                <div className="dashboard-empty">
                                    <Clock size={32} />
                                    <p>{coursesError || 'No enrolled courses'}</p>
                                    <button
                                        className="secondary-button"
                                        style={{ marginTop: '0.5rem' }}
                                        onClick={() => router.push('/courses/register')}
                                    >
                                        Register for courses
                                    </button>
                                </div>
                            ) : (
                                <div className="dashboard-courses">
                                    {courses.slice(0, 4).map(course => (
                                        <div key={course.id} className="dashboard-course-chip">
                                            <span className="dashboard-course-code">{course.code}</span>
                                            <span className="dashboard-course-name">{course.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="dashboard-section">
                            <div className="section-header">
                                <h3 className="section-title">
                                    <Clock size={16} />
                                    Recent Check-ins
                                </h3>
                            </div>

                            {recentCheckins.length === 0 ? (
                                <div className="dashboard-empty">
                                    <Clock size={32} />
                                    <p>{checkinsError || 'No check-ins yet'}</p>
                                </div>
                            ) : (
                                <div className="dashboard-courses">
                                    {recentCheckins.map((checkin) => (
                                        <div key={checkin.id} className="dashboard-course-chip">
                                            <span className="dashboard-course-code">{checkin.course_code}</span>
                                            <div className="dashboard-checkin-details">
                                                <span className="dashboard-course-name">
                                                    {checkin.session_name} - {checkin.status}
                                                </span>
                                                {(((checkin as any).checked_in_at ?? (checkin as any).timestamp) as string | undefined) ? (
                                                    <span className="dashboard-course-meta">
                                                        Checked in {
                                                            formatCheckinTimestamp(((checkin as any).checked_in_at ?? (checkin as any).timestamp) as string)
                                                            ?? (((checkin as any).checked_in_at ?? (checkin as any).timestamp) as string)
                                                        }
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
