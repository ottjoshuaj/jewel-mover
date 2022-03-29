import * as core from 'express-serve-static-core';
import express from 'express'

import apiRoutes from './routers/apiRoutes';

const bodyParser = require('body-parser');

export async function createApp() : Promise<core.Express> {
    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false}));

    //Routes
    app.use('/api', apiRoutes);

    app.get('/', (req, res) => {
        res.status(200).send('UNKNOWN')
    })

    return app;
}