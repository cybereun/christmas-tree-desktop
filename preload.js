const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ignoreMouse: (v) => ipcRenderer.send('ignore-mouse', v),
  focusable: (v) => ipcRenderer.send('focusable', v),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: () => ipcRenderer.send('drag-move'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  menu: () => ipcRenderer.send('menu'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  onSettings: (cb) => ipcRenderer.on('settings', (_e, s) => cb(s)),
  onCmd: (cb) => ipcRenderer.on('cmd', (_e, c) => cb(c)),
});
