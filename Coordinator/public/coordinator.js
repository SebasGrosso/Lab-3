new Vue({
    el: '#app',
    data: {
        clientLogs: [],
        referenceTime: '',
        ipCoordinatorBack: 'localhost',
        portCoordinatorBack: '5000'
    },
    methods: {
        socket() {
            this.socket = io.connect(`http://${this.ipCoordinatorBack}:${this.portCoordinatorBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
                console.log('Conectado al servidor de WebSocket');
            });

            this.socket.on('currentLogs', (data) => {
                this.clientLogs.push(data); 
            });
        },
        async fetchTime() {
            console.log("Obteniendo la hora de referencia...");
            try {
                const response = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America%2FBogota');
                const data = await response.json();
        
                let utcDate = new Date(data.dateTime);
                this.referenceTime = new Date(utcDate.getTime()).toLocaleTimeString();
                numberOfAttempts = 0;
        
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
        },
        async syncHour() {
            console.log('Sincronizando las horas')
            const response = await fetch('http://localhost:5000/syncHour');
            const data = response.json();
            console.log(data.message);
        }
    },
    mounted() {
        this.socket();
    }
});
