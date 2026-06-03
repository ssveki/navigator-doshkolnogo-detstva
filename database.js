const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Автоматически создаём папку data, если её нет
const dbDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Создаём все таблицы
db.serialize(() => {
    // Новости
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        img TEXT DEFAULT '',
        sliderImages TEXT DEFAULT '[]',
        files TEXT DEFAULT '[]'
    )`);

    // Мероприятия
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT DEFAULT '',
        files TEXT DEFAULT '[]'
    )`);

    // Календарь
    db.run(`CREATE TABLE IF NOT EXISTS calendar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT DEFAULT '',
        link TEXT DEFAULT '',
        type TEXT DEFAULT 'other'
    )`);

    // Книги
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT DEFAULT '',
        description TEXT DEFAULT '',
        cover TEXT DEFAULT '',
        file TEXT DEFAULT ''
    )`);

    // Полезные ссылки
    db.run(`CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT DEFAULT ''
    )`);

    // Методические разработки
    db.run(`CREATE TABLE IF NOT EXISTS methodical (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        files TEXT DEFAULT '[]'
    )`);

    // Администратор
    db.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);
});

// ---------- Модели ----------

// Новости
const newsModel = {
    getAll: () => new Promise((resolve, reject) => {
        db.all('SELECT * FROM news ORDER BY date DESC', (err, rows) => {
            if (err) reject(err);
            const news = rows.map(row => ({
                ...row,
                sliderImages: JSON.parse(row.sliderImages || '[]'),
                files: JSON.parse(row.files || '[]')
            }));
            resolve(news);
        });
    }),
    getById: (id) => new Promise((resolve, reject) => {
        db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            if (row) {
                row.sliderImages = JSON.parse(row.sliderImages || '[]');
                row.files = JSON.parse(row.files || '[]');
            }
            resolve(row);
        });
    }),
    create: (item) => new Promise((resolve, reject) => {
        const { title, date, text, img, sliderImages, files } = item;
        db.run(
            'INSERT INTO news (title, date, text, img, sliderImages, files) VALUES (?, ?, ?, ?, ?, ?)',
            [title, date, text || '', img || '', JSON.stringify(sliderImages || []), JSON.stringify(files || [])],
            function(err) { if (err) reject(err); resolve({ id: this.lastID }); }
        );
    }),
    update: (id, item) => new Promise((resolve, reject) => {
        const { title, date, text, img, sliderImages, files } = item;
        db.run(
            'UPDATE news SET title=?, date=?, text=?, img=?, sliderImages=?, files=? WHERE id=?',
            [title, date, text || '', img || '', JSON.stringify(sliderImages || []), JSON.stringify(files || []), id],
            (err) => {
                if (err) {
                    console.error('Ошибка обновления новости:', err);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    }),
    delete: (id) => new Promise((resolve, reject) => {
        db.run('DELETE FROM news WHERE id = ?', [id], (err) => { if (err) reject(err); resolve(); });
    })
};

// Мероприятия
const eventsModel = {
    getAll: () => new Promise((resolve, reject) => {
        db.all('SELECT * FROM events ORDER BY date DESC', (err, rows) => {
            if (err) reject(err);
            const events = rows.map(row => ({
                ...row,
                files: JSON.parse(row.files || '[]')
            }));
            resolve(events);
        });
    }),
    create: (item) => new Promise((resolve, reject) => {
        const { title, date, description, files } = item;
        db.run(
            'INSERT INTO events (title, date, description, files) VALUES (?, ?, ?, ?)',
            [title, date, description || '', JSON.stringify(files || [])],
            function(err) { if (err) reject(err); resolve({ id: this.lastID }); }
        );
    }),
    update: (id, item) => new Promise((resolve, reject) => {
        const { title, date, description, files } = item;
        db.run(
            'UPDATE events SET title=?, date=?, description=?, files=? WHERE id=?',
            [title, date, description || '', JSON.stringify(files || []), id],
            (err) => { if (err) reject(err); resolve(); }
        );
    }),
    delete: (id) => new Promise((resolve, reject) => {
        db.run('DELETE FROM events WHERE id = ?', [id], (err) => { if (err) reject(err); resolve(); });
    })
};

// Календарь
const calendarModel = {
    getAll: () => new Promise((resolve, reject) => {
        db.all('SELECT * FROM calendar ORDER BY date ASC', (err, rows) => { if (err) reject(err); resolve(rows); });
    }),
    create: (item) => new Promise((resolve, reject) => {
        const { title, date, description, link, type } = item;
        db.run(
            'INSERT INTO calendar (title, date, description, link, type) VALUES (?, ?, ?, ?, ?)',
            [title, date, description || '', link || '', type || 'other'],
            function(err) { if (err) reject(err); resolve({ id: this.lastID }); }
        );
    }),
    update: (id, item) => new Promise((resolve, reject) => {
        const { title, date, description, link, type } = item;
        db.run(
            'UPDATE calendar SET title=?, date=?, description=?, link=?, type=? WHERE id=?',
            [title, date, description || '', link || '', type || 'other', id],
            (err) => { if (err) reject(err); resolve(); }
        );
    }),
    delete: (id) => new Promise((resolve, reject) => {
        db.run('DELETE FROM calendar WHERE id = ?', [id], (err) => { if (err) reject(err); resolve(); });
    })
};

// Книги
const booksModel = {
    getAll: () => new Promise((resolve, reject) => {
        db.all('SELECT * FROM books ORDER BY title ASC', (err, rows) => { if (err) reject(err); resolve(rows); });
    }),
    create: (item) => new Promise((resolve, reject) => {
        const { title, author, description, cover, file } = item;
        db.run(
            'INSERT INTO books (title, author, description, cover, file) VALUES (?, ?, ?, ?, ?)',
            [title, author || '', description || '', cover || '', file || ''],
            function(err) { if (err) reject(err); resolve({ id: this.lastID }); }
        );
    }),
    update: (id, item) => new Promise((resolve, reject) => {
        const { title, author, description, cover, file } = item;
        db.run(
            'UPDATE books SET title=?, author=?, description=?, cover=?, file=? WHERE id=?',
            [title, author || '', description || '', cover || '', file || '', id],
            (err) => { if (err) reject(err); resolve(); }
        );
    }),
    delete: (id) => new Promise((resolve, reject) => {
        db.run('DELETE FROM books WHERE id = ?', [id], (err) => { if (err) reject(err); resolve(); });
    })
};

// Полезные ссылки
const linksModel = {
    getAll: () => new Promise((resolve, reject) => {
        db.all('SELECT * FROM links ORDER BY title ASC', (err, rows) => { if (err) reject(err); resolve(rows); });
    }),
    create: (item) => new Promise((resolve, reject) => {
        const { title, url, description } = item;
        db.run(
            'INSERT INTO links (title, url, description) VALUES (?, ?, ?)',
            [title, url, description || ''],
            function(err) { if (err) reject(err); resolve({ id: this.lastID }); }
        );
    }),
    update: (id, item) => new Promise((resolve, reject) => {
        const { title, url, description } = item;
        db.run(
            'UPDATE links SET title=?, url=?, description=? WHERE id=?',
            [title, url, description || '', id],
            (err) => { if (err) reject(err); resolve(); }
        );
    }),
    delete: (id) => new Promise((resolve, reject) => {
        db.run('DELETE FROM links WHERE id = ?', [id], (err) => { if (err) reject(err); resolve(); });
    })
};

// Методические разработки
const methodicalModel = {
    getAll: () => new Promise((resolve, reject) => {
        db.all('SELECT * FROM methodical ORDER BY id DESC', (err, rows) => {
            if (err) reject(err);
            const items = rows.map(row => ({
                ...row,
                files: JSON.parse(row.files || '[]')
            }));
            resolve(items);
        });
    }),
    create: (item) => new Promise((resolve, reject) => {
        const { title, description, files } = item;
        db.run(
            'INSERT INTO methodical (title, description, files) VALUES (?, ?, ?)',
            [title, description || '', JSON.stringify(files || [])],
            function(err) { if (err) reject(err); resolve({ id: this.lastID }); }
        );
    }),
    update: (id, item) => new Promise((resolve, reject) => {
        const { title, description, files } = item;
        db.run(
            'UPDATE methodical SET title=?, description=?, files=? WHERE id=?',
            [title, description || '', JSON.stringify(files || []), id],
            (err) => { if (err) reject(err); resolve(); }
        );
    }),
    delete: (id) => new Promise((resolve, reject) => {
        db.run('DELETE FROM methodical WHERE id = ?', [id], (err) => { if (err) reject(err); resolve(); });
    })
};

module.exports = {
    db,
    newsModel,
    eventsModel,
    calendarModel,
    booksModel,
    linksModel,
    methodicalModel
};