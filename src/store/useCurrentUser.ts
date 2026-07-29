import { USERS } from '@/data/users'
import { useStore } from '@/store/index'
import type { User } from '@/types'

export function useCurrentUser(): User | null {
  const id = useStore((s) => s.currentUserId)
  if (!id) return null
  return USERS.find((u) => u.id === id) ?? null
}
