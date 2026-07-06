import { StateCategory, WorkState } from "./States"

export interface StateLog {
  id?: Number
  computer_id: Number
  code: number             // código crudo (0-6) tal como lo manda el agente; siempre presente aunque el catálogo se haya borrado
  state: WorkState | null  // null si el estado del catálogo fue borrado (soft FK)
  category: StateCategory | null
  type: StateLogType,
  timestamp: string,

}

export enum StateLogType {
  AUTO,
  MANUAL
}