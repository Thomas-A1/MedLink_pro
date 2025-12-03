export {}; // ensure this file is a module

declare global {
  interface ImportMeta {
    readonly env: {
      readonly MODE: string;
      // add other Vite env vars here if needed
    };
  }

  interface Window {
    healthconnect: {
      getVersion: () => Promise<string>;
      onSyncStatus: (callback: (payload: any) => void) => () => void;
    };
  }
}
