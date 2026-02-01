'use client';

import { useEffect } from 'react';
import { Eye, MoveLeft, MoveRight, Smile, ArrowDown } from 'lucide-react';
import type { LivenessChallenge as LivenessChallengeType } from '@/lib/types';

interface LivenessChallengeProps {
    challenge: LivenessChallengeType;
    timeRemaining: number;
    challengeIndex: number;
    totalChallenges: number;
    onActionDetected: () => void;
}

const CHALLENGE_ICONS: Record<LivenessChallengeType['type'], React.ReactNode> = {
    blink: <Eye size={64} />,
    turn_left: <MoveLeft size={64} />,
    turn_right: <MoveRight size={64} />,
    smile: <Smile size={64} />,
    nod: <ArrowDown size={64} />,
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
            <div className="liveness-progress-bar">
                <div
                    className="liveness-progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="liveness-step-indicator">
                Challenge {challengeIndex + 1} of {totalChallenges}
            </div>

            <div className="liveness-icon-wrapper">
                {CHALLENGE_ICONS[challenge.type]}
            </div>

            <h2 className="liveness-instruction">{challenge.instruction}</h2>

            <p className="liveness-hint">
                Perform the action, then tap the button below
            </p>

            <button
                className="liveness-action-button"
                onClick={onActionDetected}
            >
                Done
            </button>
        </div>
    );
}
