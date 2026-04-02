import { StateLog } from "@/types/StateLog";

export const getStateLog = async (id: number) => {


  const { data } = await (await fetch(`http://localhost:3000/tracer/get-state-logs?personal_id=${id}`)).json()
  console.log(id, data as StateLog);
  return data;

}