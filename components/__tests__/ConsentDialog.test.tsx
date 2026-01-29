/**
 * Tests for ConsentDialog component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConsentDialog from '../ConsentDialog';

describe('ConsentDialog Component', () => {
    const defaultCameraProps = {
        type: 'camera' as const,
        isOpen: true,
        onAccept: jest.fn(),
        onDecline: jest.fn(),
    };

    const defaultGeolocationProps = {
        type: 'geolocation' as const,
        isOpen: true,
        onAccept: jest.fn(),
        onDecline: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Visibility', () => {
        it('should render when isOpen is true', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should not render when isOpen is false', () => {
            render(<ConsentDialog {...defaultCameraProps} isOpen={false} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should render nothing when isOpen is false', () => {
            const { container } = render(
                <ConsentDialog {...defaultCameraProps} isOpen={false} />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Camera Consent Dialog', () => {
        it('should display camera permission title', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(screen.getByText('Camera Permission Required')).toBeInTheDocument();
        });

        it('should display camera description', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(
                screen.getByText(/to verify your identity for check-in, we need access to your camera/i)
            ).toBeInTheDocument();
        });

        it('should display camera consent points', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(screen.getByText('Used only for identity verification')).toBeInTheDocument();
            expect(screen.getByText('Face image is not permanently stored')).toBeInTheDocument();
            expect(screen.getByText('Processed securely with encryption')).toBeInTheDocument();
            expect(screen.getByText('You can revoke access anytime')).toBeInTheDocument();
        });

        it('should mention camera in privacy notice', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(screen.getByText(/use of your camera/i)).toBeInTheDocument();
        });
    });

    describe('Geolocation Consent Dialog', () => {
        it('should display location permission title', () => {
            render(<ConsentDialog {...defaultGeolocationProps} />);

            expect(screen.getByText('Location Permission Required')).toBeInTheDocument();
        });

        it('should display location description', () => {
            render(<ConsentDialog {...defaultGeolocationProps} />);

            expect(
                screen.getByText(/to verify you are physically present at the session location/i)
            ).toBeInTheDocument();
        });

        it('should display geolocation consent points', () => {
            render(<ConsentDialog {...defaultGeolocationProps} />);

            expect(screen.getByText('Used to verify physical presence')).toBeInTheDocument();
            expect(screen.getByText('Location checked only during check-in')).toBeInTheDocument();
            expect(screen.getByText('Not tracked outside of check-in')).toBeInTheDocument();
            expect(screen.getByText('You can revoke access anytime')).toBeInTheDocument();
        });

        it('should mention geolocation in privacy notice', () => {
            render(<ConsentDialog {...defaultGeolocationProps} />);

            expect(screen.getByText(/use of your geolocation/i)).toBeInTheDocument();
        });
    });

    describe('Buttons', () => {
        it('should render Decline and Allow Access buttons', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /allow access/i })).toBeInTheDocument();
        });

        it('should call onDecline when Decline is clicked', () => {
            const mockOnDecline = jest.fn();
            render(<ConsentDialog {...defaultCameraProps} onDecline={mockOnDecline} />);

            const declineButton = screen.getByRole('button', { name: /decline/i });
            fireEvent.click(declineButton);

            expect(mockOnDecline).toHaveBeenCalledTimes(1);
        });

        it('should call onAccept when Allow Access is clicked', () => {
            const mockOnAccept = jest.fn();
            render(<ConsentDialog {...defaultCameraProps} onAccept={mockOnAccept} />);

            const acceptButton = screen.getByRole('button', { name: /allow access/i });
            fireEvent.click(acceptButton);

            expect(mockOnAccept).toHaveBeenCalledTimes(1);
        });

        it('should have correct CSS classes on buttons', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const declineButton = screen.getByRole('button', { name: /decline/i });
            const acceptButton = screen.getByRole('button', { name: /allow access/i });

            expect(declineButton).toHaveClass('consent-button', 'decline');
            expect(acceptButton).toHaveClass('consent-button', 'accept');
        });
    });

    describe('Accessibility', () => {
        it('should have role="dialog"', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should have aria-modal="true"', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-modal', 'true');
        });

        it('should have aria-labelledby pointing to title', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-labelledby', 'consent-title');

            const title = screen.getByText('Camera Permission Required');
            expect(title).toHaveAttribute('id', 'consent-title');
        });
    });

    describe('Privacy Policy Link', () => {
        it('should contain privacy policy link', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const link = screen.getByRole('link', { name: /privacy policy/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/privacy');
        });

        it('should have privacy-link class', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const link = screen.getByRole('link', { name: /privacy policy/i });
            expect(link).toHaveClass('privacy-link');
        });
    });

    describe('CSS Classes', () => {
        it('should have consent-overlay class on container', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const overlay = document.querySelector('.consent-overlay');
            expect(overlay).toBeInTheDocument();
        });

        it('should have consent-dialog class on dialog box', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const dialogBox = document.querySelector('.consent-dialog');
            expect(dialogBox).toBeInTheDocument();
        });

        it('should have consent-icon class on icon container', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const iconContainer = document.querySelector('.consent-icon');
            expect(iconContainer).toBeInTheDocument();
        });

        it('should have consent-points class on list', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const pointsList = document.querySelector('.consent-points');
            expect(pointsList).toBeInTheDocument();
        });
    });

    describe('Icons', () => {
        it('should render camera icon for camera type', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const svg = document.querySelector('.consent-icon svg');
            expect(svg).toBeInTheDocument();
            // Camera icon has specific path
            expect(svg?.querySelector('circle')).toBeInTheDocument();
        });

        it('should render location icon for geolocation type', () => {
            render(<ConsentDialog {...defaultGeolocationProps} />);

            const svg = document.querySelector('.consent-icon svg');
            expect(svg).toBeInTheDocument();
            // Location icon has specific path
            expect(svg?.querySelector('path')).toBeInTheDocument();
        });

        it('should render checkmark icons for consent points', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const pointsListItems = document.querySelectorAll('.consent-points li');
            expect(pointsListItems.length).toBe(4);

            pointsListItems.forEach((item) => {
                const svg = item.querySelector('svg');
                expect(svg).toBeInTheDocument();
            });
        });
    });

    describe('Consent Notice', () => {
        it('should display consent notice with info icon', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            const notice = document.querySelector('.consent-notice');
            expect(notice).toBeInTheDocument();

            const svg = notice?.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });

        it('should include action consent text', () => {
            render(<ConsentDialog {...defaultCameraProps} />);

            expect(
                screen.getByText(/by clicking "allow access", you consent/i)
            ).toBeInTheDocument();
        });
    });
});
