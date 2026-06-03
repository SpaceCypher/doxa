import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentState = {
  id: string;
  loc: [number, number];
  state: string;
  civ: string;
  inventory?: {
    food: number;
    wood: number;
    water: number;
  };
};

export type AgentLogEntry = {
  agent_id: string;
  action: string;
  reasoning: string;
  tick: number;
};

export type TelemetryPayload = {
  tick: number;
  agents: AgentState[];
  asabiyyah: number | Record<string, number>;
  cpr?: {
    wood?: number;
    water?: number;
    resources?: Array<{ id: string; type: string; x: number; y: number; amount: number; crop_age?: number }>;
    structures?: Array<{ builder: string; structure: string; x: number; y: number; tick: number }>;
  };
  logs?: Omit<AgentLogEntry, 'tick'>[];
  // Phase 8 fields forwarded directly on the payload
  territory?: Record<string, string>;      // zone_key → civ_id
  war_state?: Record<string, string[]>;    // civ_id → [enemy_civ_ids]
  world_map?: number[][];
  world_seed?: number | null;
  tech_tree?: Record<string, string[]>;
};

interface TelemetryStore {
  tick: number;
  agents: AgentState[];
  asabiyyah: number | Record<string, number>;
  cpr: NonNullable<TelemetryPayload['cpr']> & {
    territory?: Record<string, string>;
    war_state?: Record<string, string[]>;
  };
  world_map: number[][];
  world_seed: number | null;
  tech_tree: Record<string, string[]>;
  history: TelemetryPayload[];
  centralLogs: AgentLogEntry[];
  connected: boolean;
  focusedAgent: string | null;
  setTelemetry: (payload: TelemetryPayload) => void;
  setConnected: (status: boolean) => void;
  setFocusedAgent: (id: string | null) => void;
  clearLogs: () => void;
}

export const useTelemetry = create<TelemetryStore>()(
  persist(
    (set) => ({
      tick: 0,
      agents: [],
      asabiyyah: 0,
      cpr: {},
      world_map: [],
      world_seed: null,
      tech_tree: {},
      history: [],
      centralLogs: [],
      connected: false,
      focusedAgent: null,
      setTelemetry: (payload) => set((state) => {
        if (payload.tick === -1) {
          return {
            ...state,
            tick: payload.tick,
            agents: [],
            asabiyyah: 0,
            cpr: {},
            world_map: [],
            world_seed: null,
            tech_tree: {},
            history: [],
            // Keep centralLogs on -1 tick (errors) so we don't wipe history on error
          };
        }

        const newHistory = [...state.history, payload].slice(-100);
        const incomingLogs = (payload.logs || []).map(log => ({ ...log, tick: payload.tick }));
        const newLogs = [...state.centralLogs, ...incomingLogs].slice(-500); // Increased log history to 500
        return {
          tick: payload.tick,
          agents: payload.agents,
          asabiyyah: payload.asabiyyah,
          cpr: {
            ...(payload.cpr || {}),
            // Merge Phase 8 fields into cpr so CanvasGrid can access them via useTelemetry cpr
            territory: payload.territory ?? {},
            war_state: payload.war_state ?? {},
          },
          world_map: payload.world_map !== undefined ? payload.world_map : state.world_map,
          world_seed: payload.world_seed !== undefined ? payload.world_seed : state.world_seed,
          tech_tree: payload.tech_tree !== undefined ? payload.tech_tree : state.tech_tree,
          history: newHistory,
          centralLogs: newLogs,
        };
      }),
      setConnected: (status) => set({ connected: status }),
      setFocusedAgent: (id) => set({ focusedAgent: id }),
      clearLogs: () => set({ centralLogs: [], history: [], tick: 0 }),
    }),
    {
      name: 'doxa-telemetry-storage',
      partialize: (state) => ({ centralLogs: state.centralLogs, history: state.history, tick: state.tick }),
    }
  )
);
