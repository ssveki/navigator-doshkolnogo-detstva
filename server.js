const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const {
    db,
    newsModel,
    eventsModel,
    calendarModel,
    booksModel,
    linksModel,
    methodicalModel
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'ваш-секретный-ключ-для-jwt';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// ================== Аутентификация ==================
async function ensureAdmin() {
    const admin = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM admin WHERE username = ?', ['admin'], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
    if (!admin) {
        const hash = await bcrypt.hash('Navigator2026!', 10);
        db.run('INSERT INTO admin (username, password) VALUES (?, ?)', ['admin', hash]);
        console.log('Администратор создан: admin / Navigator2026!');
    }
}

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Логин и пароль обязательны' });
        const admin = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM admin WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
        if (!admin) return res.status(401).json({ error: 'Неверный логин или пароль' });
        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) return res.status(401).json({ error: 'Неверный логин или пароль' });
        const token = jwt.sign({ username: admin.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token });
    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Не авторизован' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный или истёкший токен' });
        req.user = user;
        next();
    });
}

// ================== Новости ==================
app.get('/api/news', async (req, res) => {
    try { res.json(await newsModel.getAll()); } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.get('/api/news/:id', async (req, res) => {
    try {
        const news = await newsModel.getById(req.params.id);
        if (!news) return res.status(404).json({ error: 'Новость не найдена' });
        res.json(news);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.post('/api/news', authenticateToken, async (req, res) => {
    try {
        const { title, date, text, img, sliderImages, files } = req.body;
        if (!title || !date) return res.status(400).json({ error: 'Заголовок и дата обязательны' });
        const result = await newsModel.create({ title, date, text: text || '', img: img || '', sliderImages, files });
        res.status(201).json({ id: result.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/news/:id', authenticateToken, async (req, res) => {
    try {
        await newsModel.update(req.params.id, req.body);
        res.json({ message: 'Новость обновлена' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/news/:id', authenticateToken, async (req, res) => {
    try { await newsModel.delete(req.params.id); res.json({ message: 'Новость удалена' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ================== Мероприятия ==================
app.get('/api/events', async (req, res) => {
    try { res.json(await eventsModel.getAll()); } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.post('/api/events', authenticateToken, async (req, res) => {
    try {
        const { title, date, description, files } = req.body;
        if (!title || !date) return res.status(400).json({ error: 'Заголовок и дата обязательны' });
        const result = await eventsModel.create({ title, date, description: description || '', files });
        res.status(201).json({ id: result.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/events/:id', authenticateToken, async (req, res) => {
    try { await eventsModel.update(req.params.id, req.body); res.json({ message: 'Мероприятие обновлено' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/events/:id', authenticateToken, async (req, res) => {
    try { await eventsModel.delete(req.params.id); res.json({ message: 'Мероприятие удалено' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ================== Календарь ==================
app.get('/api/calendar', async (req, res) => {
    try { res.json(await calendarModel.getAll()); } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.post('/api/calendar', authenticateToken, async (req, res) => {
    try {
        const { title, date, description, link, type } = req.body;
        if (!title || !date) return res.status(400).json({ error: 'Заголовок и дата обязательны' });
        const result = await calendarModel.create({ title, date, description: description || '', link, type });
        res.status(201).json({ id: result.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/calendar/:id', authenticateToken, async (req, res) => {
    try { await calendarModel.update(req.params.id, req.body); res.json({ message: 'Событие обновлено' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/calendar/:id', authenticateToken, async (req, res) => {
    try { await calendarModel.delete(req.params.id); res.json({ message: 'Событие удалено' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ================== Книги ==================
app.get('/api/books', async (req, res) => {
    try { res.json(await booksModel.getAll()); } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.post('/api/books', authenticateToken, async (req, res) => {
    try {
        const { title, author, description, cover, file } = req.body;
        if (!title) return res.status(400).json({ error: 'Название обязательно' });
        const result = await booksModel.create({ title, author: author || '', description: description || '', cover: cover || '', file: file || '' });
        res.status(201).json({ id: result.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/books/:id', authenticateToken, async (req, res) => {
    try { await booksModel.update(req.params.id, req.body); res.json({ message: 'Книга обновлена' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/books/:id', authenticateToken, async (req, res) => {
    try { await booksModel.delete(req.params.id); res.json({ message: 'Книга удалена' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ================== Ссылки ==================
app.get('/api/links', async (req, res) => {
    try { res.json(await linksModel.getAll()); } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.post('/api/links', authenticateToken, async (req, res) => {
    try {
        const { title, url, description } = req.body;
        if (!title || !url) return res.status(400).json({ error: 'Название и URL обязательны' });
        const result = await linksModel.create({ title, url, description: description || '' });
        res.status(201).json({ id: result.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/links/:id', authenticateToken, async (req, res) => {
    try { await linksModel.update(req.params.id, req.body); res.json({ message: 'Ссылка обновлена' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/links/:id', authenticateToken, async (req, res) => {
    try { await linksModel.delete(req.params.id); res.json({ message: 'Ссылка удалена' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ================== Методические разработки ==================
app.get('/api/methodical', async (req, res) => {
    try { res.json(await methodicalModel.getAll()); } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.post('/api/methodical', authenticateToken, async (req, res) => {
    try {
        const { title, description, files } = req.body;
        if (!title) return res.status(400).json({ error: 'Название обязательно' });
        const result = await methodicalModel.create({ title, description: description || '', files });
        res.status(201).json({ id: result.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/methodical/:id', authenticateToken, async (req, res) => {
    try { await methodicalModel.update(req.params.id, req.body); res.json({ message: 'Разработка обновлена' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/methodical/:id', authenticateToken, async (req, res) => {
    try { await methodicalModel.delete(req.params.id); res.json({ message: 'Разработка удалена' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// Запуск
ensureAdmin().then(() => {
    app.listen(PORT, () => {
        console.log(`Сервер запущен на http://localhost:${PORT}`);
    });
});