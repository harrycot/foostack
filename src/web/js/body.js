document.addEventListener("DOMContentLoaded", (event) => {
    require('./body/ui').init();
    require('./body/socketio').init();
    require('./body/navigo').init();
});
