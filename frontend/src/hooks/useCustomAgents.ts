// ============================================
// SmartAlgo - Custom Agents Persistence Hook
// Manages saved agents & simulation records in localStorage
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { SavedAgent, SimulationRecord, AgentDecision } from '@/types/trading';

const AGENTS_KEY = 'smartalgo_custom_agents';
const RECORDS_KEY = 'smartalgo_sim_records';

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

export function useCustomAgents() {
    const [savedAgents, setSavedAgents] = useState<SavedAgent[]>(() =>
        loadFromStorage<SavedAgent>(AGENTS_KEY, [])
    );
    const [simulationRecords, setSimulationRecords] = useState<SimulationRecord[]>(() =>
        loadFromStorage<SimulationRecord>(RECORDS_KEY, [])
    );

    // Sync across tabs
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === AGENTS_KEY) {
                setSavedAgents(loadFromStorage<SavedAgent>(AGENTS_KEY, []));
            }
            if (e.key === RECORDS_KEY) {
                setSimulationRecords(loadFromStorage<SimulationRecord>(RECORDS_KEY, []));
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // ========== AGENT CRUD ==========

    const addAgent = useCallback((agent: Omit<SavedAgent, 'id' | 'createdAt' | 'updatedAt'>): SavedAgent => {
        const newAgent: SavedAgent = {
            ...agent,
            id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        setSavedAgents(prev => {
            const updated = [newAgent, ...prev];
            saveToStorage(AGENTS_KEY, updated);
            return updated;
        });
        return newAgent;
    }, []);

    const updateAgent = useCallback((id: string, updates: Partial<Omit<SavedAgent, 'id' | 'createdAt'>>) => {
        setSavedAgents(prev => {
            const updated = prev.map(a =>
                a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
            );
            saveToStorage(AGENTS_KEY, updated);
            return updated;
        });
    }, []);

    const deleteAgent = useCallback((id: string) => {
        setSavedAgents(prev => {
            const updated = prev.filter(a => a.id !== id);
            saveToStorage(AGENTS_KEY, updated);
            return updated;
        });
        // Also delete related simulation records
        setSimulationRecords(prev => {
            const updated = prev.filter(r => r.agentId !== id);
            saveToStorage(RECORDS_KEY, updated);
            return updated;
        });
    }, []);

    const getAgent = useCallback((id: string): SavedAgent | undefined => {
        return savedAgents.find(a => a.id === id);
    }, [savedAgents]);

    // ========== SIMULATION RECORDS ==========

    const addSimulationRecord = useCallback((record: Omit<SimulationRecord, 'id'>): SimulationRecord => {
        const newRecord: SimulationRecord = {
            ...record,
            id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        setSimulationRecords(prev => {
            // Keep last 50 records max to avoid localStorage bloat
            const updated = [newRecord, ...prev].slice(0, 50);
            saveToStorage(RECORDS_KEY, updated);
            return updated;
        });
        return newRecord;
    }, []);

    const getRecordsForAgent = useCallback((agentId: string): SimulationRecord[] => {
        return simulationRecords.filter(r => r.agentId === agentId);
    }, [simulationRecords]);

    const clearRecords = useCallback(() => {
        setSimulationRecords([]);
        saveToStorage(RECORDS_KEY, []);
    }, []);

    return {
        // Agents
        savedAgents,
        addAgent,
        updateAgent,
        deleteAgent,
        getAgent,
        // Records
        simulationRecords,
        addSimulationRecord,
        getRecordsForAgent,
        clearRecords,
    };
}
