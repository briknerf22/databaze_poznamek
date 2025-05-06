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

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Nastavení session
app.use(session({
  secret: 'tvé tajné heslo', // Zvol si silný klíč
  resave: false,
  saveUninitialized: true
}));

// Načtení uživatelů
function loadUsers() {
  if (!fs.existsSync(usersFile)) return {};
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Chyba při načítání users.json:', err);
    return {};
  }
}

// Uložení uživatelů
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

// Registrace
app.post('/register', (req, res) => {
  const { username, password, consent } = req.body;

  if (!username || !password || consent !== true) {
    return res.status(400).json({ message: 'Neplatná registrace. Zkontrolujte všechny údaje.' });
  }

  const users = loadUsers();

  if (users[username]) {
    return res.status(409).json({ message: 'Uživatel už existuje.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  users[username] = {
    password: hashedPassword,
    consent: true
  };

  saveUsers(users);

  res.status(201).json({ message: 'Úspěšně zaregistrováno! Můžete se přihlásit.' });
});

// Přihlášení
// Přihlášení
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users[username];
  if (!user) {
    return res.status(401).json({ message: 'Neplatné přihlašovací údaje.' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Neplatné přihlašovací údaje.' });
  }

  // Uložení uživatele do session
  req.session.username = username;

  console.log('Přihlášený uživatel:', req.session.username); // Výpis uživatele v session
  console.log('Celý objekt session:', req.session); // Výpis celé session objektu

  res.status(200).json({ message: 'Úspěšně přihlášen!' });
});

// Zkontroluj přihlášení
app.get('/checkSession', (req, res) => {
  console.log('Kontrola session:', req.session); // Výpis objektu session při kontrole
  if (req.session.username) {
    return res.json({ loggedIn: true });
  }
  return res.json({ loggedIn: false });
});

// Middleware pro ochranu stránek
function isAuthenticated(req, res, next) {
  console.log('Ověřování přihlášení:', req.session.username); // Výpis uživatele v session
  if (!req.session.username) {
    return res.redirect('/index.html');  // Pokud není přihlášený, přesměruj na login
  }
  next();  // Pokud je přihlášený, pokračuj
}

// Přístup k poznámkám
app.get('/poznamky.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poznamky.html'));
});

// Přidání poznámky
const notes = [];

app.post('/notes', (req, res) => {
  const { title, content } = req.body;

  const newNote = {
    id: notes.length + 1,
    title,
    content,
    createdAt: new Date()
  };

  notes.push(newNote);
  res.status(200).json(newNote);
});

// Odhlášení
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Chyba při odhlašování.' });
    }
    res.redirect('/index.html'); // Po odhlášení přesměrování na přihlašovací stránku
  });
});

// Spuštění serveru
app.listen(port, () => {
  console.log(`✅ Server běží na http://localhost:${port}`);
});