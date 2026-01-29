/**
 * Tests for SessionCard component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionCard from '../SessionCard';

describe('SessionCard Component', () => {
    const baseSession = {
        id: 'session-1',
        course_name: 'CS101 - Introduction to Computer Science',
        session_type: 'Lecture',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        location_lat: 1.3521,
        location_lon: 103.8198,
        location_radius_m: 100,
        allow_late_checkin: false,
        late_checkin_minutes: 0,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock Date.now() to a fixed time for consistent testing
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Session Display', () => {
        it('should render course name and session type', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('CS101 - Introduction to Computer Science')).toBeInTheDocument();
            expect(screen.getByText('Lecture')).toBeInTheDocument();
        });

        it('should display location radius', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('Within 100m radius')).toBeInTheDocument();
        });

        it('should display late check-in info when allowed', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            const sessionWithLate = {
                ...baseSession,
                allow_late_checkin: true,
                late_checkin_minutes: 15,
            };

            render(<SessionCard session={sessionWithLate} />);

            expect(screen.getByText('Late check-in allowed (up to 15 min)')).toBeInTheDocument();
        });

        it('should not display late check-in info when not allowed', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.queryByText(/late check-in/i)).not.toBeInTheDocument();
        });
    });

    describe('Session Status', () => {
        it('should show "Active Now" badge when session is active', () => {
            // Set time to during the session
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('Active Now')).toBeInTheDocument();
        });

        it('should show "Upcoming" badge when session is upcoming', () => {
            // Set time to before the session
            jest.setSystemTime(new Date('2024-01-15T09:00:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('Upcoming')).toBeInTheDocument();
        });

        it('should show "Ended" badge when session is past', () => {
            // Set time to after the session
            jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('Ended')).toBeInTheDocument();
        });

        it('should show "Checked In" badge when already checked in', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} isCheckedIn={true} />);

            expect(screen.getByText('Checked In')).toBeInTheDocument();
        });
    });

    describe('Check-in Button', () => {
        it('should show check-in button for active session', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            const mockOnCheckIn = jest.fn();
            render(<SessionCard session={baseSession} onCheckIn={mockOnCheckIn} />);

            expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
        });

        it('should not show check-in button for upcoming session', () => {
            jest.setSystemTime(new Date('2024-01-15T09:00:00Z'));

            const mockOnCheckIn = jest.fn();
            render(<SessionCard session={baseSession} onCheckIn={mockOnCheckIn} />);

            expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();
        });

        it('should not show check-in button for ended session without late check-in', () => {
            jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));

            const mockOnCheckIn = jest.fn();
            render(<SessionCard session={baseSession} onCheckIn={mockOnCheckIn} />);

            expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();
        });

        it('should show check-in button for ended session with late check-in allowed', () => {
            jest.setSystemTime(new Date('2024-01-15T11:10:00Z'));

            const sessionWithLate = {
                ...baseSession,
                allow_late_checkin: true,
                late_checkin_minutes: 15,
            };

            const mockOnCheckIn = jest.fn();
            render(<SessionCard session={sessionWithLate} onCheckIn={mockOnCheckIn} />);

            expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
        });

        it('should not show check-in button when already checked in', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            const mockOnCheckIn = jest.fn();
            render(
                <SessionCard session={baseSession} onCheckIn={mockOnCheckIn} isCheckedIn={true} />
            );

            expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();
        });

        it('should not show check-in button when no onCheckIn handler', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();
        });

        it('should call onCheckIn with session id when clicked', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            const mockOnCheckIn = jest.fn();
            render(<SessionCard session={baseSession} onCheckIn={mockOnCheckIn} />);

            const checkInButton = screen.getByRole('button', { name: /check in/i });
            fireEvent.click(checkInButton);

            expect(mockOnCheckIn).toHaveBeenCalledWith('session-1');
        });
    });

    describe('Checked In State', () => {
        it('should show checked in indicator when checked in', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} isCheckedIn={true} />);

            expect(screen.getByText('You have checked in to this session')).toBeInTheDocument();
        });

        it('should not show checked in indicator when not checked in', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} isCheckedIn={false} />);

            expect(
                screen.queryByText('You have checked in to this session')
            ).not.toBeInTheDocument();
        });
    });

    describe('Time Formatting', () => {
        it('should format session time correctly', () => {
            jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));

            render(<SessionCard session={baseSession} />);

            // The component formats time using toLocaleTimeString
            // Exact format depends on locale, but should contain the hours
            const dateTimeText = screen.getByText(/Jan 15/);
            expect(dateTimeText).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle session at exact start time', () => {
            jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('Active Now')).toBeInTheDocument();
        });

        it('should handle session at exact end time', () => {
            jest.setSystemTime(new Date('2024-01-15T11:00:00Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('Active Now')).toBeInTheDocument();
        });

        it('should handle session one millisecond after end time', () => {
            jest.setSystemTime(new Date('2024-01-15T11:00:01Z'));

            render(<SessionCard session={baseSession} />);

            expect(screen.getByText('Ended')).toBeInTheDocument();
        });
    });
});
