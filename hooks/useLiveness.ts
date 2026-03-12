'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LivenessChallenge } from '@/lib/types';

type ChallengeType = LivenessChallenge['type'];

interface UseLivenessOptions {
    challengeCount?: number;
    challengeDuration?: number;
    onComplete?: (token: string) => void;
    onFail?: () => void;
    autoDetect?: boolean;
}

export type LivenessStatus = 'pending' | 'detecting' | 'success' | 'failed';

interface UseLivenessReturn {
    currentChallenge: LivenessChallenge | null;
    challengeIndex: number;
    totalChallenges: number;
    timeRemaining: number;
    isActive: boolean;
    isComplete: boolean;
    livenessToken: string | null;
    detectionProgress: number;
    status: LivenessStatus;
    startChallenge: () => void;
    completeCurrentChallenge: () => void;
    reset: () => void;
}

const CHALLENGE_CONFIGS: Record<ChallengeType, string> = {
    blink: 'Blink your eyes',
    turn_left: 'Turn your head left',
    turn_right: 'Turn your head right',
    smile: 'Smile',
    nod: 'Nod your head',
};

function generateChallenges(count: number, duration: number): LivenessChallenge[] {
    const types: ChallengeType[] = ['blink', 'turn_left', 'turn_right', 'smile', 'nod'];
    const shuffled = [...types].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, count).map(type => ({
        type,
        instruction: CHALLENGE_CONFIGS[type],
        duration,
    }));
}

function generateToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return btoa(`liveness_${timestamp}_${random}`);
}

export function useLiveness(options: UseLivenessOptions = {}): UseLivenessReturn {
    const {
        challengeCount = 2,
        challengeDuration = 3000,
        onComplete,
        onFail,
        autoDetect = true,
    } = options;

    const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [livenessToken, setLivenessToken] = useState<string | null>(null);
    const [detectionProgress, setDetectionProgress] = useState(0);
    const [status, setStatus] = useState<LivenessStatus>('pending');

    // Use refs for callbacks to avoid dependency cycles
    const onCompleteRef = useRef(onComplete);
    const onFailRef = useRef(onFail);

    useEffect(() => {
        onCompleteRef.current = onComplete;
        onFailRef.current = onFail;
    }, [onComplete, onFail]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const detectionTimerRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const currentChallenge = challenges[challengeIndex] || null;

    const clearTimers = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (detectionTimerRef.current) {
            clearTimeout(detectionTimerRef.current);
            detectionTimerRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    }, []);

    const startChallenge = useCallback(() => {
        const newChallenges = generateChallenges(challengeCount, 8000); // Increased duration for auto-detect
        setChallenges(newChallenges);
        setChallengeIndex(0);
        setTimeRemaining(8000);
        setIsActive(true);
        setIsComplete(false);
        setLivenessToken(null);
        setDetectionProgress(0);
        setStatus('pending');
    }, [challengeCount]);

    const completeCurrentChallenge = useCallback(() => {
        clearTimers();

        if (challengeIndex >= challenges.length - 1) {
            const token = generateToken();
            setLivenessToken(token);
            setIsComplete(true);
            setIsActive(false);
            if (onCompleteRef.current) onCompleteRef.current(token);
        } else {
            setChallengeIndex(prev => prev + 1);
            setTimeRemaining(8000);
            setDetectionProgress(0);
            setStatus('pending');
        }
    }, [challengeIndex, challenges.length, challengeDuration, clearTimers]);

    const reset = useCallback(() => {
        clearTimers();
        setChallenges([]);
        setChallengeIndex(0);
        setTimeRemaining(0);
        setIsActive(false);
        setIsComplete(false);
        setLivenessToken(null);
        setDetectionProgress(0);
        setStatus('pending');
    }, [clearTimers]);

    // Timer for the challenge duration
    useEffect(() => {
        if (!isActive || !currentChallenge || status === 'success') return;

        setTimeRemaining(currentChallenge.duration);

        intervalRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 100) return 0;
                return prev - 100;
            });
        }, 100);

        timerRef.current = setTimeout(() => {
            // Check current status via state rather than lexical to avoid TS error about unintentional comparison
            clearTimers();
            setIsActive(false);
            setStatus('failed');
            if (onFailRef.current) onFailRef.current();
        }, currentChallenge.duration);

        return () => {
            // Only clear timer refs logic for this effect
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, challengeIndex, currentChallenge, clearTimers, status]);

    // Auto-detection simulation
    useEffect(() => {
        if (!isActive || !currentChallenge || !autoDetect || status !== 'pending') return;

        // Start detection
        setStatus('detecting');

        // Random detection time between 1.5s and 3s
        const detectionTime = 1500 + Math.random() * 1500;
        const step = 50;
        const totalSteps = detectionTime / step;
        let currentStep = 0;

        progressIntervalRef.current = setInterval(() => {
            currentStep++;
            const progress = Math.min((currentStep / totalSteps) * 100, 100);
            setDetectionProgress(progress);

            if (currentStep >= totalSteps) {
                if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                setStatus('success');
                setDetectionProgress(100);

                // Wait a bit showing success before advancing
                detectionTimerRef.current = setTimeout(() => {
                    completeCurrentChallenge();
                }, 500);
            }
        }, step);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (detectionTimerRef.current) clearTimeout(detectionTimerRef.current);
        };
    }, [isActive, challengeIndex, currentChallenge, autoDetect, completeCurrentChallenge /* status removed to avoid loop */]);

    // Cleanup on unmount
    useEffect(() => {
        return clearTimers;
    }, [clearTimers]);

    return {
        currentChallenge,
        challengeIndex,
        totalChallenges: challenges.length,
        timeRemaining,
        isActive,
        isComplete,
        livenessToken,
        startChallenge,
        completeCurrentChallenge,
        reset,
        detectionProgress,
        status,
    };
}
