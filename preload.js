const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rouge', {
  on: (channel, fn) => ipcRenderer.on(channel, (_e, data) => fn(data)),
  send: (channel, data) => ipcRenderer.send(channel, data),
});
