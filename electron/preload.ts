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

  // Milestone 2 IPC
  getProviderCatalogue: () => Promise<any[]>;
  getProviderStatuses: () => Promise<Record<string, string>>;
  connectProvider: (providerId: string) => Promise<{ success: boolean; status: string; error?: string }>;
  disconnectProvider: (providerId: string) => Promise<void>;
  detectLocalModelServers: () => Promise<{ ollama: boolean; lmStudio: boolean }>;

  generateAgentDraft: (prompt: string) => Promise<any>;
  createAgent: (agentData: any) => Promise<{ success: boolean; agent: any }>;
  deleteAgent: (agentId: string) => Promise<{ success: boolean; workspaceDeleted: boolean }>;
  exportAgentTemplate: (agentId: string) => Promise<{ success: boolean; template: any }>;

  sendMessage: (payload: { agentId: string; providerId: string; model: string; message: string }) => Promise<any>;
  captureScreenshot: (savePath?: string) => Promise<string>;
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

  // Milestone 2 IPC
  getProviderCatalogue: () => ipcRenderer.invoke('providers:get-catalogue'),
  getProviderStatuses: () => ipcRenderer.invoke('providers:get-statuses'),
  connectProvider: (providerId: string) => ipcRenderer.invoke('providers:connect', providerId),
  disconnectProvider: (providerId: string) => ipcRenderer.invoke('providers:disconnect', providerId),
  detectLocalModelServers: () => ipcRenderer.invoke('providers:detect-local-servers'),

  generateAgentDraft: (prompt: string) => ipcRenderer.invoke('agent:generate-draft', prompt),
  createAgent: (agentData: any) => ipcRenderer.invoke('agent:create', agentData),
  deleteAgent: (agentId: string) => ipcRenderer.invoke('agent:delete', agentId),
  exportAgentTemplate: (agentId: string) => ipcRenderer.invoke('agent:export-template', agentId),

  sendMessage: (payload) => ipcRenderer.invoke('chat:send-message', payload),
  captureScreenshot: (savePath) => ipcRenderer.invoke('window:capture-screenshot', savePath),
};

contextBridge.exposeInMainWorld('openbot', bridge);
