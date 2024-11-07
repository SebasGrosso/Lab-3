new Vue({
    el: '#app',
    data: {
        clientLogs: [],
        serversList: [],
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

            this.socket.on('serversList', (data) => {
                this.serversList = data; 
            });

            this.socket.on('hourCoordinator', (data) => {
                this.referenceTime = new Date(data).toLocaleTimeString(); 
            });
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
