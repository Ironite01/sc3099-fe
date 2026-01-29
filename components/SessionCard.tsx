'use client';

interface Session {
    id: string;
    course_name: string;
    session_type: string;
    start_time: string;
    end_time: string;
    location_lat: number;
    location_lon: number;
    location_radius_m: number;
    allow_late_checkin: boolean;
    late_checkin_minutes: number;
}

interface SessionCardProps {
    session: Session;
    onCheckIn?: (sessionId: string) => void;
    isCheckedIn?: boolean;
}

export default function SessionCard({ session, onCheckIn, isCheckedIn = false }: SessionCardProps) {
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);
    const now = new Date();

    // Calculate session status
    const isActive = now >= startTime && now <= endTime;
    const isUpcoming = now < startTime;
    const isPast = now > endTime;

    // Format time for display
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = () => {
        if (isCheckedIn) {
            return <span className="status-badge checked-in">Checked In</span>;
        }
        if (isActive) {
            return <span className="status-badge active">Active Now</span>;
        }
        if (isUpcoming) {
            return <span className="status-badge upcoming">Upcoming</span>;
        }
        if (isPast) {
            return <span className="status-badge past">Ended</span>;
        }
        return null;
    };

    const handleCheckInClick = () => {
        if (onCheckIn && !isCheckedIn && (isActive || (isPast && session.allow_late_checkin))) {
            onCheckIn(session.id);
        }
    };

    return (
        <div className="session-card">
            <div className="session-header">
                <div className="session-info">
                    <h3 className="session-title">{session.course_name}</h3>
                    <p className="session-type">{session.session_type}</p>
                </div>
                {getStatusBadge()}
            </div>

            <div className="session-details">
                <div className="detail-row">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>
                        {formatDate(startTime)} • {formatTime(startTime)} - {formatTime(endTime)}
                    </span>
                </div>

                <div className="detail-row">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Within {session.location_radius_m}m radius</span>
                </div>

                {session.allow_late_checkin && (
                    <div className="detail-row">
                        <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Late check-in allowed (up to {session.late_checkin_minutes} min)</span>
                    </div>
                )}
            </div>

            {onCheckIn && (isActive || (isPast && session.allow_late_checkin)) && !isCheckedIn && (
                <button
                    onClick={handleCheckInClick}
                    className="check-in-button"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                    </svg>
                    <span>Check In</span>
                </button>
            )}

            {isCheckedIn && (
                <div className="checked-in-indicator">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>You have checked in to this session</span>
                </div>
            )}
        </div>
    );
}
