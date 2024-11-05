let servers = [{ currentTime: new Date(Date.now()), nombre: 'server1', difference: ''}, { currentTime: new Date(Date.now() + 100000), nombre: 'server2', difference: '' }, { currentTime: new Date(Date.now() - 1354500), nombre: 'server3', difference: '' }, { currentTime: new Date(Date.now() + 140000), nombre: 'server4', difference: '' }]
// let servers = [{ currentTime: 5, nombre: 'server1', difference: ''}, { currentTime: 9, nombre: 'server2', difference: '' }, { currentTime: 17, nombre: 'server3', difference: '' }, { currentTime: 15, nombre: 'server4', difference: '' }]

console.log(servers)

async function askHours(currentTime) {
    let diferenceTime = 0;
    for (let i = 0; i < servers.length; i++) {
        // let response = await fetch(`http://${servers[i].ipServer}:${servers[i].portServer}/sendHour`);
        // let time = await response.json();
        // let hour = new Date(time.hour);
        // servers[i].currentTime = hour;
        // logger('HTTP', 'sincHour', `currentTime servidor del puerto ${servers[i].portServer}: ${hour}`)
        logger('HTTP', 'sincHour', `currentTime servidor del puerto ${servers[i].currentTime}`)
        diferenceTime += (servers[i].currentTime - currentTime);
        let diferenceClient = (servers[i].currentTime - currentTime);
        servers[i].difference = diferenceClient;
    }
    return diferenceTime;
}

async function promedio() {
    let currentTime = new Date(Date.now());
    logger('HTTP', 'sincHour', `currentTime de referencia: ${currentTime}`);
    let diferenceTime = await askHours(currentTime);
    let averageDiference = diferenceTime / (servers.length + 1);
    console.log('Ajuste promedio: ', averageDiference)
    await sendAdjustment(averageDiference);
};


async function sendAdjustment(averageDiference) {
    for (let i = 0; i < servers.length; i++) {
        console.log('Diferencia', servers[i].difference)
        let timeSetting = averageDiference - servers[i].difference;
        logger('HTTP', 'sincHour', `tiempo a ajustar en el servidor ${servers[i].ipServer}:${servers[i].portServer}: ${(timeSetting / 1000)}s`);
        // fetch(`http://${servers[i].ipServer}:${servers[i].portServer}/updateHour`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({ adjustmentTime: timeSetting })
        // });
        servers[i].currentTime = new Date(servers[i].currentTime.getTime() + timeSetting);
    }
    console.log(servers);
}


function logger(protocol, endpoint, message) {
    console.log(`${new Date(Date.now()).toLocaleTimeString()} | ${protocol} | ${endpoint} | ${message}`);
}

promedio();