const { contextBridge, ipcRenderer, desktopCapturer } = require("electron");

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
  listDesktopSources: async () => {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: { width: 320, height: 180 }
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  },
  onProtocolUrl: (callback) => ipcRenderer.on("protocol:url", (_event, url) => callback(url)),
  onStartInstantMeeting: (callback) => ipcRenderer.on("app:start-instant-meeting", callback),
  onMeetingJoin: (callback) => ipcRenderer.on("meeting:join", (_event, payload) => callback(payload))
});
