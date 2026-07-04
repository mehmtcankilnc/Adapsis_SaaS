import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GlobalState {
  globalCurrency: string
  setGlobalCurrency: (currency: string) => void
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      globalCurrency: 'TRY',
      setGlobalCurrency: (currency) => set({ globalCurrency: currency }),
    }),
    {
      name: 'adapsis-global-store',
    }
  )
)
