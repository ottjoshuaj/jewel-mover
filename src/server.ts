import { createApp} from "./app";
import http from 'http';

const config = require('../config.json');

let server: http.Server;
const port = config.localServer.port;

createApp().then((app) => {
    app.set('port', port);

    server = http.createServer(app);
    server.listen(port);
})