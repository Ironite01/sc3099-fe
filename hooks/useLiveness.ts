'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LivenessChallenge } from '@/lib/types';

type ChallengeType = LivenessChallenge['type'];

interface UseLivenessOptions {
    challengeCount?: number;
    challengeDuration?: number;
    onComplete?: (token: string) => void;
    onFail?: () => void;
}

interface UseLivenessReturn {
    currentChallenge: LivenessChallenge | null;
    challengeIndex: number;
    totalChallenges: number;
    timeRemaining: number;
    isActive: boolean;
    isComplete: boolean;
    livenessToken: string | null;
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
    } = options;

    const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [livenessToken, setLivenessToken] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    }, []);

    const startChallenge = useCallback(() => {
        const newChallenges = generateChallenges(challengeCount, challengeDuration);
        setChallenges(newChallenges);
        setChallengeIndex(0);
        setTimeRemaining(challengeDuration);
        setIsActive(true);
        setIsComplete(false);
        setLivenessToken(null);
    }, [challengeCount, challengeDuration]);

    const completeCurrentChallenge = useCallback(() => {
        clearTimers();

        if (challengeIndex >= challenges.length - 1) {
            const token = generateToken();
            setLivenessToken(token);
            setIsComplete(true);
            setIsActive(false);
            onComplete?.(token);
        } else {
            setChallengeIndex(prev => prev + 1);
            setTimeRemaining(challengeDuration);
        }
    }, [challengeIndex, challenges.length, challengeDuration, clearTimers, onComplete]);

    const reset = useCallback(() => {
        clearTimers();
        setChallenges([]);
        setChallengeIndex(0);
        setTimeRemaining(0);
        setIsActive(false);
        setIsComplete(false);
        setLivenessToken(null);
    }, [clearTimers]);

    useEffect(() => {
        if (!isActive || !currentChallenge) return;

        setTimeRemaining(currentChallenge.duration);

        intervalRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 100) return 0;
                return prev - 100;
            });
        }, 100);

        timerRef.current = setTimeout(() => {
            clearTimers();
            setIsActive(false);
            onFail?.();
        }, currentChallenge.duration);

        return clearTimers;
    }, [isActive, challengeIndex, currentChallenge, clearTimers, onFail]);

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
    };
}
