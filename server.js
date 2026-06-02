const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { db, newsModel } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'ваш-секретный-ключ-для-jwt'; // смените на сложный

// Middleware
app.use(cors());                          // разрешаем кросс-доменные запросы
app.use(express.json());                 // парсим JSON тело запросов
app.use(express.static('public'));       // раздаём статические файлы (весь фронтенд)

// -------------------- Аутентификация --------------------
// Проверка, существует ли администратор (при первом запуске создаём)
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

// Маршрут входа
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const admin = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM admin WHERE username = ?', [username], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });

    if (!admin) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Выпускаем JWT токен (действует 24 часа)
    const token = jwt.sign({ username: admin.username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token });
});

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) return res.status(401).json({ error: 'Не авторизован' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный или истёкший токен' });
        req.user = user;
        next();
    });
}

// -------------------- API для новостей --------------------
// Получить все новости (публичный доступ)
app.get('/api/news', async (req, res) => {
    try {
        const news = await newsModel.getAll();
        res.json(news);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить одну новость по ID
app.get('/api/news/:id', async (req, res) => {
    try {
        const news = await newsModel.getById(req.params.id);
        if (!news) return res.status(404).json({ error: 'Новость не найдена' });
        res.json(news);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить новость (только для админа)
app.post('/api/news', authenticateToken, async (req, res) => {
    try {
        const { title, date, text, img, sliderImages } = req.body;
        if (!title || !date || !text) {
            return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
        }
        const result = await newsModel.create({ title, date, text, img, sliderImages });
        res.status(201).json({ id: result.id, message: 'Новость добавлена' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить новость (админ)
app.put('/api/news/:id', authenticateToken, async (req, res) => {
    try {
        const { title, date, text, img, sliderImages } = req.body;
        await newsModel.update(req.params.id, { title, date, text, img, sliderImages });
        res.json({ message: 'Новость обновлена' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить новость (админ)
app.delete('/api/news/:id', authenticateToken, async (req, res) => {
    try {
        await newsModel.delete(req.params.id);
        res.json({ message: 'Новость удалена' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Запуск сервера
ensureAdmin().then(() => {
    app.listen(PORT, () => {
        console.log(`Сервер запущен на http://localhost:${PORT}`);
    });
});