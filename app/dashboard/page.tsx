'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, LogOut, BookOpen, Clock, User } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getMe, getMyCourses, logout } from '@/lib/api';
import type { User as UserType, Course } from '@/lib/types';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function init() {
            const [userResult, coursesResult] = await Promise.all([
                getMe(),
                getMyCourses(),
            ]);

            if (!userResult.success) {
                // Not authenticated — send to login
                router.replace('/login');
                return;
            }

            setUser(userResult.data ?? null);
            if (coursesResult.success && coursesResult.data) {
                setCourses(coursesResult.data.filter(c => c.status === 'approved'));
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
                                    <p>No enrolled courses</p>
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
                    </>
                )}
            </div>
        </main>
    );
}
