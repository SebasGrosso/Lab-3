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

app.put('/addServer', async (req, res) => {
    const data = req.body;
    const serverFound = servers.find(server => server.ipServer === data.ip && server.portServer === data.port);
    let currentTime = await hourAPI();
    console.log(currentTime);
    if (serverFound) {
        res.send({ answer: currentTime })
        logger('HTTP', 'addServer', `Servidor de ip ${data.ip} y de puerto ${data.port} está en linea de nuevo`)
    } else {
        servers.push({ nameServer: `server${servers.length}`, ipServer: data.ip, portServer: data.port, currentTime: '', difference: 0 })
        res.send({ answer: currentTime })
        logger('HTTP', 'addServer', `El servidor de ip ${data.ip} y de puerto ${data.port} fue agregado`)
    }
});

app.get('/sincHour', async (req, res) => {
    let currentTime = await hourAPI();
    logger('HTTP', 'sincHour', `Hora de referencia: ${currentTime}`);
    let diferenceTime = await askHours(currentTime);
    let averageDiference = diferenceTime / (servers.length + 1);
    console.log('Ajuste promedio: ', averageDiference)
    await sendAdjustment(averageDiference);
    res.send({ message: `Hora sincronizada en los servidores` })
});

let numberOfAttempts = 0;

async function hourAPI() {
    logger('HTTP', 'houtAPI', 'obteniendo la hora de la API');
    try {
        const response = await fetch('http://worldclockapi.com/api/json/utc/now');
        const data = await response.json();

        let utcDate = new Date(data.currentDateTime);
        let colombiaTimeDate = new Date(utcDate.getTime());
        numberOfAttempts = 0;
        console.log('Hora de la api obtenida');

        return colombiaTimeDate;
    } catch (error) {
        if (numberOfAttempts < 5) {
            numberOfAttempts++;
            console.error(`Error al obtener la hora de la API, reintentando por ${numberOfAttempts + 1} vez...`);
            return await hourAPI();
        }else{
            console.error('No fue posible obtener la hora de la API');
        }
    }
}


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

async function sendAdjustment(averageDiference) {
    for (let i = 0; i < servers.length; i++) {
        console.log('Diferencia', servers[i].difference)
        let timeSetting = averageDiference - servers[i].difference;
        logger('HTTP', 'sincHour', `tiempo a ajustar en el servidor ${servers[i].ipServer}:${servers[i].portServer}: ${(timeSetting / 1000)}s`);
        fetch(`http://${servers[i].ipServer}:${servers[i].portServer}/updateHour`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adjustmentTime: timeSetting })
        });
    }
}


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