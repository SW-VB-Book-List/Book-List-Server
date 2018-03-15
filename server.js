'use strict';

const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;
const CLIENT_URL = process.env.CLIENT_URL;
const GOOGLE_BOOKS_API_URL = process.env.GOOGLE_BOOKS_API_URL;
// const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const sa = require('superagent');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const client = require('./db-client');

function ensureAdmin(request, response, next) {

    const token = request.get('token') || request.query.token;
    if(!token) next({ status: 401, message: 'No token found' });

    else if(token !== ADMIN_PASSPHRASE) next({ status: 403, message: 'Unauthorized'});

    else next();
}

app.get('/api/admin', (request, response) => {
    ensureAdmin(request, response, err => {
        response.send({ admin: !err });
    });
});

app.get('/api/books', (request, response, next) => {
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
        .catch(next);
});

app.get('/api/books/:id', (request, response, next) => {
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
            if(result.rows.length === 0) next({ status: 404, message: `Books id ${id} does not exist`});
            else response.send(result.rows[0]);
        })
        .catch(next);
});

function insertBook(book) {
    return client.query(`
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
    [book.title, book.author, book.isbn, book.image_url, book.description]
    )
        .then(result => result.rows[0]);

}

app.post('/api/books/new', (request, response, next) => {
    const body = request.body;

    insertBook(body)
        .then(result => response.send(result))
        .catch(next);
});

app.put('/api/books/:id', (request, response, next) => {

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
        .catch(next);

});

app.delete('/api/books/:id', ensureAdmin, (request, response, next) => {
    const id = request.params.id;

    client.query(`
        DELETE FROM books
        WHERE id=$1;
    `,
    [id]
    )
        .then(result => response.send({ removed: result.rowCount !== 0}))
        .catch(next);

});

app.get('/api/gbooks/:search', (request, response, next) => {
    const search = request.query.search;
    if(!search) return next({ status: 400, message: 'search query must be provided'});

    sa.get(GOOGLE_BOOKS_API_URL)
        .query({
            q: search.trim()
        })
        .then(res => {
            const body = res.body;
            const formatted = {
                total: body.totalResults,
                books: body.Search.map(book => {
                    return {
                        id: book.id,
                        title: book.volumeInfo.title,
                        author: book.volumeInfo.authors,
                        isbn: book.volumeInfo.industryIdentifiers.ISBN_10,
                        image_url: book.volumeInfo.thumbnail,
                        description: book.volumeInfo.description
                    };
                })
            };
            response.send(formatted);

        })
        .catch(next);

});

app.put('/api/books/gbooks/:id', (request, response, next) => {
    const id = request.params.id;

    sa.get(GOOGLE_BOOKS_API_URL)
        .query({
            id: `/${id}`
        })
        .then(res => {
            const book = res.body;
            return insertBook({
                title: book.volumeInfo.title,
                author: book.volumeInfo.authors,
                isbn: book.volumeInfo.industryIdentifiers.ISBN_10,
                image_url: book.volumeInfo.thumbnail,
                description: book.volumeInfo.description
            });
        })
        .then(result => response.send(result))
        .catch(next);


});

app.get('*', (request, response) => {
    response.redirect(CLIENT_URL);

});

app.use((err, request, response, next) => { //eslint-disable-line
    console.error(err);

    if(err.status) {
        response.status(err.status).send({ error: err.message });
    }
    else {
        response.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log('server running on PORT ', PORT);
});
