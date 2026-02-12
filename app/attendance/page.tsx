'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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

type ConsentStep = 'intro' | 'location' | 'camera' | 'ready';

function AttendanceContent() {
    const searchParams = useSearchParams();
    const preselectedCourseId = searchParams.get('courseId');

    const [step, setStep] = useState<AttendanceStep>('loading');
    const [consentStep, setConsentStep] = useState<ConsentStep>('location');
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [location, setLocation] = useState<GeolocationCoords | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [locationGranted, setLocationGranted] = useState(false);
    const [cameraGranted, setCameraGranted] = useState(false);

    const camera = useCamera();
    const geo = useGeolocation();
    const liveness = useLiveness({
        challengeCount: 2,
        challengeDuration: 5000,
        onComplete: () => setStep('capture'),
        onFail: () => {
            setError('Liveness verification timed out. Please try again.');
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

    const handleRequestLocation = useCallback(async () => {
        const locationResult = await geo.requestLocation();

        if (locationResult) {
            setLocation(locationResult);
            setLocationGranted(true);
            setConsentStep('camera');
        } else {
            setError(geo.error || 'Location access denied');
        }
    }, [geo]);

    const handleRequestCamera = useCallback(async () => {
        await camera.startCamera();

        if (camera.error) {
            setError(camera.error);
        } else {
            setCameraGranted(true);
            setConsentStep('ready');
        }
    }, [camera]);

    const handleConsentComplete = useCallback(() => {
        liveness.startChallenge();
        setStep('liveness');
    }, [liveness]);

    useEffect(() => {
        if ((step === 'liveness' || step === 'capture') && camera.isActive && camera.videoRef.current) {
            camera.videoRef.current.play().catch(console.error);
        }
    }, [step, camera.isActive, camera.videoRef]);

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
        setConsentStep('location');
        setLocationGranted(false);
        setCameraGranted(false);
        setStep('consent');
    };

    const getPageTitle = () => {
        switch (step) {
            case 'select-course': return 'Select Course';
            case 'consent': return 'Permissions';
            case 'liveness': return 'Liveness Check';
            case 'capture': return 'Face Capture';
            case 'submitting': return 'Verifying';
            case 'success': return 'Success';
            case 'error': return 'Error';
            default: return selectedCourse?.code || 'Attendance';
        }
    };

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader
                title={getPageTitle()}
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
                        <p className="section-description">Choose the course to take attendance for</p>
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

                {/* ConsentModal moved outside page-content, rendered below as a floating modal */}

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
                            <div className="face-overlay">
                                <div className="face-guide" />
                            </div>
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
                    <div className="liveness-container">
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
                        <div className="liveness-challenge capture-step">
                            <div className="liveness-instruction-wrapper">
                                <span className="liveness-instruction">Hold still to capture</span>
                            </div>
                            <button className="liveness-done-button" onClick={handleCapture}>
                                Capture
                            </button>
                        </div>
                    </div>
                )}

                {step === 'submitting' && (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Verifying your attendance...</p>
                        <p className="loading-subtext">Checking face match and location</p>
                    </div>
                )}

                {step === 'success' && (
                    <StatusResult
                        success
                        title="Attendance Recorded!"
                        message="Your attendance has been successfully verified and recorded."
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

            <ConsentModal
                isOpen={step === 'consent'}
                step={consentStep}
                onRequestLocation={handleRequestLocation}
                onRequestCamera={handleRequestCamera}
                onComplete={handleConsentComplete}
                onDecline={() => window.history.back()}
                locationGranted={locationGranted}
                cameraGranted={cameraGranted}
                isLoading={geo.isLoading}
                error={error}
            />

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
