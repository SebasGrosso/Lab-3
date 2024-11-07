new Vue({
    el: '#app',
    data: {
        serversLogs: [],
        referenceTime: '',
        ipCoordinatorBack: 'localhost',
        portCoordinatorBack: '5000'
    },
    methods: {
        // async fetchTime() {
        //     console.log("Obteniendo la hora de referencia...");
        //     try {
        //         const response = await fetch('https://worldtimeapi.org/api/timezone/America/Bogota');
        //         if (response.ok) {
        //             const data = await response.json();
        //             this.referenceTime = `${data.time}:${data.seconds}`;
        //             console.log("Hora de referencia:", this.referenceTime);
        //         } else {
        //             console.error('Error en la respuesta de la API de hora:', response.statusText);
        //         }
        //     } catch (error) {
        //         console.error('Error al obtener la hora de referencia:', error);
        //     }
        // },
        socket() {
            this.socket = io.connect(`http://${this.ipCoordinatorBack}:${this.portCoordinatorBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
                console.log('Conectado al servidor de WebSocket');
            });
        },
        async fetchTime() {
            console.log("Obteniendo la hora de referencia...");
            try {
                fetch('http://worldclockapi.com/api/json/utc/now')
                    .then(response => response.json())
                    .then(data => {
                        let utcDate = new Date(data.currentDateTime);

                        let colombiaTimeDate = new Date(utcDate.getTime()) ;

                        let hours = colombiaTimeDate.getHours();
                        let minutes = colombiaTimeDate.getMinutes().toString().padStart(2, '0');
                        let seconds = colombiaTimeDate.getSeconds().toString().padStart(2, '0');

                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12 || 12;

                        const colombiaTime = `${hours}:${minutes}:${seconds} ${ampm}`;

                        this.referenceTime = colombiaTime;

                        console.log("La hora actual en Colombia es:", colombiaTime);
                    })
                    .catch(error => console.error("Error al obtener la hora:", error));
            } catch (error) {
                console.error('Error al obtener la hora de referencia:', error);
            }
        },
        async sincHour() {
            console.log('Sincronizando las horas')
            const response = await fetch('http://localhost:5000/sincHour');
            const data = response.json();
            console.log(data.message);
        }
    },
    mounted() {
        this.socket();
    }
});
