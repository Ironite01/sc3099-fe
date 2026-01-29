/**
 * Tests for CheckInButton component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckInButton from '../CheckInButton';

describe('CheckInButton Component', () => {
    const defaultProps = {
        sessionId: 'session-123',
        sessionName: 'CS101 Lecture',
        onCheckIn: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initial Render', () => {
        it('should render button with Check In text', () => {
            render(<CheckInButton {...defaultProps} />);

            expect(screen.getByRole('button', { name: /check in to cs101 lecture/i })).toBeInTheDocument();
            expect(screen.getByText('Check In')).toBeInTheDocument();
        });

        it('should have correct aria-label', () => {
            render(<CheckInButton {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label', 'Check in to CS101 Lecture');
        });

        it('should have check-in-button class', () => {
            render(<CheckInButton {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('check-in-button');
        });

        it('should render shield icon', () => {
            render(<CheckInButton {...defaultProps} />);

            const svg = document.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    describe('Click Handler', () => {
        it('should call onCheckIn with sessionId when clicked', async () => {
            const mockOnCheckIn = jest.fn().mockResolvedValue(undefined);
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockOnCheckIn).toHaveBeenCalledWith('session-123');
            });
        });

        it('should call onCheckIn only once per click', async () => {
            const mockOnCheckIn = jest.fn().mockResolvedValue(undefined);
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockOnCheckIn).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading spinner while processing', async () => {
            const mockOnCheckIn = jest.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Checking in...')).toBeInTheDocument();
            });
        });

        it('should show spinner element during loading', async () => {
            const mockOnCheckIn = jest.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(document.querySelector('.spinner')).toBeInTheDocument();
            });
        });

        it('should disable button while loading', async () => {
            const mockOnCheckIn = jest.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toBeDisabled();
            });
        });

        it('should prevent multiple clicks while loading', async () => {
            const mockOnCheckIn = jest.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);
            fireEvent.click(button);
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockOnCheckIn).toHaveBeenCalledTimes(1);
            });
        });

        it('should return to normal state after loading completes', async () => {
            const mockOnCheckIn = jest.fn().mockResolvedValue(undefined);
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Check In')).toBeInTheDocument();
            });

            expect(button).not.toBeDisabled();
        });

        // Note: Testing error handling would require the component to have a try/catch
        // block instead of try/finally. The current implementation lets errors propagate,
        // which is valid behavior but complex to test with unhandled rejection handlers.
    });

    describe('Disabled State', () => {
        it('should be disabled when disabled prop is true', () => {
            render(<CheckInButton {...defaultProps} disabled={true} />);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
        });

        it('should not call onCheckIn when disabled', () => {
            const mockOnCheckIn = jest.fn();
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} disabled={true} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            expect(mockOnCheckIn).not.toHaveBeenCalled();
        });

        it('should be disabled when both disabled prop and loading', async () => {
            const mockOnCheckIn = jest.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );
            render(<CheckInButton {...defaultProps} onCheckIn={mockOnCheckIn} disabled={true} />);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();

            // Should not be able to click to start loading
            fireEvent.click(button);
            expect(mockOnCheckIn).not.toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('should be focusable when not disabled', () => {
            render(<CheckInButton {...defaultProps} />);

            const button = screen.getByRole('button');
            button.focus();
            expect(document.activeElement).toBe(button);
        });

        it('should have descriptive aria-label with session name', () => {
            render(
                <CheckInButton
                    {...defaultProps}
                    sessionName="Advanced Machine Learning Workshop"
                />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute(
                'aria-label',
                'Check in to Advanced Machine Learning Workshop'
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long session names', () => {
            const longName = 'A'.repeat(200);
            render(<CheckInButton {...defaultProps} sessionName={longName} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label', `Check in to ${longName}`);
        });

        it('should handle empty session name', () => {
            render(<CheckInButton {...defaultProps} sessionName="" />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label', 'Check in to ');
        });

        it('should handle special characters in session name', () => {
            render(
                <CheckInButton {...defaultProps} sessionName="CS101: Intro & Basics <Advanced>" />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute(
                'aria-label',
                'Check in to CS101: Intro & Basics <Advanced>'
            );
        });
    });
});
