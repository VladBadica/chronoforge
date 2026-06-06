import { contextBridge } from 'electron'

// Save/load uses localStorage, which works natively in Electron's Chromium renderer.
// Expose platform so the renderer can adapt UI if needed in the future.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
