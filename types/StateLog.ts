import { Timestamp } from "next/dist/server/lib/cache-handlers/types"

export interface StateLog {
  id?: Number
  computer_id: Number
  state: StateLogState
  category: StateLogCategory,
  type: StateLogType,
  timestamp: string,

}


export enum StateLogState {
  TRABAJANDO,
  BREAK,
  WC,
  ALMUERZO,
  IDLE,
  OFFLINE
}
export enum StateLogCategory {
  ACTIVE,
  NEUTRAL,
  INACTIVE
}

export enum StateLogType {
  AUTO,
  MANUAL
}