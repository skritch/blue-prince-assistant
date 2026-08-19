import type { Room, RoomData } from '../types'
import rawRooms from './rooms.json'

export const ROOMS: Room[] = (rawRooms as RoomData[]).map((r) => ({
  ...r,
}))
