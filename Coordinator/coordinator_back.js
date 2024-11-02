const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: ".env" });
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'))

var page = require('http').Server(app);
var io = require('socket.io')(page);

const ipClient = process.env.IP_CLIENT;
const portClient = process.env.PORT_CLIENT;
const ipCoordinator = process.env.IP_COORDINATOR;
const portCoordinator = process.env.PORT_COORDINATOR;




page.listen(portClient, function () {
    logger('HTTP', 'Listen', `Servidor escuchando en http://${ipClient}:${portClient}` );
});

// async fetchLogs() {
//     console.log("en fetch logs bb")
//     try {
//         console.log('Fetching logs...');
//         const response = await fetch('http://192.168.1.67:5000/sendLogs');
//         if (response.ok) {
//             this.serversLogs = await response.json();
//             console.log('Logs recibidos:', this.serversLogs);
//         } else {
//             console.error('Error en la respuesta:', response.statusText);
//         }
//     } catch (error) {
//         console.error('Error al obtener los logs:', error);
//     }
// }