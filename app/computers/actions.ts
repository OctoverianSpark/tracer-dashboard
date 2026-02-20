import { Notification } from "@/types/Notification"



export const getMachines = async () => {
  const computers = await (await fetch('http://localhost:3000/machines/list')).json()

  console.log(computers);
  
  return computers.machines
  


}

export const getMachineReport = async (computerName:string,date:string)=>{
  const screenshots = await (await fetch(`http://localhost:3000/machines/get-report?computername=${computerName}&date=${date}`)).json()

  return screenshots
  
}

export const lockMachine = async (machineId:string) => {
  const computer = await (await fetch(`http://localhost:3000/machines/${machineId}/lock`,{method:'POST'})).json()
  
  


}

export const sendFileToMachine = async (machineId:string,formData: FormData) => {
  
      const response = await fetch(
        `http://localhost:3000/machines/${machineId}/send-file`,
        {
          method: 'POST',
          body: formData
        }
      )
  
      const result = await response.json()
      console.log(result)
}


export const getIPInfo = async (IP: string) => {
  const localization = await fetch(`https://api.ipdata.co/${IP}?api-key=158f6934b48763c73b31e48f46f89c4105450c0571f66d4e305e7286`)

  return localization.json()
  
}

export const sendNotice  = async (machineId:string, notification:Notification) => {
  const computer = await (await fetch(`http://localhost:3000/machines/${machineId}/notify`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(notification)})).json()
}
