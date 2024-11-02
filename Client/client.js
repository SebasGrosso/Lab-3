new Vue({
    el: '#app',
    data: {
        logicalTime: ''
    },
    methods: {
        createLogicalClock() {
            this.logicalTime = Date.now();
            setInterval(() => {
                this.logicalTime += 1000;
            }, this.newTimeInterval());
        },
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString();
        },
        newTimeInterval() {
            const numbers = [4000, 2000, 500, 300];
            const randomIndex = Math.floor(Math.random() * numbers.length);
            console.log(numbers[randomIndex])
            return numbers[randomIndex];
        }
    },
    mounted() {
        this.createLogicalClock();
    }
});
