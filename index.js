const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware pro zpracování JSON i formulářových dat
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Servírování statických souborů (např. HTML, CSS, obrázky) ze složky "public"
app.use(express.static(path.join(__dirname, 'public')));

// Prozatímní "databáze"
const USERS = {
  'admin': 'secret',
  'frantisek': 'heslo'
};

//Přihlášení
app.post('/login', (req, res) => {
    const { username, password} = req.body;

    if(USERS[username] && USERS[username] === password) {
        res.status(200).json({ message: 'Přihlášení úspěšné!'});
    } else {
        res.status(401).json({ message: 'Neplatné přihlašovací údaje.' });
      }
});

app.listen(port, () => {
    console.log(`Server běží na http://localhost:${port}`);
});