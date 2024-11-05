new Vue({
    el: '#app',
    data: {
        serversLogs: [],
        referenceTime: '',
        ipCoordinatorBack: 'localhost',
        portCoordinatorBack: '5000'
    },
    methods: {
        async fetchTime() {
            console.log("Obteniendo la hora de referencia...");
            try {
                const response = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America%2FBogota');
                if (response.ok) {
                    const data = await response.json();
                    this.referenceTime = `${data.time}:${data.seconds}`;
                    console.log("Hora de referencia:", this.referenceTime);
                } else {
                    console.error('Error en la respuesta de la API de hora:', response.statusText);
                }
            } catch (error) {
                console.error('Error al obtener la hora de referencia:', error);
            }
        },
        socket() {
            this.socket = io.connect(`http://${this.ipClientBack}:${this.portClientBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
                console.log('Conectado al servidor de WebSocket');
            });

            this.socket.on('currentHour', (data) => {
                this.logicalTime = data.hour;
            });
        },
        async sincHour() {
            console.log('Sincronizando las horas')
            const response = await fetch('http://localhost:5000/sincHour');
            const data = response.json();
            console.log(data.message);
        }
    },
    mounted() {
        //this.socket();
    }
});
