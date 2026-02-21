import { useState, useCallback, useEffect } from 'react';

const AUTH_KEY = 'smartalgo_auth';

// Hardcoded credentials
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin@123';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem(AUTH_KEY) === 'true';
    });

    const login = useCallback((username: string, password: string): boolean => {
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            localStorage.setItem(AUTH_KEY, 'true');
            setIsAuthenticated(true);
            return true;
        }
        return false;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
    }, []);

    // Sync across tabs
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === AUTH_KEY) {
                setIsAuthenticated(e.newValue === 'true');
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return { isAuthenticated, login, logout };
}
