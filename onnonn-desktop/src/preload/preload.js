const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, listener) {
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

contextBridge.exposeInMainWorld("electronAPI", {
  getSession: () => ipcRenderer.invoke("session:get"),
  setSession: (payload) => ipcRenderer.invoke("session:set", payload),
  clearSession: () => ipcRenderer.invoke("session:clear"),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  openMeetingWindow: (payload) => ipcRenderer.invoke("window:openMeeting", payload),
  focusMainWindow: () => ipcRenderer.invoke("window:focusMain"),
  closeMeetingWindow: () => ipcRenderer.invoke("meeting:close"),
  showNativeNotification: (payload) => ipcRenderer.invoke("notify:show", payload),
  getPendingProtocolUrls: () => ipcRenderer.invoke("protocol:getPending"),
  selectScreenShareSource: (sourceId) => ipcRenderer.invoke("screen-share:setSource", sourceId),
  listDesktopSources: () => ipcRenderer.invoke("screen-share:listSources"),
  onProtocolUrl: (callback) => subscribe("protocol:url", callback),
  onStartInstantMeeting: (callback) => subscribe("app:start-instant-meeting", callback),
  onMeetingJoin: (callback) => subscribe("meeting:join", callback),
  onSessionRefreshed: (callback) => subscribe("session:refreshed", callback)
});
