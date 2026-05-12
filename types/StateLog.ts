export interface StateLog {
  id?: Number
  computer_id: Number
  state: StateLogState
  category: StateLogCategory,
  type: StateLogType,
  timestamp: string,

}


export enum StateLogState {
  TRABAJANDO,   // 0
  OVERTIME,     // 1
  BREAK,        // 2
  WC,           // 3
  ALMUERZO,     // 4
  IDLE,         // 5
  OFFLINE       // 6
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