'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, BadgeCheck, Camera } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getMe, updateProfile } from '@/lib/api';
import type { User as UserType } from '@/lib/types';

function isValidFullName(name: string): boolean {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ\s.\-']+$/.test(name.trim());
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [fullName, setFullName] = useState('');
    const [fullNameError, setFullNameError] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function init() {
            const result = await getMe();
            if (!result.success || !result.data) {
                router.replace('/login');
                return;
            }
            setUser(result.data);
            setFullName(result.data.full_name || '');
            setLoading(false);
        }
        init();
    }, [router]);

    const isDirty = useMemo(() => {
        return fullName.trim() !== (user?.full_name || '').trim();
    }, [fullName, user]);

    const validateName = () => {
        const value = fullName.trim();
        if (!value) {
            setFullNameError('Full name is required.');
            return false;
        }
        if (value.length < 4) {
            setFullNameError('Name must be at least 4 characters.');
            return false;
        }
        if (value.length > 50) {
            setFullNameError('Name must be 50 characters or fewer.');
            return false;
        }
        if (!isValidFullName(value)) {
            setFullNameError("Name may only contain letters, spaces, hyphens, apostrophes, or dots.");
            return false;
        }
        setFullNameError('');
        return true;
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        if (!validateName()) return;
        if (!isDirty) return;

        setSaving(true);
        const result = await updateProfile({ full_name: fullName.trim() });
        setSaving(false);

        if (!result.success || !result.data) {
            setError(result.error || 'Failed to update profile.');
            return;
        }

        setUser(result.data);
        setFullName(result.data.full_name);
        setSuccess('Profile updated successfully.');
    };

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader title="My Profile" backHref="/dashboard" />

            <div className="page-content profile-page">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading profile...</p>
                    </div>
                ) : (
                    <>
                        {error && <div className="error-banner"><span>{error}</span></div>}
                        {success && <div className="success-banner"><span>{success}</span></div>}

                        <section className="profile-card">
                            <h3 className="profile-section-title">
                                <User size={18} />
                                Profile Details
                            </h3>

                            <div className="profile-field">
                                <label htmlFor="full_name">Full Name</label>
                                <input
                                    id="full_name"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        setFullNameError('');
                                        setSuccess('');
                                    }}
                                    maxLength={50}
                                    disabled={saving}
                                    className={fullNameError ? 'input-error' : ''}
                                />
                                {fullNameError && <span className="field-error">{fullNameError}</span>}
                            </div>

                            <div className="profile-field">
                                <label>Email</label>
                                <input type="text" value={user?.email || ''} disabled />
                            </div>

                            <div className="profile-field">
                                <label>Role</label>
                                <input type="text" value={user?.role || ''} disabled />
                            </div>

                            <button
                                className="primary-button"
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                            >
                                {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                        </section>

                        <section className="profile-card">
                            <h3 className="profile-section-title">
                                <BadgeCheck size={18} />
                                Face Enrollment
                            </h3>
                            <p className="profile-helper-text">
                                Current status:{' '}
                                <span className={user?.face_enrolled ? 'profile-status-enrolled' : 'profile-status-not-enrolled'}>
                                    {user?.face_enrolled ? 'Enrolled' : 'Not enrolled'}
                                </span>
                            </p>
                            <button
                                className="secondary-button"
                                onClick={() => router.push('/enroll?fromProfile=true')}
                            >
                                <Camera size={16} />
                                <span>{user?.face_enrolled ? 'Update Face Enrollment' : 'Enroll Face Now'}</span>
                            </button>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
