/// <reference types="vite/client" />
export {};

declare global {
  interface Window {
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, ...args: any[]) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
    api: {
      getTusks: () => Promise<any[]>;
      getTuskTypes: () => Promise<any[]>;
      insertTusk: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      insertTuskType: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteTusk: (id: number) => Promise<{ success: boolean; error?: string }>;
      deleteTuskType: (id: number) => Promise<{ success: boolean; error?: string }>;
      updateTusks: (data: any) => Promise<{ success: boolean; error?: string }>;
      updateTuskTypes: (data: any) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
