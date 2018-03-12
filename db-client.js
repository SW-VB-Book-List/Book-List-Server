const env = require('dotenv').config();
const pg = require('pg');


const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/books';

const conString = 'DATABASE_URL';
const client = new pg.Client(DATABASE_URL);

client.connect();

client.on('error', err => 'error');

module.exports = client;



