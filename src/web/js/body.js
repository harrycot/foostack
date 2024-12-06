document.addEventListener("DOMContentLoaded", (event) => {
    require('./body/socketio').init();
    require('./body/navigo').init();
});
