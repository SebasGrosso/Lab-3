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

let logicalTime;


async function connect() { 
    console.log('Realizando conexión');
    logger('HTTP','addServer',"Realizando conexión");
    let answer = "";
    //El while es para asegurarme de que si la API no retornó nada entonces que vuelva y haga el fetch hasta que si retorne algo
    while (!logicalTime) {
        await fetch(`http://${ipCoordinator}:${portCoordinator}/addServer`, {
            method: 'PUT', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ip: ipClient, port: portClient })
        })
        .then((answer) => answer.json())
        .then((data) => answer = data);
        logicalTime = new Date(answer.answer);
    }
    logger('HTTP','addServer',answer.answer);
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
    },newTimeInterval());
}
 
// Método para elegir un intervalo de tiempo aleatorio
function newTimeInterval() { 
    const numbers = [4000, 2000, 500, 300];
    const randomIndex = Math.floor(Math.random() * numbers.length);
    logger('', 'newTimeInterval', `El intervalo de tiempo elegido es de: ${numbers[randomIndex]} ms`);
    return numbers[randomIndex];
}

createLogicalClock();

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
    let time_to_add = data.adjustmentTime;
    let newTime = new Date(logicalTime.getTime() + time_to_add); 
    logicalTime = newTime; 
    logger('HTTP', 'updateHour', `La hora ha sido sincronizada`);
});

// app.get('/deploy', async (req, res) => {
//   console.log("Creando nueva instancia");

//   chooseComputer();
//   actualPort++;

//   res.status(200).send({ answer: 'OK' });
// });

page.listen(portClient, function () {
    logger('HTTP', 'Listen', `Servidor escuchando en http://${ipClient}:${portClient}` );
});