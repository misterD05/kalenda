import { BrowserWindow, app, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
//#region electron/main.ts
var require = createRequire(import.meta.url);
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var db = new (require("better-sqlite3"))(path.join(app.getPath("userData"), "kalenda.db"));
db.prepare(`
  CREATE TABLE IF NOT EXISTS TuskType (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    color TEXT

    
  );

`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS Tusk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    start DATE,
    end DATE,
    idType INTEGER,
    place TEXT,
    timeBefore DATE
  );

`).run();
ipcMain.handle("get-tusktypes", () => {
	try {
		return db.prepare("SELECT * FROM TuskType").all();
	} catch (error) {
		console.error(error);
		return [];
	}
});
ipcMain.handle("get-tusks", () => {
	try {
		return db.prepare("SELECT * FROM Tusk").all();
	} catch (error) {
		console.error(error);
		return [];
	}
});
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
var win;
function createWindow() {
	win = new BrowserWindow({
		frame: false,
		titleBarStyle: "hidden",
		icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
		webPreferences: { preload: path.join(__dirname, "preload.mjs") }
	});
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
