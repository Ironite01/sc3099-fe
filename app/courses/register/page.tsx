'use client';

import { useState, useEffect } from 'react';
import { Search, BookOpen } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusResult from '@/components/StatusResult';
import { getAvailableCourses, registerForCourse } from '@/lib/api';
import type { Course } from '@/lib/types';

type PageState = 'browse' | 'registering' | 'success' | 'error';

export default function CourseRegisterPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [pageState, setPageState] = useState<PageState>('browse');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCourses() {
            const result = await getAvailableCourses();

            if (result.success && result.data) {
                setCourses(result.data);
                setFilteredCourses(result.data);
            } else {
                setError(result.error || 'Failed to load courses');
            }

            setIsLoading(false);
        }

        fetchCourses();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredCourses(courses);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = courses.filter(
            course =>
                course.code.toLowerCase().includes(query) ||
                course.name.toLowerCase().includes(query) ||
                (course.instructor ?? '').toLowerCase().includes(query) ||
                (course.semester ?? '').toLowerCase().includes(query)
        );
        setFilteredCourses(filtered);
    }, [searchQuery, courses]);

    const handleRegister = async () => {
        if (!selectedCourse) return;

        setPageState('registering');

        const result = await registerForCourse(selectedCourse.id);

        if (result.success) {
            setPageState('success');
        } else {
            setError(result.error || 'Registration failed');
            setPageState('error');
        }
    };

    const handleReset = () => {
        setSelectedCourse(null);
        setPageState('browse');
        setError(null);
    };

    if (pageState === 'success') {
        return (
            <main className="page-container">
                <div className="bg-orb bg-orb-1" />
                <div className="bg-orb bg-orb-2" />
                <PageHeader title="Registration" showBack={false} />
                <div className="page-content centered">
                    <StatusResult
                        success
                        title="Registration Submitted"
                        message="Your course registration has been submitted for approval."
                        details={`${selectedCourse?.code} - ${selectedCourse?.name}`}
                        homeHref="/courses"
                    />
                </div>
            </main>
        );
    }

    if (pageState === 'error') {
        return (
            <main className="page-container">
                <div className="bg-orb bg-orb-1" />
                <div className="bg-orb bg-orb-2" />
                <PageHeader title="Registration" showBack={false} />
                <div className="page-content centered">
                    <StatusResult
                        success={false}
                        title="Registration Failed"
                        message={error || 'Something went wrong'}
                        onRetry={handleReset}
                        homeHref="/courses"
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader title="Register Course" backHref="/courses" />

            <div className="page-content">
                <div className="search-container">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by course code, name, or instructor"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading available courses...</p>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="empty-state">
                        <BookOpen size={48} />
                        <p>No courses found</p>
                    </div>
                ) : (
                    <div className="courses-grid">
                        {filteredCourses.map(course => (
                            <button
                                key={course.id}
                                className={`selectable-course-card ${selectedCourse?.id === course.id ? 'selected' : ''}`}
                                onClick={() => setSelectedCourse(course)}
                                type="button"
                            >
                                <span className="course-code">{course.code}</span>
                                <span className="course-name">{course.name}</span>
                                {course.instructor && (
                                    <span className="course-instructor">{course.instructor}</span>
                                )}
                                <span className="course-schedule">
                                    {course.schedule ?? course.semester ?? ''}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {selectedCourse && (
                    <div className="fixed-bottom-action">
                        <button
                            className="primary-button full-width"
                            onClick={handleRegister}
                            disabled={pageState === 'registering'}
                        >
                            {pageState === 'registering' ? (
                                <>
                                    <span className="spinner" />
                                    Registering...
                                </>
                            ) : (
                                `Register for ${selectedCourse.code}`
                            )}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
