// here navigo as client web router
import navigo from 'navigo'; // Common JS to module ES ? not important
const router = new navigo("/");

export function init() {
    router.on("/something", renderSomethingPage)
          .on("*", renderHomePage)
          .resolve();
}

const renderHomePage = () => {
    console.log('call from navigo: renderHomePage');
}

const renderSomethingPage = () => {
    console.log('call from navigo: renderSomethingPage');
}