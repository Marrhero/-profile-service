require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {createTable} = require('./database');
const profileRoutes = require('./routes/profiles');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', profileRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    await createTable();
    console.log('Server running on port{PORT}');
});