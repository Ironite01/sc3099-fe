'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getMe, getMyCheckins, appealCheckin } from '@/lib/api';
import type { StudentCheckin, CheckinStatus } from '@/lib/types';

function formatTimestamp(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}

function isAppealable(checkin: StudentCheckin): boolean {
    const status = checkin.status;
    if (status !== 'rejected' && status !== 'flagged') return false;
    if (checkin.appealed_at) return false; // Cannot appeal more than once
    const checkinDate = new Date(checkin.checked_in_at);
    const now = new Date();
    const diffDays = (now.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
}

function statusConfig(status: CheckinStatus): { icon: React.ReactNode; color: string; label: string; bgColor: string } {
    switch (status) {
        case 'approved':
            return {
                icon: <CheckCircle size={16} />,
                color: 'var(--color-success)',
                bgColor: 'rgba(34, 197, 94, 0.12)',
                label: 'Approved',
            };
        case 'rejected':
            return {
                icon: <XCircle size={16} />,
                color: 'var(--color-error)',
                bgColor: 'rgba(239, 68, 68, 0.12)',
                label: 'Rejected',
            };
        case 'flagged':
            return {
                icon: <AlertTriangle size={16} />,
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.12)',
                label: 'Flagged',
            };
        case 'appealed':
            return {
                icon: <MessageSquare size={16} />,
                color: '#8b5cf6',
                bgColor: 'rgba(139, 92, 246, 0.12)',
                label: 'Appealed',
            };
        case 'pending':
            return {
                icon: <Clock size={16} />,
                color: 'var(--color-text-secondary)',
                bgColor: 'rgba(148, 163, 184, 0.12)',
                label: 'Pending',
            };
        default:
            return {
                icon: <Clock size={16} />,
                color: 'var(--color-text-secondary)',
                bgColor: 'rgba(148, 163, 184, 0.12)',
                label: status,
            };
    }
}

/* ─── Self-contained Appeal Form component ─── */
function AppealForm({
    checkinId,
    onSuccess,
    onAlreadyAppealed,
    onCancel,
}: {
    checkinId: string;
    onSuccess: () => void;
    onAlreadyAppealed: () => void;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = useCallback(async () => {
        const trimmed = reason.trim();
        if (!trimmed) {
            setError('Please provide a reason for your appeal.');
            return;
        }
        setSubmitting(true);
        setError(null);

        const result = await appealCheckin(checkinId, trimmed);
        setSubmitting(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } else {
            if ((result.error || '').toLowerCase().includes('already appealed')) {
                onAlreadyAppealed();
                return;
            }
            setError(result.error || 'Failed to submit appeal.');
        }
    }, [checkinId, reason, onSuccess, onAlreadyAppealed]);

    if (success) {
        return (
            <div className="appeal-form-container">
                <div className="appeal-success-msg">
                    <CheckCircle size={18} />
                    <span>Your appeal has been submitted successfully.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="appeal-form-container">
            <div className="appeal-form-header">
                <MessageSquare size={16} />
                <span>Submit Appeal</span>
            </div>
            <p className="appeal-form-hint">
                Explain why this check-in should be approved. Your instructor will review your appeal.
            </p>
            <textarea
                className="appeal-textarea"
                placeholder="e.g. I was physically present in class, my GPS was inaccurate due to building interference."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                maxLength={1000}
                disabled={submitting}
                autoFocus
            />
            {error && (
                <div className="appeal-error">
                    <AlertTriangle size={14} />
                    {error}
                </div>
            )}
            <div className="appeal-actions">
                <button
                    type="button"
                    className="secondary-button appeal-cancel-btn"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="primary-button appeal-submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting || !reason.trim()}
                >
                    {submitting ? (
                        <>
                            <div className="spinner" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send size={14} />
                            Submit Appeal
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

/* ─── Single Check-in Card component ─── */
function CheckinCard({
    checkin,
    onStatusChange,
}: {
    checkin: StudentCheckin;
    onStatusChange: (id: string, newStatus: CheckinStatus) => void;
}) {
    const [showAppeal, setShowAppeal] = useState(false);
    const config = statusConfig(checkin.status);
    const canAppeal = isAppealable(checkin);
    const hasAppealed = !!checkin.appealed_at;
    const isAppealRejected = hasAppealed && checkin.status === 'rejected';
    const isAppealApproved = hasAppealed && checkin.status === 'approved';
    const statusLabel = isAppealRejected
        ? 'Appeal Rejected (Final)'
        : isAppealApproved
            ? 'Approved (After Appeal)'
            : config.label;

    return (
        <div className={`checkin-card ${showAppeal ? 'checkin-card-expanded' : ''}`}>
            <div className="checkin-card-main">
                <div className="checkin-card-left">
                    <span className="checkin-course-badge">{checkin.course_code}</span>
                    <div className="checkin-info">
                        <span className="checkin-session-name">{checkin.session_name}</span>
                        <span className="checkin-timestamp">
                            {formatTimestamp(checkin.checked_in_at) || checkin.checked_in_at}
                        </span>
                    </div>
                </div>

                <div className="checkin-card-right">
                    <span
                        className="checkin-status-badge"
                        style={{
                            color: config.color,
                            backgroundColor: config.bgColor,
                        }}
                    >
                        {config.icon}
                        {statusLabel}
                    </span>

                    {canAppeal && !showAppeal && (
                        <button
                            type="button"
                            className="checkin-appeal-btn"
                            onClick={() => setShowAppeal(true)}
                            title="Appeal this check-in"
                        >
                            <MessageSquare size={14} />
                            Appeal
                        </button>
                    )}
                </div>
            </div>

            {showAppeal && (
                <AppealForm
                    checkinId={checkin.id}
                    onCancel={() => setShowAppeal(false)}
                    onAlreadyAppealed={() => {
                        setShowAppeal(false);
                        onStatusChange(checkin.id, 'appealed');
                    }}
                    onSuccess={() => {
                        setShowAppeal(false);
                        onStatusChange(checkin.id, 'appealed');
                    }}
                />
            )}
        </div>
    );
}

/* ─── Main Page ─── */
export default function CheckinsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [checkins, setCheckins] = useState<StudentCheckin[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            const userResult = await getMe();
            if (!userResult.success) {
                router.replace('/login');
                return;
            }
            const result = await getMyCheckins(50);
            if (result.success && result.data) {
                setCheckins(result.data);
            } else {
                setError(result.error || 'Failed to load check-ins');
            }
            setIsLoading(false);
        }
        init();
    }, [router]);

    const handleStatusChange = useCallback((id: string, newStatus: CheckinStatus) => {
        setCheckins(prev =>
            prev.map(c => (c.id === id ? { ...c, status: newStatus } : c))
        );
    }, []);

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader title="My Check-ins" backHref="/dashboard" />

            <div className="page-content">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading your check-ins...</p>
                    </div>
                ) : error ? (
                    <div className="dashboard-empty">
                        <XCircle size={32} />
                        <p>{error}</p>
                    </div>
                ) : checkins.length === 0 ? (
                    <div className="dashboard-empty">
                        <Clock size={40} />
                        <p>No check-ins yet</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            Your check-in history will appear here
                        </p>
                    </div>
                ) : (
                    <div className="checkins-list">
                        {checkins.map(checkin => (
                            <CheckinCard
                                key={checkin.id}
                                checkin={checkin}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
