'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-8">
      <PageHeader
        title=""
        showBack={false}
        rightAction={
          <button
            className="icon-button"
            onClick={() => router.push('/login')}
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        }
      />

      <h1 className="text-3xl font-bold mb-4">
        SAIV - Secure Attendance System
      </h1>
      <p className="text-gray-600 mb-8">
        Student Check-in Interface
      </p>

      {/* ================================================================== */}
      {/* TODO: Implement the following features                             */}
      {/* ================================================================== */}

      {/* ------------------------------------------------------------------ */}
      {/* Authentication                                                     */}
      {/* ------------------------------------------------------------------ */}
      {/* - Login form with email/password                                   */}
      {/* - Registration form                                                */}
      {/* - JWT token storage (secure, HttpOnly where possible)              */}
      {/* - Auto-refresh token logic                                         */}

      {/* ------------------------------------------------------------------ */}
      {/* Camera Access                                                      */}
      {/* ------------------------------------------------------------------ */}
      {/* - WebRTC camera stream                                             */}
      {/* - Liveness challenge UI (blink, head turn prompts)                 */}
      {/* - Frame capture for face verification                              */}
      {/* - Consent flow before camera access                                */}

      {/* ------------------------------------------------------------------ */}
      {/* Geolocation                                                        */}
      {/* ------------------------------------------------------------------ */}
      {/* - Geolocation API integration                                      */}
      {/* - Explicit consent before location access                          */}
      {/* - GPS coordinates sent with check-in                               */}
      {/* - Error handling for denied permissions                            */}

      {/* ------------------------------------------------------------------ */}
      {/* Device Binding                                                     */}
      {/* ------------------------------------------------------------------ */}
      {/* - ECDSA key pair generation (Web Crypto API)                       */}
      {/* - Public key rotation on each session                              */}
      {/* - Device fingerprinting                                            */}
      {/* - Secure key storage                                               */}

      {/* ------------------------------------------------------------------ */}
      {/* PWA Features                                                       */}
      {/* ------------------------------------------------------------------ */}
      {/* - Service worker for offline support                               */}
      {/* - PWA manifest                                                     */}
      {/* - Offline check-in queue with sync                                 */}
      {/* - LocalForage for persistent storage                               */}

      {/* ------------------------------------------------------------------ */}
      {/* Check-in Flow                                                      */}
      {/* ------------------------------------------------------------------ */}
      {/* 1. Select active session                                           */}
      {/* 2. Grant camera permission (with consent)                          */}
      {/* 3. Complete liveness challenge                                     */}
      {/* 4. Grant location permission (with consent)                        */}
      {/* 5. Submit check-in to backend                                      */}
      {/* 6. Display success/failure with risk score                         */}

      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mt-8">
        <p className="font-bold">Skeleton Implementation</p>
        <p>Please implement the required features as described above.</p>
      </div>
    </main>
  );
}
