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

const ipClient = process.env.IP_CLIENT;
const portClient = process.env.PORT_CLIENT;
const ipCoordinator = process.env.IP_COORDINATOR;
const portCoordinator = process.env.PORT_COORDINATOR;

let logicalTime;
let numberOfAttempts = 0;


async function connect() {
    console.log('Realizando conexión');
    logger('HTTP', 'addServer', "Realizando conexión");
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
        logger('HTTP', 'addServer', data.answer);

        createLogicalClock();
        modifyPort();
        numberOfAttempts = 0;
    } catch (error) {
        if (numberOfAttempts <= 10) {
            console.error('Error al conectarse al coordindador, reintentando...')
            connect();
        } else {
            console.error('El coordinador no está disponible')
        }
        numberOfAttempts++;
    }
}

connect();

// Canal para recibir nuevas conexiones 
io.on('connection', function (socket) {
    logger('WS', 'connection', 'Alguien se ha conectado con Sockets')
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

//
function modifyPort() {
    let data = '';
    try {
        data = fs.readFileSync('./public/client.js', 'utf8');
    } catch (err) {
        console.error('Error al leer el archivo:', err);
    }

    let lines = data.split('\n');
    let ipLineFound = false;
    let portLineFound = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('ipClientBack:')) {
            lines[i] = `        ipClientBack:"${ipClient}",`;
            ipLineFound = true;
        }
        if (lines[i].includes('portClientBack:')) {
            lines[i] = `        portClientBack:"${portClient}"`
            portLineFound = true;
        }
        data = lines.join('\n')
    }

    const filePath = path.join(__dirname, 'public', 'client.js');

    const content = data;

    fs.writeFile(filePath, content, (err) => {
        if (err) {
            console.error('Error al crear o guardar el archivo:', err);
            return;
        }
        console.log('Puerto cambiado exitosamente');
    });
}

// Método para elegir un intervalo de tiempo aleatorio
function newTimeInterval() {
    const numbers = [4000, 2000, 500, 300];
    const randomIndex = Math.floor(Math.random() * numbers.length);
    logger('', 'newTimeInterval', `El intervalo de tiempo elegido es de: ${numbers[randomIndex]} ms`);
    return numbers[randomIndex];
}


// Método para mostarr logs en formato
function logger(protocol, endpoint, message) {
    console.log(`${new Date(Date.now()).toLocaleTimeString()} | ${protocol} | ${endpoint} | ${message}`);
}

// Método para enviar la hora actual al coordinador
app.get('/sendHour', async (req, res) => {
    const hourClient = { hour: logicalTime };
    res.send(hourClient);
});

// Métod para recibir al ajuste de la hora
app.post('/updateHour', async (req, res) => {
    console.log('Comenzando la sincronización');
    const data = req.body;
    console.log("El ajuste que llegó es de: ", data.adjustmentTime)
    logicalTime = new Date(logicalTime.getTime() + data.adjustmentTime);
    logger('HTTP', 'updateHour', `La hora ha sido sincronizada`);
});

page.listen(portClient, function () {
    logger('HTTP', 'Listen', `Servidor escuchando en http://${ipClient}:${portClient}`);
});