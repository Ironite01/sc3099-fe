'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Trash2, Shield, ShieldCheck, ShieldOff, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getMyDevices, deleteDevice } from '@/lib/api';
import type { DeviceRecord } from '@/lib/types';

function formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
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
        if (confirmDeleteId !== deviceId) {
            // First tap: ask for confirmation
            setConfirmDeleteId(deviceId);
            return;
        }
        setDeletingId(deviceId);
        setConfirmDeleteId(null);
        const result = await deleteDevice(deviceId);
        if (result.success) {
            setDevices((prev) => prev.filter((d) => d.id !== deviceId));
        } else {
            setError(result.error || 'Failed to remove device');
        }
        setDeletingId(null);
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
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading devices…</p>
                    </div>
                ) : devices.length === 0 ? (
                    <div className="dashboard-empty" style={{ marginTop: '2rem' }}>
                        <Smartphone size={36} />
                        <p>No devices registered yet.</p>
                        <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                            Your device will be registered automatically when you next check in.
                        </p>
                    </div>
                ) : (
                    <div className="devices-list">
                        {devices.map((device) => (
                            <div key={device.id} className="device-card">
                                <div className="device-card-icon">
                                    <Smartphone size={22} />
                                </div>
                                <div className="device-card-info">
                                    <div className="device-card-name">
                                        {device.device_name ?? 'Unknown device'}
                                    </div>
                                    <div className="device-card-meta">
                                        {device.platform && <span>{device.platform}</span>}
                                        <TrustBadge device={device} />
                                    </div>
                                    <div className="device-card-dates">
                                        <span>
                                            <Clock size={11} /> First seen {formatDate(device.first_seen_at)}
                                        </span>
                                        <span>
                                            Last seen {formatDate(device.last_seen_at)}
                                        </span>
                                        <span>{device.total_checkins} check-in{device.total_checkins !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                                <button
                                    className={`device-delete-btn ${confirmDeleteId === device.id ? 'device-delete-confirm' : ''}`}
                                    onClick={() => handleDelete(device.id)}
                                    disabled={deletingId === device.id}
                                    aria-label={confirmDeleteId === device.id ? 'Confirm remove device' : 'Remove device'}
                                    title={confirmDeleteId === device.id ? 'Tap again to confirm removal' : 'Remove this device'}
                                >
                                    {deletingId === device.id
                                        ? <div className="spinner small" />
                                        : confirmDeleteId === device.id
                                            ? 'Confirm'
                                            : <Trash2 size={16} />
                                    }
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <p className="devices-note">
                    <Shield size={13} /> Trust level is managed by your instructor. A device
                    marked as <strong>trusted</strong> lowers your check-in risk score.
                </p>
            </div>
        </main>
    );
}
