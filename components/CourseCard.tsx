'use client';

import { Clock, User, CheckCircle, XCircle, Loader, ChevronRight } from 'lucide-react';
import type { Course } from '@/lib/types';

interface CourseCardProps {
    course: Course;
    onTakeAttendance?: () => void;
    showStatus?: boolean;
    actionLabel?: string;
}

const STATUS_CONFIG = {
    pending: { icon: Loader, label: 'Pending Approval', className: 'status-pending' },
    approved: { icon: CheckCircle, label: 'Approved', className: 'status-approved' },
    rejected: { icon: XCircle, label: 'Rejected', className: 'status-rejected' },
};

export default function CourseCard({
    course,
    onTakeAttendance,
    showStatus = false,
    actionLabel = 'Take Attendance',
}: CourseCardProps) {
    const statusConfig = course.status ? STATUS_CONFIG[course.status] : null;
    const StatusIcon = statusConfig?.icon;
    const isActionable = (!course.status || course.status === 'approved') && !!onTakeAttendance;

    return (
        <div className="course-card">
            <div className="course-card-content">
                <div className="course-card-header">
                    <span className="course-code">{(course as any).course_code}</span>
                    {showStatus && (
                        statusConfig && StatusIcon && (
                            <span className={`course-status ${statusConfig.className}`}>
                                <StatusIcon size={14} />
                                {statusConfig.label}
                            </span>
                        )
                    )}
                </div>

                <h3 className="course-name">{(course as any).course_name}</h3>

                <div className="course-details">
                    <div className="course-detail">
                        <User size={14} />
                        <span>{(course as any).instructor_name ?? course.semester ?? ''}</span>
                    </div>
                    <div className="course-detail">
                        <Clock size={14} />
                        <span>{course.enrolled_at ? new Date(course.enrolled_at).toDateString() : ''}</span>
                    </div>
                </div>
            </div>

            {isActionable && (
                <button
                    className="course-action-button"
                    onClick={onTakeAttendance}
                    type="button"
                >
                    {actionLabel}
                    <ChevronRight size={18} />
                </button>
            )}
        </div>
    );
}
