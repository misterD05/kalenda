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
    timeBefore DATE,
    FOREIGN KEY(idType) REFERENCES TuskType(id) ON DELETE SET NULL
  );

`).run();
ipcMain.handle("insert-tusktype", (event, typeData) => {
	try {
		return {
			success: true,
			id: db.prepare("INSERT INTO TuskType (name, description, color) VALUES (@name, @description, @color)").run(typeData).lastInsertRowid
		};
	} catch (error) {
		console.error("Errore insert-tusktype:", error);
		return {
			success: false,
			error
		};
	}
});
ipcMain.handle("get-tusktypes", () => {
	try {
		return db.prepare("SELECT * FROM TuskType ORDER BY name ASC").all();
	} catch (error) {
		console.error("Errore get-tusktypes:", error);
		return [];
	}
});
ipcMain.handle("update-tusktype", (event, typeData) => {
	try {
		if (db.prepare(`
        UPDATE TuskType
        SET name = @name, description = @description, color = @color
        WHERE id = @id
      `).run(typeData).changes === 0) return {
			success: false,
			error: "Tipo non trovato"
		};
		return { success: true };
	} catch (error) {
		console.error("Errore update-tusktype:", error);
		return {
			success: false,
			error
		};
	}
});
ipcMain.handle("delete-tusktype", (event, typeId) => {
	try {
		if (db.prepare("DELETE FROM TuskType WHERE id = ?").run(typeId).changes === 0) return {
			success: false,
			error: "Tipo non trovato"
		};
		return { success: true };
	} catch (error) {
		console.error("Errore delete-tusktype:", error);
		return {
			success: false,
			error
		};
	}
});
ipcMain.handle("insert-tusk", (event, tuskData) => {
	try {
		return {
			success: true,
			id: db.prepare(`
        INSERT INTO Tusk (name, start, end, idType, place, timeBefore)
        VALUES (@name, @start, @end, @idType, @place, @timeBefore)
      `).run(tuskData).lastInsertRowid
		};
	} catch (error) {
		console.error("Errore insert-tusk:", error);
		return {
			success: false,
			error
		};
	}
});
ipcMain.handle("get-tusks", () => {
	try {
		return db.prepare(`
        SELECT
          T.id, T.name, T.start, T.end, T.place, T.timeBefore,
          TT.name as typeName, TT.color as typeColor
        FROM Tusk T
        LEFT JOIN TuskType TT ON T.idType = TT.id
        ORDER BY T.start ASC
      `).all();
	} catch (error) {
		console.error("Errore get-tusks:", error);
		return [];
	}
});
ipcMain.handle("update-tusk", (event, tuskData) => {
	try {
		if (db.prepare(`
        UPDATE Tusk
        SET name = @name, start = @start, end = @end,
            idType = @idType, place = @place, timeBefore = @timeBefore
        WHERE id = @id
      `).run(tuskData).changes === 0) return {
			success: false,
			error: "Task non trovato"
		};
		return { success: true };
	} catch (error) {
		console.error("Errore update-tusk:", error);
		return {
			success: false,
			error
		};
	}
});
ipcMain.handle("delete-tusk", (event, tuskId) => {
	try {
		if (db.prepare("DELETE FROM Tusk WHERE id = ?").run(tuskId).changes === 0) return {
			success: false,
			error: "Task non trovato"
		};
		return { success: true };
	} catch (error) {
		console.error("Errore delete-tusk:", error);
		return {
			success: false,
			error
		};
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
