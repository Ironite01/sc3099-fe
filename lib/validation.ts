// Email validation - requires format: user@domain.tld
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const isValidEmail = (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length === 0 || trimmed.length > 254) return false;

    const parts = trimmed.split('@');
    if (parts.length !== 2) return false;

    const domain = parts[1];
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;

    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) return false;

    return EMAIL_REGEX.test(trimmed);
};

export const validateEmail = (email: string): string | true => {
    if (!email || email.trim().length === 0) {
        return 'Email is required';
    }
    if (!isValidEmail(email)) {
        return 'Please enter a valid email address';
    }
    return true;
};

export const validatePassword = (password: string): string | true => {
    if (!password || password.length === 0) {
        return 'Password is required';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (password.length > 128) {
        return 'Password must be less than 128 characters';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least 1 uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least 1 lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least 1 number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Password must contain at least 1 special character';
    }
    return true;
};

export const validateFullName = (name: string): string | true => {
    if (!name || name.trim().length === 0) {
        return 'Full name is required';
    }
    if (name.trim().length < 2) {
        return 'Name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
        return 'Name must be less than 100 characters';
    }
    if (!/^[a-zA-Z\s\-']+$/.test(name.trim())) {
        return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return true;
};

export const validateConfirmPassword = (confirmPassword: string, password: string): string | true => {
    if (!confirmPassword || confirmPassword.length === 0) {
        return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
        return 'Passwords do not match';
    }
    return true;
};

export const validateRequired = (value: string, fieldName: string): string | true => {
    if (!value || value.trim().length === 0) {
        return `${fieldName} is required`;
    }
    return true;
};
