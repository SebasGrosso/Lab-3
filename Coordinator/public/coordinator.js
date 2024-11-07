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
        async deployServer() {
            const response = await fetch(`http://${this.ipCoordinatorBack}:${this.portCoordinatorBack}/deploy`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
    
            const data = await response.json();
            
            if (data.answer === 'OK') {
                console.log('servidor desplegado');
            } else {
                console.log('no fue posible desplegar el servidor');
            }
        },
        async syncHour() {
            console.log('Sincronizando las horas')
            const response = await fetch(`http://${this.ipCoordinatorBack}:${this.portCoordinatorBack}/syncHour`);
            const data = response.json();
            console.log(data.message);
        }
    },
    mounted() {
        this.socket();
    }
});
