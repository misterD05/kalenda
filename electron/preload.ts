import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  getTusks: () => ipcRenderer.invoke('get-tusks'),
  getTuskTypes: () => ipcRenderer.invoke('get-tusktypes'),
  insertTusk: ( data: any) => ipcRenderer.invoke('insert-tusk', data),
  insertTuskType: (data: any) => ipcRenderer.invoke('insert-tusktype', data),
  deleteTusk: ( id: number) => ipcRenderer.invoke('delete-tusk', id),
  deleteTuskType: (id: number) => ipcRenderer.invoke('delete-tusktype', id),
  updateTusks: ( data: any) => ipcRenderer.invoke('update-tusk', data),
  updateTuskTypes: ( data: any) => ipcRenderer.invoke('update-tusktype', data),
})

