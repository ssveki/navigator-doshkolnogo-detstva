const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

// Создаём таблицы, если их ещё нет
db.serialize(() => {
    // Таблица новостей
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        text TEXT NOT NULL,
        img TEXT DEFAULT '',
        sliderImages TEXT DEFAULT '[]'  -- JSON-строка с массивом URL
    )`);

    // Таблица администратора (логин/пароль)
    db.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);
});

// Вспомогательные функции для работы с новостями
const newsModel = {
    getAll: () => new Promise((resolve, reject) => {
        db.all('SELECT * FROM news ORDER BY date DESC', (err, rows) => {
            if (err) reject(err);
            // Преобразуем sliderImages из JSON-строки в массив
            const news = rows.map(row => ({
                ...row,
                sliderImages: JSON.parse(row.sliderImages || '[]')
            }));
            resolve(news);
        });
    }),
    getById: (id) => new Promise((resolve, reject) => {
        db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            if (row) {
                row.sliderImages = JSON.parse(row.sliderImages || '[]');
            }
            resolve(row);
        });
    }),
    create: (newsItem) => new Promise((resolve, reject) => {
        const { title, date, text, img, sliderImages } = newsItem;
        db.run(
            'INSERT INTO news (title, date, text, img, sliderImages) VALUES (?, ?, ?, ?, ?)',
            [title, date, text, img, JSON.stringify(sliderImages || [])],
            function(err) {
                if (err) reject(err);
                resolve({ id: this.lastID });
            }
        );
    }),
    update: (id, newsItem) => new Promise((resolve, reject) => {
        const { title, date, text, img, sliderImages } = newsItem;
        db.run(
            'UPDATE news SET title = ?, date = ?, text = ?, img = ?, sliderImages = ? WHERE id = ?',
            [title, date, text, img, JSON.stringify(sliderImages || []), id],
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    }),
    delete: (id) => new Promise((resolve, reject) => {
        db.run('DELETE FROM news WHERE id = ?', [id], (err) => {
            if (err) reject(err);
            resolve();
        });
    })
};

module.exports = { db, newsModel };