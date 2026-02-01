'use client';

import { Clock, User, CheckCircle, XCircle, Loader } from 'lucide-react';
import type { Course } from '@/lib/types';

interface CourseCardProps {
    course: Course;
    onClick?: () => void;
    selected?: boolean;
    showStatus?: boolean;
}

const STATUS_CONFIG = {
    pending: { icon: Loader, label: 'Pending Approval', className: 'status-pending' },
    approved: { icon: CheckCircle, label: 'Approved', className: 'status-approved' },
    rejected: { icon: XCircle, label: 'Rejected', className: 'status-rejected' },
};

export default function CourseCard({
    course,
    onClick,
    selected = false,
    showStatus = false,
}: CourseCardProps) {
    const statusConfig = STATUS_CONFIG[course.status];
    const StatusIcon = statusConfig.icon;

    return (
        <button
            className={`course-card ${selected ? 'course-card-selected' : ''}`}
            onClick={onClick}
            type="button"
        >
            <div className="course-card-header">
                <span className="course-code">{course.code}</span>
                {showStatus && (
                    <span className={`course-status ${statusConfig.className}`}>
                        <StatusIcon size={14} />
                        {statusConfig.label}
                    </span>
                )}
            </div>

            <h3 className="course-name">{course.name}</h3>

            <div className="course-details">
                <div className="course-detail">
                    <User size={14} />
                    <span>{course.instructor}</span>
                </div>
                <div className="course-detail">
                    <Clock size={14} />
                    <span>{course.schedule}</span>
                </div>
            </div>
        </button>
    );
}
