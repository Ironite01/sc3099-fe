'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Trash2, Shield, ShieldCheck, ShieldOff, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getMyDevices, deleteDevice, logout } from '@/lib/api';
import type { DeviceRecord } from '@/lib/types';

/** 
 * Formats timestamps to Singapore Time.
 * Relies on the backend providing ISO8601 strings with explicit '+08:00' offset.
 */
function formatDate(value: string): string {
    if (!value) return 'N/A';
    
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    
    return new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

function TrustBadge({ device }: { device: DeviceRecord }) {
    if (!device.is_active) {
        return (
            <span className="device-trust-badge device-trust-inactive">
                <ShieldOff size={12} /> Deactivated
            </span>
        );
    }
    if (device.is_trusted) {
        return (
            <span className="device-trust-badge device-trust-trusted">
                <ShieldCheck size={12} /> Trusted
            </span>
        );
    }
    return (
        <span className="device-trust-badge device-trust-low">
            <Shield size={12} /> Pending trust
        </span>
    );
}

export default function MyDevicesPage() {
    const router = useRouter();
    const [devices, setDevices] = useState<DeviceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        getMyDevices().then((res) => {
            if (res.success && res.data) {
                setDevices(res.data);
            } else {
                setError(res.error || 'Failed to load devices');
            }
            setLoading(false);
        });
    }, []);

    const handleDelete = async (deviceId: string) => {
        setDeletingId(deviceId);
        setConfirmDeleteId(null);
        
        try {
            const result = await deleteDevice(deviceId);
            
            if (result.success || result.status === 404) {
                await logout();
                router.push('/login');
                return;
            } else {
                setError(result.error || 'Failed to remove device');
            }
        } catch (err) {
            setError('An unexpected error occurred while removing the device.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader title="My Devices" showBack />

            <div className="page-content">
                <p className="devices-intro">
                    Devices registered to your account for check-in authentication. Removing a
                    device will unbind it — your next check-in will automatically re-register
                    whatever device you use.
                </p>

                {error && (
                    <div className="error-message" style={{ marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div
                        className="loading-state"
                        style={{ padding: '3rem 0', textAlign: 'center' }}
                    >
                        <div className="spinner large" style={{ margin: '0 auto 1rem' }} />
                        <p>Loading your devices...</p>
                    </div>
                ) : devices.length === 0 ? (
                    <div className="dashboard-empty">
                        <Smartphone size={48} />
                        <p>No devices registered yet.</p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                            Devices are automatically registered when you check-in for the first
                            time.
                        </p>
                    </div>
                ) : (
                    <div className="devices-list">
                        {devices.map((device) => (
                            <div key={device.id} className="device-card">
                                <div className="device-card-icon">
                                    <Smartphone size={24} />
                                </div>
                                <div className="device-card-info">
                                    <h3 className="device-card-name">
                                        {device.device_name || 'Unknown Device'}
                                    </h3>
                                    <div className="device-card-meta">
                                        <span style={{ textTransform: 'capitalize' }}>
                                            {device.platform || 'Web'}
                                        </span>
                                        <span className="dot">•</span>
                                        <TrustBadge device={device} />
                                    </div>
                                    <div className="device-card-dates">
                                        <span>
                                            <Clock size={12} /> First seen:{' '}
                                            {formatDate(device.first_seen_at)}
                                        </span>
                                        <span>
                                            <Clock size={12} /> Last used:{' '}
                                            {formatDate(device.last_seen_at)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="device-delete-btn"
                                    onClick={() => setConfirmDeleteId(device.id)}
                                    disabled={deletingId === device.id}
                                    title="Revoke device access"
                                >
                                    {deletingId === device.id ? (
                                        <div className="spinner" style={{ width: 14, height: 14 }} />
                                    ) : (
                                        <Trash2 size={18} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="devices-note">
                    <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p>
                        For your security, you can only have one active device bound to your
                        account at a time. If you switch phones or browsers, you must revoke the
                        previous one here.
                    </p>
                </div>
            </div>

            {/* Deletion Confirmation Modal */}
            {confirmDeleteId && (
                <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Revoke Device?</h2>
                        <p className="modal-description">
                            Are you sure you want to remove this device? You will be signed out
                            immediately and will need to log in again to register a new device.
                        </p>
                        <div className="modal-actions">
                            <button
                                className="secondary-button"
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="primary-button"
                                style={{ background: 'var(--color-error)' }}
                                onClick={() => handleDelete(confirmDeleteId)}
                            >
                                {deletingId === confirmDeleteId ? 'Revoking...' : 'Yes, Revoke'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
