const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: ".env" });
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'))

var page = require('http').Server(app);
var io = require('socket.io')(page);
var io_client = require('socket.io-client');


const ipClient = process.env.IP_CLIENT;
const portClient = process.env.PORT_CLIENT;
const ipCoordinator = process.env.IP_COORDINATOR;
const portCoordinator = process.env.PORT_COORDINATOR;

let logicalTime;
let numberOfAttempts = 0;

// variable que obtiene el socket al conectarse al coordinador
const socket = io_client.connect(`http://${ipCoordinator}:${portCoordinator}`, { 'forceNew': true });

socket.on('connect', () => {
  logger(' WS ', 'connect', "Conectado al servidor de WebSocket");
});

// Método para conectarse por websockets al front del cliente
async function connect() {
    logger('HTTP', 'connect', "Realizando conexión");
    try {
        let response = await fetch(`http://${ipCoordinator}:${portCoordinator}/addServer`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ip: ipClient, port: portClient })
        })
        let data = await response.json();

        logicalTime = new Date(data.answer);
        logger('HTTP', 'addServer', `La hora enviada por el coordinador es: ${new Date (data.answer).toLocaleTimeString()}`);

        createLogicalClock();
        modifyPort();
        numberOfAttempts = 0;
    } catch (error) {
        if (numberOfAttempts <= 10) {
            console.error('Error al conectarse al coordindador, reintentando...')
            await stopTime(1000);
            connect();
        } else {
            console.error('El coordinador no está disponible')
        }
        numberOfAttempts++;
    }
}

function stopTime(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}


// Canal para recibir nuevas conexiones 
io.on('connection', function (socket) {
    logger(' WS ', 'connection', 'El front del cliente se ha conectado con Sockets')
});

// Método para enviar la hora al front   
function createLogicalClock() {
    setInterval(() => {
        newTime = new Date(logicalTime.getTime() + 1000);
        logicalTime = newTime;
        const hourClient = { hour: logicalTime };
        io.emit('currentHour', hourClient);
    }, newTimeInterval());
}

// Método para cambiar el pueto y la ip del front del cliente automaticamente
function modifyPort() {
    let data = '';
    try {
        data = fs.readFileSync('./public/client.js', 'utf8');
    } catch (err) {
        console.error('Error al leer el archivo:', err);
    }
    
    let lines = data.split('\n');
    
    lines[4] = `        ipClientBack:"${ipClient}",`;
    lines[5] = `        portClientBack:"${portClient}"`;
    
    const filePath = path.join(__dirname, 'public', 'client.js');
    
    fs.writeFile(filePath, data, (err) => {
        if (err) {
            console.error('Error al crear o guardar el archivo:', err);
            return;
        }
        logger(' JS ', 'modifyPort', 'Puerto cambiado exitosamente');
    });
}

// Método para elegir un intervalo de tiempo aleatorio
function newTimeInterval() {
    const numbers = [4000, 2000, 500, 300];
    const randomIndex = Math.floor(Math.random() * numbers.length);
    logger(' JS ', 'newTimeInterval', `El intervalo de tiempo elegido es de: ${numbers[randomIndex]} ms`);
    return numbers[randomIndex];
}


// Método para mostar logs en formato protocolo | endpoint | mensaje
function logger(protocol, endpoint, message) {
    let log = `${new Date(Date.now()).toLocaleTimeString()} | ${protocol} | ${endpoint} | ${message}`;
    console.log(log);
    socket.emit('logs', {port:portClient, ip:ipClient, content:log})
    io.emit('currentLogs', log);
}

// Método para enviar la hora actual al coordinador
app.get('/sendHour', async (req, res) => {
    const hourClient = { hour: logicalTime };
    res.send(hourClient);
});

// Métod para recibir al ajuste de la hora
app.post('/updateHour', async (req, res) => {
    logger('HTTP', 'updateHour', 'Comenzando la sincronización')
    const data = req.body;
    logger('HTTP', 'updateHour', `El ajuste que llegó es de: ${data.adjustmentTime}`)
    logicalTime = new Date(logicalTime.getTime() + data.adjustmentTime);
    logger('HTTP', 'updateHour', `La hora ha sido sincronizada`);
});

page.listen(portClient, function () {
    logger('HTTP', 'Listen', `Servidor escuchando en http://${ipClient}:${portClient}`);
});

// Llamados a los métodos
connect();