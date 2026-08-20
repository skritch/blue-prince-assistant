import type { Room } from '../types'
import rawRooms from './rooms.json'


export const ROOM_46_REWARDS = ['trophy-room', 'gallery', 'trophy-room', 'mount-holly-gift-shop']
export const POOL_ADDITIONS = ['sauna', 'locker-room', 'pump-room']
export const ADHOC_ADDITIONS = ['morning-room', 'armory']
export const UNDRAFTABLE = ['secret-garden', 'room-8', 'room-46']

export const ROOMS: Room[] = (rawRooms).map((r) => ({
  ...r,
} as Room))

export const ROOM_BY_SLUG: Record<string, Room> = Object.fromEntries(
  ROOMS.map((r) => [r.slug, r])
)

export function roomsForPage(page: number): Room[] {
  return ROOMS.filter((r) => r.directoryPage === page)
}
