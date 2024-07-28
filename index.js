const http = require("http");
const fs = require("fs");
const WebSocketServer = require("websocket").server

let connections = [];

// create a raw HTTP server to serve the HTML file
// this will help us create the TCP which will then pass to the websocket to do the job
const httpserver = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        // set CSP headers
        res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self' ws://localhost:8080/chat");

        // Read the HTML file and send it as response
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// listen on the TCP socket
httpserver.listen(8080, () => console.log("My server is listening on port 8080"))

// pass the httpserver object to the WebSocketServer library to do all the job, this class will override the req/res
const websocket = new WebSocketServer({ "httpServer": httpserver })

// when a legit WebSocket request comes in on the /chat path, listen to it and get the connection
websocket.on("request", request => {
    if (request.resourceURL.pathname === '/chat') {
        const connection = request.accept(null, request.origin);

        connection.on("message", message => {
            // someone just sent a message, tell everybody
            connections.forEach(c => c.send(`User${connection.socket.remotePort} says: ${message.utf8Data}`));
        });

        connections.push(connection);

        // someone just connected, tell everybody
        connections.forEach(c => c.send(`User${connection.socket.remotePort} just connected.`));

        connection.on("close", () => {
            connections = connections.filter(c => c !== connection);
            // someone just disconnected, tell everybody
            connections.forEach(c => c.send(`User${connection.socket.remotePort} just disconnected.`));
        });
    } else {
        request.reject();
        console.log('WebSocket connection rejected');
    }
});

// connect to http://localhost:8080/ and open developer tool, and type:
// let ws = new WebSocket("ws://localhost:8080/chat");
// ws.onmessage = message => console.log(`Received: ${message.data}`);
// ws.send("Hello! I'm client")
