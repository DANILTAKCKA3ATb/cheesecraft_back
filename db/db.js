const { Pool, Client } = require("pg");
require("dotenv").config();

const client = new Client("postgres://zcqtikfy:GuqqO1WtRQYB9KRuj2V7C2N_UxoIICpe@trumpet.db.elephantsql.com/zcqtikfy");

client.connect(function (err) {
    if (err) {
        return console.error("could not connect to postgres", err);
    }
    client.query('SELECT NOW() AS "theTime"', function (err, result) {
        if (err) {
            return console.error("error running query", err);
        }
        console.log(result.rows[0].theTime);
    });
});

module.exports = client;
