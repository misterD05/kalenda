import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'


const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))



const Database = require('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'kalenda.db');
const db = new Database(dbPath);


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

  ipcMain.handle('insert-tusktype', (event, typeData) => {
    try {
      const stmt = db.prepare(
        'INSERT INTO TuskType (name, description, color) VALUES (@name, @description, @color)'
      );
      // Usiamo i parametri denominati (@name) per sicurezza e pulizia
      const result = stmt.run(typeData);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Errore insert-tusktype:', error);
      return { success: false, error: error };
    }
  });

  ipcMain.handle('get-tusktypes', () => {
    try {
      return db.prepare('SELECT * FROM TuskType ORDER BY name ASC').all();
    } catch (error) {
      console.error('Errore get-tusktypes:', error);
      return [];
    }
  });

  ipcMain.handle('update-tusktype', (event, typeData) => {
    try {
      const stmt = db.prepare(`
        UPDATE TuskType
        SET name = @name, description = @description, color = @color
        WHERE id = @id
      `);
      const result = stmt.run(typeData);

      if (result.changes === 0) {
        return { success: false, error: 'Tipo non trovato' };
      }
      return { success: true };
    } catch (error) {
      console.error('Errore update-tusktype:', error);
      return { success: false, error: error };
    }
  });

  ipcMain.handle('delete-tusktype', (event, typeId) => {
    try {
      const stmt = db.prepare('DELETE FROM TuskType WHERE id = ?');
      const result = stmt.run(typeId);

      if (result.changes === 0) {
        return { success: false, error: 'Tipo non trovato' };
      }
      return { success: true };
    } catch (error) {
      console.error('Errore delete-tusktype:', error);
      return { success: false, error: error };
    }
  });


  ipcMain.handle('insert-tusk', (event, tuskData) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO Tusk (name, start, end, idType, place, timeBefore)
        VALUES (@name, @start, @end, @idType, @place, @timeBefore)
      `);
      const result = stmt.run(tuskData);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Errore insert-tusk:', error);
      return { success: false, error: error };
    }
  });

  ipcMain.handle('get-tusks', () => {
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
      console.error('Errore get-tusks:', error);
      return [];
    }
  });

  ipcMain.handle('update-tusk', (event, tuskData) => {
    try {
      const stmt = db.prepare(`
        UPDATE Tusk
        SET name = @name, start = @start, end = @end,
            idType = @idType, place = @place, timeBefore = @timeBefore
        WHERE id = @id
      `);
      const result = stmt.run(tuskData);

      if (result.changes === 0) {
        return { success: false, error: 'Task non trovato' };
      }
      return { success: true };
    } catch (error) {
      console.error('Errore update-tusk:', error);
      return { success: false, error: error };
    }
  });

  ipcMain.handle('delete-tusk', (event, tuskId) => {
    try {
      const stmt = db.prepare('DELETE FROM Tusk WHERE id = ?');
      const result = stmt.run(tuskId);

      if (result.changes === 0) {
        return { success: false, error: 'Task non trovato' };
      }
      return { success: true };
    } catch (error) {
      console.error('Errore delete-tusk:', error);
      return { success: false, error: error };
    }
  });

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
