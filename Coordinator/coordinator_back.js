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

let servers = [];
let numberOfAttempts = 0;

// Método para que los servidores nuevos se registen y se agregan a la lista de servidores
app.put('/addServer', async (req, res) => {
    const data = req.body;
    const serverFound = servers.find(server => server.ipServer === data.ip && server.portServer === data.port);
    let currentTime = await hourAPI();
    logger('HTTP', 'addServer', `La hora a enviar al servidor: ${data.ip}:${data.port} es: ${currentTime}`);
    if (serverFound) {
        res.send({ answer: currentTime })
        logger('HTTP', 'addServer', `Servidor de ip ${data.ip} y de puerto ${data.port} está en linea de nuevo`)
    } else {
        servers.push({ nameServer: `server${servers.length}`, ipServer: data.ip, portServer: data.port, currentTime: '', difference: 0 })
        res.send({ answer: currentTime })
        logger('HTTP', 'addServer', `El servidor ${data.ip}:${data.port} fue agregado`)
    }
});

// Canal para recibir nuevas conexiones 
io.on('connection', (socket) => {
    logger('WS', 'connection', 'Alguien se ha conectado con Sockets');
    socket.on('logs', (data) => {
        console.log(`Cliente ${data.ip}:${data.port}= `, data.content);
    });
});





// Método para ??
app.get('/sincHour', async (req, res) => {
    let currentTime = await hourAPI();
    logger('HTTP', 'sincHour', `Hora de referencia: ${currentTime}`);
    let diferenceTime = await askHours(currentTime);
    let averageDiference = diferenceTime / (servers.length + 1);
    logger('HTTP', 'sincHour', `El ajuste promedio es: ${averageDiference / 1000}s`);
    await sendAdjustment(averageDiference);
    res.send({ message: `Hora sincronizada en los servidores` })
});


// Método para pedir la hora a la API
async function hourAPI() {
    logger('HTTP', 'houtAPI', 'obteniendo la hora de la API');
    try {
        const response = await fetch('http://worldclockapi.com/api/json/utc/now');
        const data = await response.json();

        let utcDate = new Date(data.currentDateTime);
        let colombiaTimeDate = new Date(utcDate.getTime());
        numberOfAttempts = 0;
        logger('HTTP', 'houtAPI', 'Hora de la api obtenida');

        return colombiaTimeDate;
    } catch (error) {
        if (numberOfAttempts < 5) {
            numberOfAttempts++;
            console.error(`Error al obtener la hora de la API, reintentando por ${numberOfAttempts + 1} vez...`);
            return await hourAPI();
        } else {
            console.error('No fue posible obtener la hora de la API');
        }
    }
}

// Método para pedir las horas a los clientes y calcular la diferencia
async function askHours(currentTime) {
    let diferenceTime = 0;
    for (let i = 0; i < servers.length; i++) {
        let response = await fetch(`http://${servers[i].ipServer}:${servers[i].portServer}/sendHour`);
        let time = await response.json();
        let hour = new Date(time.hour);
        servers[i].currentTime = hour;
        logger('HTTP', 'sincHour', `Hora servidor del puerto ${servers[i].portServer}: ${hour}`)
        diferenceTime += (hour - currentTime);
        let diferenceClient = (hour - currentTime);
        servers[i].difference = diferenceClient;
    }
    return diferenceTime;
}

// Método para enviar ajuste a los clientes
async function sendAdjustment(averageDiference) {
    for (let i = 0; i < servers.length; i++) {
        logger('', 'sendAdjustment', `La diferencia del servidor ${servers[i].ipServer}:${servers[i].portServer} es de: ${(servers[i].difference / 1000)}s`);
        let timeSetting = averageDiference - servers[i].difference;
        logger('', 'sendAdjustment', `El tiempo a ajustar en el servidor ${servers[i].ipServer}:${servers[i].portServer}: ${(timeSetting / 1000)}s`);
        fetch(`http://${servers[i].ipServer}:${servers[i].portServer}/updateHour`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adjustmentTime: timeSetting })
        });
    }
}

// Método para mostar logs en formato protocolo | endpoint | mensaje
function logger(protocol, endpoint, message) {
    console.log(`${new Date(Date.now()).toLocaleTimeString()} | ${protocol} | ${endpoint} | ${message}`);
}

page.listen(portCoordinator, function () {
    logger('HTTP', 'Listen', `Servidor escuchando en http://${ipCoordinator}:${portCoordinator}`);
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