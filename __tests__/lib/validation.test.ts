/**
 * Tests for validation functions
 */

import {
    isValidEmail,
    validateEmail,
    validatePassword,
    validateFullName,
    validateConfirmPassword,
    validateRequired,
} from '@/lib/validation';

describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.org')).toBe(true);
        expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
        expect(isValidEmail('firstname.lastname@company.com')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('notanemail')).toBe(false);
        expect(isValidEmail('missing@domain')).toBe(false);
        expect(isValidEmail('@nodomain.com')).toBe(false);
        expect(isValidEmail('spaces in@email.com')).toBe(false);
        expect(isValidEmail('test@.com')).toBe(false);
    });

    it('should return false for null/undefined', () => {
        expect(isValidEmail(null as any)).toBe(false);
        expect(isValidEmail(undefined as any)).toBe(false);
    });

    it('should return false for emails exceeding max length', () => {
        const longEmail = 'a'.repeat(250) + '@test.com';
        expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should return false for TLD less than 2 characters', () => {
        expect(isValidEmail('test@domain.a')).toBe(false);
    });
});

describe('validateEmail', () => {
    it('should return true for valid emails', () => {
        expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should return error message for empty email', () => {
        expect(validateEmail('')).toBe('Email is required');
        expect(validateEmail('   ')).toBe('Email is required');
    });

    it('should return error message for invalid email', () => {
        expect(validateEmail('invalid')).toBe('Please enter a valid email address');
    });
});

describe('validatePassword', () => {
    it('should return true for valid passwords', () => {
        expect(validatePassword('Password1!')).toBe(true);
        expect(validatePassword('Str0ng@Pass')).toBe(true);
        expect(validatePassword('MyP@ssw0rd')).toBe(true);
    });

    it('should return error for empty password', () => {
        expect(validatePassword('')).toBe('Password is required');
    });

    it('should return error for password less than 8 characters', () => {
        expect(validatePassword('Pass1!')).toBe('Password must be at least 8 characters');
    });

    it('should return error for password exceeding 128 characters', () => {
        const longPassword = 'Aa1!' + 'a'.repeat(130);
        expect(validatePassword(longPassword)).toBe('Password must be less than 128 characters');
    });

    it('should return error for password without uppercase', () => {
        expect(validatePassword('password1!')).toBe('Password must contain at least 1 uppercase letter');
    });

    it('should return error for password without lowercase', () => {
        expect(validatePassword('PASSWORD1!')).toBe('Password must contain at least 1 lowercase letter');
    });

    it('should return error for password without number', () => {
        expect(validatePassword('Password!')).toBe('Password must contain at least 1 number');
    });

    it('should return error for password without special character', () => {
        expect(validatePassword('Password1')).toBe('Password must contain at least 1 special character');
    });
});

describe('validateFullName', () => {
    it('should return true for valid names', () => {
        expect(validateFullName('John Doe')).toBe(true);
        expect(validateFullName('Mary-Jane Watson')).toBe(true);
        expect(validateFullName("O'Connor")).toBe(true);
    });

    it('should return error for empty name', () => {
        expect(validateFullName('')).toBe('Full name is required');
        expect(validateFullName('   ')).toBe('Full name is required');
    });

    it('should return error for name less than 2 characters', () => {
        expect(validateFullName('A')).toBe('Name must be at least 2 characters');
    });

    it('should return error for name exceeding 100 characters', () => {
        const longName = 'A'.repeat(101);
        expect(validateFullName(longName)).toBe('Name must be less than 100 characters');
    });

    it('should return error for name with invalid characters', () => {
        expect(validateFullName('John123')).toBe('Name can only contain letters, spaces, hyphens, and apostrophes');
        expect(validateFullName('John@Doe')).toBe('Name can only contain letters, spaces, hyphens, and apostrophes');
    });
});

describe('validateConfirmPassword', () => {
    it('should return true when passwords match', () => {
        expect(validateConfirmPassword('Password1!', 'Password1!')).toBe(true);
    });

    it('should return error for empty confirm password', () => {
        expect(validateConfirmPassword('', 'Password1!')).toBe('Please confirm your password');
    });

    it('should return error when passwords do not match', () => {
        expect(validateConfirmPassword('Password1!', 'Different1!')).toBe('Passwords do not match');
    });
});

describe('validateRequired', () => {
    it('should return true for non-empty values', () => {
        expect(validateRequired('value', 'Field')).toBe(true);
    });

    it('should return error for empty values', () => {
        expect(validateRequired('', 'Username')).toBe('Username is required');
        expect(validateRequired('   ', 'Email')).toBe('Email is required');
    });
});
