import { create } from 'zustand'

interface UiState {
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}))
