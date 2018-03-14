'use strict';

const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const client = require('./db-client');

app.get('/api/books', (request, response) => {
    client.query(`
        SELECT 
            id, 
            title,
            author,
            isbn,
            image_url,
            description 
        FROM books;    
    `)
        .then(result => response.send(result.rows))
        .catch(err => {
            console.error(err);
        });
});

app.get('/api/books/:id', (request, response) => {
    const id = request.params.id;
    client.query(
        `
        SELECT *
        FROM books
        WHERE id = $1;        
        `,
        [id]
    )
        .then(result => {
            if(result.rows.length === 0) response.sendStatus(404);
            else response.send(result.rows[0]);
        })
        .catch(err => {
            console.error(err);
        });
});

app.post('/api/books/new', (request, response) => {
    const body = request.body;
    client.query(`
        INSERT INTO books (
            title, 
            author,
            isbn,
            image_url,
            description 
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *; 
    `,
    [body.title, body.author, body.isbn, body.image_url, body.description]
    )
        .then(result => response.send(result.rows[0]))
        .catch(err => {
            console.log(err);
        });
});

app.put('/api/books/:id', (request, response) => {

    const body = request.body;

    client.query(`
        UPDATE books
        SET title=$1, 
            author=$2,
            isbn=$3,
            image_url=$4,
            description=$5
        WHERE id=$6
        RETURNING *;   
    `,
    [body.title, body.author, body.isbn, body.image_url, body.description, body.id]
    )
        .then(result => response.send(result.rows[0]))
        .catch(err => {
            console.log(err);
        });

});

app.listen(PORT, () => {
    console.log('server running on PORT ', PORT);
});
