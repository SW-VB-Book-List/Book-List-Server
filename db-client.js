const dotenv = require('dotenv')
dotenv.config();

const pg = require('pg');


const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:wastu3eg@localhost:5432/books';

const conString = 'DATABASE_URL';
const client = new pg.Client(DATABASE_URL);

client.connect()
    .then(() => console.log('connected to db', DATABASE_URL))
    .catch(err => console.error('connection error', err));

client.on('error', err => console.error(err));

module.exports = client;



