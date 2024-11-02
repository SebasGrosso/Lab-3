new Vue({
    el: '#app',
    data: {
        serversLogs: []
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
        }
    }
});
