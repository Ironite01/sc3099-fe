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
    blink: <Eye size={20} />,
    turn_left: <MoveLeft size={20} />,
    turn_right: <MoveRight size={20} />,
    smile: <Smile size={20} />,
    nod: <ArrowDown size={20} />,
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
            <div className="liveness-instruction-wrapper">
                <span className="liveness-icon">{CHALLENGE_ICONS[challenge.type]}</span>
                <span className="liveness-instruction">{challenge.instruction}</span>
            </div>
            <button
                className="liveness-done-button"
                onClick={onActionDetected}
            >
                Done
            </button>
        </div>
    );
}
