import * as SQLite from 'expo-sqlite';

export interface PersonalEvent {
  id?: number;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: string;
  note?: string;
}

const DB_NAME = 'idol_app_local.db';

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS personal_events (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      category TEXT,
      note TEXT
    );
  `);
};

export const addPersonalEvent = async (event: PersonalEvent) => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const result = await db.runAsync(
    'INSERT INTO personal_events (title, date, time, category, note) VALUES (?, ?, ?, ?, ?)',
    event.title,
    event.date,
    event.time || '',
    event.category,
    event.note || ''
  );
  return result.lastInsertRowId;
};

export const getPersonalEvents = async (): Promise<PersonalEvent[]> => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const allRows = await db.getAllAsync<PersonalEvent>('SELECT * FROM personal_events ORDER BY date ASC, time ASC');
  return allRows;
};

export const deletePersonalEvent = async (id: number) => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.runAsync('DELETE FROM personal_events WHERE id = ?', id);
};
