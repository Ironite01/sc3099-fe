'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ConsentModal from '@/components/ConsentModal';
import LivenessChallengeComponent from '@/components/LivenessChallenge';
import StatusResult from '@/components/StatusResult';
import { useCamera } from '@/hooks/useCamera';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLiveness } from '@/hooks/useLiveness';
import { getMyCourses, submitAttendance } from '@/lib/api';
import type { Course, GeolocationCoords } from '@/lib/types';

type AttendanceStep =
    | 'loading'
    | 'select-course'
    | 'consent'
    | 'liveness'
    | 'capture'
    | 'submitting'
    | 'success'
    | 'error';

function AttendanceContent() {
    const searchParams = useSearchParams();
    const preselectedCourseId = searchParams.get('courseId');

    const [step, setStep] = useState<AttendanceStep>('loading');
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [location, setLocation] = useState<GeolocationCoords | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const camera = useCamera();
    const geo = useGeolocation();
    const liveness = useLiveness({
        challengeCount: 2,
        challengeDuration: 5000,
        onComplete: () => setStep('capture'),
        onFail: () => {
            setError('Liveness verification timed out');
            setStep('error');
        },
    });

    useEffect(() => {
        async function init() {
            const result = await getMyCourses();

            if (result.success && result.data) {
                const approved = result.data.filter(c => c.status === 'approved');
                setCourses(approved);

                if (preselectedCourseId) {
                    const course = approved.find(c => c.id === preselectedCourseId);
                    if (course) {
                        setSelectedCourse(course);
                        setStep('consent');
                        return;
                    }
                }

                setStep('select-course');
            } else {
                setError(result.error || 'Failed to load courses');
                setStep('error');
            }
        }

        init();
    }, [preselectedCourseId]);

    const handleCourseSelect = (course: Course) => {
        setSelectedCourse(course);
        setStep('consent');
    };

    const handleConsentAccept = async () => {
        const locationResult = await geo.requestLocation();

        if (!locationResult) {
            setError(geo.error || 'Location access required');
            setStep('error');
            return;
        }

        setLocation(locationResult);

        await camera.startCamera();

        if (camera.error) {
            setError(camera.error);
            setStep('error');
            return;
        }

        liveness.startChallenge();
        setStep('liveness');
    };

    const handleCapture = () => {
        const image = camera.capturePhoto();

        if (!image) {
            setError('Failed to capture photo');
            setStep('error');
            return;
        }

        setCapturedImage(image);
        camera.stopCamera();
        handleSubmit(image);
    };

    const handleSubmit = async (image: string) => {
        if (!selectedCourse || !location || !liveness.livenessToken) {
            setError('Missing required data');
            setStep('error');
            return;
        }

        setStep('submitting');

        const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

        const result = await submitAttendance({
            course_id: selectedCourse.id,
            face_image: base64Image,
            location,
            liveness_token: liveness.livenessToken,
        });

        if (result.success) {
            setStep('success');
        } else {
            setError(result.error || 'Attendance submission failed');
            setStep('error');
        }
    };

    const handleRetry = () => {
        setError(null);
        setCapturedImage(null);
        liveness.reset();
        camera.stopCamera();
        setStep('consent');
    };

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader
                title={step === 'select-course' ? 'Take Attendance' : selectedCourse?.code || 'Attendance'}
                backHref="/courses"
            />

            <div className="page-content">
                {step === 'loading' && (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading...</p>
                    </div>
                )}

                {step === 'select-course' && (
                    <div className="course-select-container">
                        <h2>Select a Course</h2>
                        <div className="courses-list">
                            {courses.map(course => (
                                <button
                                    key={course.id}
                                    className="course-select-item"
                                    onClick={() => handleCourseSelect(course)}
                                >
                                    <span className="course-code">{course.code}</span>
                                    <span className="course-name">{course.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'consent' && (
                    <ConsentModal
                        requireCamera
                        requireLocation
                        onAccept={handleConsentAccept}
                        onDecline={() => window.history.back()}
                        isLoading={geo.isLoading}
                    />
                )}

                {step === 'liveness' && liveness.currentChallenge && (
                    <div className="liveness-container">
                        <div className="camera-preview">
                            <video
                                ref={camera.videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="camera-video"
                            />
                        </div>
                        <LivenessChallengeComponent
                            challenge={liveness.currentChallenge}
                            timeRemaining={liveness.timeRemaining}
                            challengeIndex={liveness.challengeIndex}
                            totalChallenges={liveness.totalChallenges}
                            onActionDetected={liveness.completeCurrentChallenge}
                        />
                    </div>
                )}

                {step === 'capture' && (
                    <div className="capture-container">
                        <div className="camera-preview">
                            <video
                                ref={camera.videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="camera-video"
                            />
                            <div className="face-overlay">
                                <div className="face-guide" />
                            </div>
                        </div>
                        <p className="capture-hint">Position your face and tap to verify</p>
                        <button className="capture-button" onClick={handleCapture}>
                            <span className="capture-icon" />
                        </button>
                    </div>
                )}

                {step === 'submitting' && (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Verifying your attendance...</p>
                    </div>
                )}

                {step === 'success' && (
                    <StatusResult
                        success
                        title="Attendance Recorded"
                        message="Your attendance has been successfully recorded."
                        details={`${selectedCourse?.code} - ${selectedCourse?.name}`}
                        homeHref="/courses"
                    />
                )}

                {step === 'error' && (
                    <StatusResult
                        success={false}
                        title="Verification Failed"
                        message={error || 'Something went wrong'}
                        onRetry={handleRetry}
                        homeHref="/courses"
                    />
                )}
            </div>

            <canvas ref={camera.canvasRef} style={{ display: 'none' }} />
        </main>
    );
}

export default function AttendancePage() {
    return (
        <Suspense fallback={
            <main className="page-container">
                <div className="loading-state">
                    <div className="spinner large" />
                    <p>Loading...</p>
                </div>
            </main>
        }>
            <AttendanceContent />
        </Suspense>
    );
}
