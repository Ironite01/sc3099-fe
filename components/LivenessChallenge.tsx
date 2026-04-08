'use client';

import { useEffect } from 'react';
import { Eye, MoveLeft, MoveRight, Smile, ArrowUp, ArrowDown } from 'lucide-react';
import type { LivenessChallenge as LivenessChallengeType } from '@/lib/types';

interface LivenessChallengeProps {
    challenge: LivenessChallengeType;
    timeRemaining: number;
    challengeIndex: number;
    totalChallenges: number;
    onActionDetected: () => void;
}

const CHALLENGE_ICONS: Record<LivenessChallengeType['type'], React.ReactNode> = {
    blink: <Eye size={20} />,
    turn_left: <MoveLeft size={20} />,
    turn_right: <MoveRight size={20} />,
    smile: <Smile size={20} />,
    look_up: <ArrowUp size={20} />,
    look_down: <ArrowDown size={20} />,
};

export default function LivenessChallenge({
    challenge,
    timeRemaining,
    challengeIndex,
    totalChallenges,
    onActionDetected,
}: LivenessChallengeProps) {
    const progress = (timeRemaining / challenge.duration) * 100;

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                onActionDetected();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onActionDetected]);

    return (
        <div className="liveness-challenge">
            <div className="liveness-progress">
                {challengeIndex + 1} / {totalChallenges}
            </div>
            <div className="liveness-instruction-wrapper">
                <span className="liveness-icon">{CHALLENGE_ICONS[challenge.type]}</span>
                <span className="liveness-instruction">{challenge.instruction}</span>
            </div>
            <p className="loading-subtext" style={{ marginTop: '0.35rem' }}>
                Keep your head still until the verifier confirms.
            </p>
            <button
                className="liveness-skip-button"
                onClick={onActionDetected}
            >
                Skip
            </button>
        </div>
    );
}
