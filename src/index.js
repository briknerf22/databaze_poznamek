require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

const usersFile = path.join(__dirname, '../data/users.json');
const notesFile = path.join(__dirname, 'notes.json');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Session
app.use(session({
  secret: 'tvé_tajné_heslo', // změň v .env!
  resave: false,
  saveUninitialized: false
}));

// ==== Helpers ==== //
function loadUsers() {
  if (!fs.existsSync(usersFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  } catch (err) {
    console.error('Chyba při načítání uživatelů:', err);
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

function loadNotes() {
  if (!fs.existsSync(notesFile)) return {};
  return JSON.parse(fs.readFileSync(notesFile, 'utf-8'));
}

function saveNotes(notes) {
  fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2));
}

function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ message: 'Nepřihlášený uživatel.' });
  }
  next();
}

// ==== Autentizace ==== //
app.post('/register', (req, res) => {
  const { username, password, consent } = req.body;
  if (!username || !password || consent !== true) {
    return res.status(400).json({ message: 'Zadejte všechny údaje a souhlas.' });
  }

  const users = loadUsers();
  if (users[username]) {
    return res.status(409).json({ message: 'Uživatel již existuje.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  users[username] = { password: hashedPassword, consent: true };
  saveUsers(users);

  res.status(201).json({ message: 'Registrace úspěšná.' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users[username];
  if (!user) return res.status(401).json({ message: 'Neplatné údaje.' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Neplatné údaje.' });

  req.session.username = username;
  res.json({ message: 'Přihlášení úspěšné.' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Chyba při odhlášení.' });
    res.redirect('/index.html');
  });
});

app.get('/checkSession', (req, res) => {
  res.json({ loggedIn: !!req.session.username });
});

// ==== Poznámky ==== //
app.get('/notes', requireLogin, (req, res) => {
  const notes = loadNotes();
  let userNotes = notes[req.session.username] || [];

  if (req.query.important === 'true') {
    userNotes = userNotes.filter(n => n.important);
  }

  res.json(userNotes);
});

app.post('/notes', requireLogin, (req, res) => {
  const { title, content } = req.body;
  const notes = loadNotes();
  const username = req.session.username;

  const newNote = {
    title,
    content,
    important: false,
    createdAt: new Date().toISOString()
  };

  if (!notes[username]) notes[username] = [];
  notes[username].unshift(newNote);
  saveNotes(notes);

  res.status(201).json(newNote);
});

app.put('/notes/:index/important', requireLogin, (req, res) => {
  const index = parseInt(req.params.index, 10);
  const notes = loadNotes();
  const username = req.session.username;

  if (!notes[username] || !notes[username][index]) {
    return res.status(404).json({ message: 'Poznámka nenalezena.' });
  }

  notes[username][index].important = !notes[username][index].important;
  saveNotes(notes);

  res.json({ message: 'Důležitost přepnuta.', note: notes[username][index] });
});

app.delete('/notes/:index', requireLogin, (req, res) => {
  const index = parseInt(req.params.index, 10);
  const notes = loadNotes();
  const username = req.session.username;

  if (!notes[username] || !notes[username][index]) {
    return res.status(404).json({ message: 'Poznámka nenalezena.' });
  }

  notes[username].splice(index, 1);
  saveNotes(notes);

  res.json({ message: 'Poznámka smazána.' });
});

// ==== Zrušení účtu ==== //
app.post('/deleteAccount', requireLogin, async (req, res) => {
  const { password } = req.body;
  const username = req.session.username;

  const users = loadUsers();
  const user = users[username];

  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(403).json({ message: 'Nesprávné heslo.' });
  }

  // Smazání uživatele
  delete users[username];
  saveUsers(users);

  // Smazání poznámek
  const notes = loadNotes();
  delete notes[username];
  saveNotes(notes);

  // Ukončení session
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Chyba při rušení účtu.' });
    res.json({ message: 'Účet byl úspěšně smazán.' });
  });
});

// ==== Statické stránky ==== //
function isAuthenticated(req, res, next) {
  if (!req.session.username) return res.redirect('/index.html');
  next();
}

app.get('/poznamky.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poznamky.html'));
});

// ==== Start serveru ==== //
app.listen(port, () => {
  console.log(`✅ Server běží na http://localhost:${port}`);
});