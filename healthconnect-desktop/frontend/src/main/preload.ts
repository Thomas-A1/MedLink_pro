import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('healthconnect', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  onSyncStatus: (callback: (payload: any) => void) => {
    ipcRenderer.on('sync:status', (_, payload) => callback(payload));
    return () => ipcRenderer.removeAllListeners('sync:status');
  },
});
