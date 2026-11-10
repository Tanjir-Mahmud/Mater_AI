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

  // Milestone 3 IPC
  getThreads: (agentId: string) => Promise<any[]>;
  createThread: (agentId: string, title?: string, kind?: string, parentThreadId?: string, sourceMessageId?: string) => Promise<any>;
  renameThread: (threadId: string, newTitle: string) => Promise<boolean>;
  closeThread: (threadId: string) => Promise<boolean>;
  deleteThread: (threadId: string) => Promise<boolean>;
  getMessages: (threadId: string) => Promise<any[]>;
  branchThreadFromMessage: (threadId: string, messageId: string, branchTitle?: string) => Promise<any>;
  compactThread: (threadId: string, turnsToPreserve?: number) => Promise<{ success: boolean; summary: string; compactedTurns: number }>;
  getQueue: (agentId: string) => Promise<any[]>;
  pauseQueue: (agentId: string) => Promise<boolean>;
  resumeQueue: (agentId: string) => Promise<boolean>;
  cancelQueuedMessage: (queueId: string) => Promise<boolean>;
  submitTurnMessage: (payload: {
    agentId: string;
    threadId: string;
    providerId: string;
    model: string;
    messageText: string;
    attachments?: any[];
  }) => Promise<{ queued: boolean; turnId?: string; reply?: any; error?: string }>;
  getActiveTurnCount: () => Promise<number>;
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

  // Milestone 3 IPC
  getThreads: (agentId) => ipcRenderer.invoke('chat:get-threads', agentId),
  createThread: (agentId, title, kind, parentThreadId, sourceMessageId) =>
    ipcRenderer.invoke('chat:create-thread', { agentId, title, kind, parentThreadId, sourceMessageId }),
  renameThread: (threadId, newTitle) => ipcRenderer.invoke('chat:rename-thread', { threadId, newTitle }),
  closeThread: (threadId) => ipcRenderer.invoke('chat:close-thread', threadId),
  deleteThread: (threadId) => ipcRenderer.invoke('chat:delete-thread', threadId),
  getMessages: (threadId) => ipcRenderer.invoke('chat:get-messages', threadId),
  branchThreadFromMessage: (threadId, messageId, branchTitle) =>
    ipcRenderer.invoke('chat:branch-thread', { threadId, messageId, branchTitle }),
  compactThread: (threadId, turnsToPreserve) =>
    ipcRenderer.invoke('chat:compact-thread', { threadId, turnsToPreserve }),
  getQueue: (agentId) => ipcRenderer.invoke('chat:get-queue', agentId),
  pauseQueue: (agentId) => ipcRenderer.invoke('chat:pause-queue', agentId),
  resumeQueue: (agentId) => ipcRenderer.invoke('chat:resume-queue', agentId),
  cancelQueuedMessage: (queueId) => ipcRenderer.invoke('chat:cancel-queued', queueId),
  submitTurnMessage: (payload) => ipcRenderer.invoke('chat:submit-turn', payload),
  getActiveTurnCount: () => ipcRenderer.invoke('chat:get-active-turn-count'),
};

contextBridge.exposeInMainWorld('openbot', bridge);
