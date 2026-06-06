import { contextBridge, ipcRenderer } from 'electron'

// Save/load uses localStorage, which works natively in Electron's Chromium renderer.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  quit: () => ipcRenderer.send('quit-app'),
})
