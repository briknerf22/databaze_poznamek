require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
const secret = process.env.SECRET;

// Middleware pro zpracování formulářových dat a JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Statické soubory (HTML, CSS, JS) z public/
app.use(express.static(path.join(__dirname, '../public')));

// Prozatímní "databáze"
const USERS = {
  'admin': 'secret',
  'frantisek': 'heslo'
};

// Dočasná "databáze" poznámek
const notes = [];

//Přihlášení
app.post('/login', (req, res) => {
    const { username, password} = req.body;

    if(USERS[username] && USERS[username] === password) {
      res.redirect('/poznamky.html');
    } else {
      res.status(401).json({ message: 'Neplatné přihlašovací údaje.' });
      }
});

// Přidání poznámky
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

// Spuštění serveru
app.listen(port, () => {
  console.log(`Server běží na http://localhost:${port}`);
});