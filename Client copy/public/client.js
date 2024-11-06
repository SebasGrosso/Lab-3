new Vue({
    el: '#app',
    data: {
        logicalTime: '',
        ipClientBack:'',
        portClientBack:''
    },
    methods: {
        socket() {
            this.socket = io.connect(`http://${this.ipClientBack}:${this.portClientBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
                console.log('Conectado al servidor de WebSocket');
            });

            this.socket.on('currentHour', (data) => {
                this.logicalTime = data.hour; 
            });
        },
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString();
        }
    },
    mounted() {
        this.socket();
    }
});
