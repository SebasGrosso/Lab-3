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
        logger('HTTP', 'addServer', `Servidor de ip ${data.ip}:${data.port} está en linea de nuevo`)
    } else {
        servers.push({ nameServer: `server${servers.length}`, ipServer: data.ip, portServer: data.port, currentTime: '', difference: 0 })
        res.send({ answer: currentTime })
        logger('HTTP', 'addServer', `El servidor ${data.ip}:${data.port} fue agregado`)
    }
});

// Canal para recibir nuevas conexiones 
io.on('connection', (socket) => {
    logger(' WS ', 'connection', 'El front del coordinador se ha conectado con Sockets');
    socket.on('logs', (data) => {
        logger(' WS ', 'logs', `El cliente ${data.ip}:${data.port} envió --> ${data.content}`);
    });
});


// Método para ??
app.get('/syncHour', async (req, res) => {
    let currentTime = await hourAPI();
    logger('HTTP', 'syncHour', `Hora de referencia: ${currentTime}`);
    let diferenceTime = await askHours(currentTime);
    let averageDiference = diferenceTime / (servers.length + 1);
    logger('HTTP', 'syncHour', `El ajuste promedio es: ${averageDiference / 1000}s`);
    await sendAdjustment(averageDiference);
    res.send({ message: `Hora sincronizada en los servidores` })
});


// Método para pedir la hora a la API
async function hourAPI() {
    logger('HTTP', 'hourAPI', 'obteniendo la hora de la API');
    try {
        const response = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America%2FBogota');
        const data = await response.json();

        let utcDate = new Date(data.dateTime);
        let colombiaTimeDate = new Date(utcDate.getTime());
        numberOfAttempts = 0;
        logger('HTTP', 'hourAPI', 'Hora de la api obtenida');

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
        logger('HTTP', 'syncHour', `Hora servidor del puerto ${servers[i].portServer}: ${hour}`)
        diferenceTime += (hour - currentTime);
        let diferenceClient = (hour - currentTime);
        servers[i].difference = diferenceClient;
    }
    return diferenceTime;
}

// Método para enviar ajuste a los clientes
async function sendAdjustment(averageDiference) {
    for (let i = 0; i < servers.length; i++) {
        logger(' JS ', 'sendAdjustment', `La diferencia del servidor ${servers[i].ipServer}:${servers[i].portServer} es de: ${(servers[i].difference / 1000)}s`);
        let timeSetting = averageDiference - servers[i].difference;
        logger(' JS ', 'sendAdjustment', `El tiempo a ajustar en el servidor ${servers[i].ipServer}:${servers[i].portServer}: ${(timeSetting / 1000)}s`);
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
    io.emit('currentLogs', `${new Date(Date.now()).toLocaleTimeString()} | ${protocol} | ${endpoint} | ${message}`);
}


page.listen(portCoordinator, function () {
    logger('HTTP', 'Listen', `Servidor escuchando en http://${ipCoordinator}:${portCoordinator}`);
});
