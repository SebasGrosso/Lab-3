new Vue({
    el: '#app',
    data: {
        serversLogs: [],
        referenceTime:''
    },
    methods: {
        async fetchLogs() {
            console.log("en fetch logs bb")
            try {
                console.log('Fetching logs...');
                const response = await fetch('http://192.168.1.67:5000/sendLogs');
                if (response.ok) {
                    this.serversLogs = await response.json();
                    console.log('Logs recibidos:', this.serversLogs);
                } else {
                    console.error('Error en la respuesta:', response.statusText);
                }
            } catch (error) {
                console.error('Error al obtener los logs:', error);
            }
        },
        async fetchTime() {
            console.log("Obteniendo la hora de referencia...");
            try {
                const response = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America%2FBogota');
                if (response.ok) {
                    const data = await response.json();
                    this.referenceTime = data.time; 
                    console.log("Hora de referencia:", this.referenceTime);
                } else {
                    console.error('Error en la respuesta de la API de hora:', response.statusText);
                }
            } catch (error) {
                console.error('Error al obtener la hora de referencia:', error);
            }
        }
    }
});
