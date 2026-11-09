import { contextBridge, ipcRenderer } from 'electron';

export interface OpenBotBridge {
  platform: string;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  confirmQuit: () => Promise<void>;
  onQuitRequest: (callback: () => void) => () => void;
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  zoomReset: () => Promise<number>;
  getCustomPalettes: () => Promise<any[]>;
  onPaletteChanged: (callback: (filename: string) => void) => () => void;
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => () => void;
}

const bridge: OpenBotBridge = {
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('app:get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('app:save-settings', settings),
  confirmQuit: () => ipcRenderer.invoke('app:confirm-quit'),
  onQuitRequest: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('app:request-quit', handler);
    return () => ipcRenderer.removeListener('app:request-quit', handler);
  },
  zoomIn: () => ipcRenderer.invoke('window:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('window:zoom-out'),
  zoomReset: () => ipcRenderer.invoke('window:zoom-reset'),
  getCustomPalettes: () => ipcRenderer.invoke('theme:get-custom-palettes'),
  onPaletteChanged: (callback: (filename: string) => void) => {
    const handler = (_: any, filename: string) => callback(filename);
    ipcRenderer.on('theme:palette-changed', handler);
    return () => ipcRenderer.removeListener('theme:palette-changed', handler);
  },
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => {
    const handler = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

contextBridge.exposeInMainWorld('openbot', bridge);
