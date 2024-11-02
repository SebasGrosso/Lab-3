const express = require('express');
const cors = require('cors');
const { Client } = require('ssh2');
require('dotenv').config({ path: ".env" });
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'))

var page = require('http').Server(app);
var io = require('socket.io')(page);

const ipMonitor = process.env.IP_MONITOR;
const portMonitor = process.env.PORT_MONITOR;
const ipComputer1 = process.env.IP_COMPUTER1;
const ipComputer2 = process.env.IP_COMPUTER2;
const ipRegisterServer = process.env.IP_REGISTER_SERVER;
const portRegisterServer = process.env.PORT_REGISTER_SERVER;
let infoComputerSelected;
let actualPort = 5000;
let servers = [];
let nameToAdd;
let ipToAdd;
let portToAdd;

io.on('connection', function (socket) {
  console.log('Alguien se ha conectado con Sockets');
});

app.get('/deploy', async (req, res) => {
  console.log("Creando nueva instancia");

  chooseComputer();
  actualPort++;

  res.status(200).send({ answer: 'OK' });
});

const responseTime = 2000

setInterval(async () => {
  if (servers.length > 0) {
    for (let server of servers) {
      try {
        const startTime = Date.now()
        const response = await fetch(`http://${server.ipServer}:${server.portServer}/healthCheck`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        const endTime = Date.now();
        const responseTimeServer = endTime - startTime;

        const data = await response.json()
        if (data.answer === 'OK') {
          // console.log(`servidor ${server.portServer} disponible`);
          // console.log(`Tiempo de respuesta: ${responseTimeServer}ms`)

          if (responseTimeServer > responseTime) {
            console.log(`el tiempo de respuesta del servidor ${server.portServer} es muy alto`)
            let serverToAdd = { name: server.name, status: 'yellow' };
            if(!server.isSlow){
              server.isSlow = true
              chooseComputer();
            }
            io.emit('messages', serverToAdd);

            actualPort++;

          } else {
            let serverToAdd = { name: server.name, status: 'green' };
            io.emit('messages', serverToAdd)
            // console.log('messages', serverToAdd);
            server.failed = false;
          }

        }
      } catch (error) {
        if (!server.failed) {
          chooseComputer();
          actualPort++;

        }
        server.failed = true;
        let serverToAdd = { name: server.name, status: 'red' };
        io.emit('messages', serverToAdd)
        console.log(`servidor ${server.portServer} caido`)

      }
    }
  }
}, 1000);


function chooseComputer() {
  selectComputer();
  connect();
}

function selectComputer() {
  let number = Math.floor(Math.random() * 2) + 1;
  let command;
  let ipComputerSelected;
  let passwordSelected;
  let serverName;
  //toca cambiar a 'server' con contraseña 211100
  if (number == 1) {
    ipComputerSelected = ipComputer1;
    passwordSelected = '211100'
    serverName = 'server'
  } else {
    ipComputerSelected = ipComputer2;
    passwordSelected = 'sebas1502'
    serverName = 'administrador'
  }
  command = `echo "${passwordSelected}" | sudo -S docker run -e PORT=${actualPort} -e IP=${ipComputerSelected} -e IP_REGISTRY=${ipRegisterServer} -e PORT_REGISTRY=${portRegisterServer} --name server${actualPort - 5000} -p ${actualPort}:${actualPort} -d server69`;
  nameToAdd = `server${actualPort - 5000}`
  ipToAdd = ipComputerSelected;
  portToAdd = actualPort;
  infoComputerSelected = { command: command, ipComputerSelected: ipComputerSelected, passwordSelected: passwordSelected, name: serverName };
  console.log(infoComputerSelected)
}

function connect() {
  const conn = new Client();
  conn.on('ready', () => {
    console.log('Conexión SSH establecida');
    conn.exec(infoComputerSelected.command, (err, stream) => {
      if (err) throw err;
      stream.on('close', (code, signal) => {
        console.log('Comando finalizado con código:', code);
        conn.end(); // Finaliza la conexión SSH
      }).on('data', (data) => {
        console.log('Salida del comando:\n' + data);
        io.emit('chaosMessage', '');
        servers.push({ ipServer: ipToAdd, portServer: portToAdd, failed: false, name: nameToAdd, identifier: data, isSlow: false })
        console.log({ ipServer: ipToAdd, portServer: portToAdd, name: nameToAdd })
      }).stderr.on('data', (data) => {
        console.error('Error del comando:\n' + data);
      });
    });
  }).connect({
    host: infoComputerSelected.ipComputerSelected,
    port: 22, // Puerto por defecto de SSH
    username: infoComputerSelected.name,
    password: infoComputerSelected.passwordSelected
  });
}

async function stopServer() {
  const serversToFall = servers.filter(server => server.ipServer === infoComputerSelected.ipComputerSelected && !server.failed);
  if (serversToFall.length > 0) {
    let positionToFall = getRandomInt(0, serversToFall.length);
    console.log(positionToFall);
    let serverIdentifier = serversToFall[positionToFall].identifier;
    let serverName = serversToFall[positionToFall].name;
    command = `echo "${infoComputerSelected.passwordSelected}" | sudo -S docker stop ${serverIdentifier}`;
    console.log(`caeré el servidor ${serverName} en 5 segundos`)

    for (let i = 5; i > -1; i--) {
      io.emit('chaosMessage', `Se caerá el servidor ${serverName} en ${i} segundos`)
      await wait(1000);
    }

    const conn = new Client();
    conn.on('ready', () => {
      console.log('Conexión SSH establecida');
      conn.exec(command, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Comando finalizado con código:', code);
          conn.end(); // Finaliza la conexión SSH
        }).on('data', (data) => {
          console.log('Salida del comando:\n' + data);
          io.emit('chaosMessage', `Se ha caido el servidor ${serverName}`)
        }).stderr.on('data', (data) => {
          console.error('Error del comando:\n' + data);
        });
      });
    }).connect({
      host: infoComputerSelected.ipComputerSelected,
      port: 22, // Puerto por defecto de SSH
      username: infoComputerSelected.name,
      password: infoComputerSelected.passwordSelected
    });
  } else {
    console.log('no hay servidores para caer');
    io.emit('chaosMessage', 'no hay servidores para caer');

  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chaos_ingeniery() {
  selectComputer();
  stopServer();
}

app.get('/chaosIngeniery', async (req, res) => {
  chaos_ingeniery();
  res.status(200).send({ answer: 'OK' });
});


page.listen(portMonitor, function () {
  console.log(`servidor corriendo en http://localhost:${portMonitor}`)
});