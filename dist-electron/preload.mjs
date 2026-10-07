let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
	on(...args) {
		const [channel, listener] = args;
		return electron.ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
	},
	off(...args) {
		const [channel, ...omit] = args;
		return electron.ipcRenderer.off(channel, ...omit);
	},
	send(...args) {
		const [channel, ...omit] = args;
		return electron.ipcRenderer.send(channel, ...omit);
	},
	invoke(...args) {
		const [channel, ...omit] = args;
		return electron.ipcRenderer.invoke(channel, ...omit);
	}
});
electron.contextBridge.exposeInMainWorld("api", {
	getTusks: () => electron.ipcRenderer.invoke("get-tusks"),
	getTuskTypes: () => electron.ipcRenderer.invoke("get-tusktypes"),
	insertTusk: (data) => electron.ipcRenderer.invoke("insert-tusk", data),
	insertTuskType: (data) => electron.ipcRenderer.invoke("insert-tusktype", data),
	deleteTusk: (id) => electron.ipcRenderer.invoke("delete-tusk", id),
	deleteTuskType: (id) => electron.ipcRenderer.invoke("delete-tusktype", id),
	updateTusk: (data) => electron.ipcRenderer.invoke("update-tusk", data),
	updateTuskType: (data) => electron.ipcRenderer.invoke("update-tusktype", data),
	importIcs: () => electron.ipcRenderer.invoke("import-ics"),
	on: (channel, callback) => {
		electron.ipcRenderer.on(channel, (event, ...args) => callback(...args));
	}
});
//#endregion
