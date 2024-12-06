// here navigo as client web router
import navigo from 'navigo'; // Common JS to module ES ? not important

export const router = new navigo("/");

export function init() {
    this.router.on("/something", (params) => {renderSomethingPage(params)})
        .on("/something/:else", (params) => {renderSomethingPage(params)})
        .on("*", (params) => {renderHomePage(params)})
        .resolve();
}

const renderHomePage = (params) => {
    console.log('call from navigo: renderHomePage');
}

const renderSomethingPage = (params) => {
    console.log('call from navigo: renderSomethingPage');
}

