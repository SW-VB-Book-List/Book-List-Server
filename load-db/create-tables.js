'use strict';

const client = require('../db-client');

client.query(`
    CREATE TABLE IF NOT EXISTS books(
        id SERIAL PRIMARY KEY,
        title VARCHAR(256) NOT NULL,
        author VARCHAR(256) NOT NULL,
        isbn VARCHAR(256) NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT NOT NULL
    )
`).then(
    () => console.log('db task successful!'),
    err => console.error(err)
).then(() => client.end());