exports.global_ui_vars = { 
    asides_panels_toggle_last_class: {},
    on_resize: {
        timeout: false,
        last_size: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
    }
};

exports.init = () => {
    // start panels opens to have the scrollable width of elements
    _document_asides_panels_toggle();
    _document_bind_vertical_as_horizontal();
    _document_init_scroll_right();
    _document_theme_toggle();
    _document_media_queries();
}

const _document_media_queries = () => { // // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Testing_media_queries https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList
    const mql_maxwidth_1024 = window.matchMedia("(max-width: 1024px)");
    const mql_maxwidth_720 = window.matchMedia("(max-width: 720px)");

    const _handle_mql_change = (mql) => {
        if (mql.media.includes("1024")) {
            if (!mql.matches) {
                document.body.classList.add("left-panel-open");
                document.body.classList.add("right-panel-open");
                document.querySelector(`body > header > aside.left > .left-panel-open-toggle > i`).classList.replace("icon-push-chevron-right-square", "icon-push-chevron-left-square");
                document.querySelector(`body > header > aside.right > .right-panel-open-toggle > i`).classList.replace("icon-push-chevron-left-square", "icon-push-chevron-right-square");
            } else {
                document.body.classList.remove("left-panel-open");
                document.body.classList.remove("right-panel-open");
            }
        }
        if (mql.media.includes("720")) {
            if (!mql.matches) {
                document.body.classList.add("left-panel-mini-open");
                document.body.classList.add("right-panel-mini-open");
            } else {
                document.body.classList.remove("left-panel-mini-open");
                document.body.classList.remove("right-panel-mini-open");
                document.querySelector(`body > header > aside.left > .left-panel-open-toggle > i`).classList.replace("icon-push-chevron-left-square", "icon-push-chevron-right-square");
                document.querySelector(`body > header > aside.right > .right-panel-open-toggle > i`).classList.replace("icon-push-chevron-right-square", "icon-push-chevron-left-square");
            }
        }
    }

    _handle_mql_change(mql_maxwidth_1024);
    _handle_mql_change(mql_maxwidth_720);
    mql_maxwidth_1024.addEventListener("change", _handle_mql_change);
    mql_maxwidth_720.addEventListener("change", _handle_mql_change);
}

// https://bencentra.com/code/2015/02/27/optimizing-window-resize.html
// const _document_on_resize = (event) => {
//     //console.log(event);
//     this.global_ui_vars.on_resize.last_size = { width: event.target.innerWidth, height: event.target.innerHeight };
// }
// window.addEventListener('resize', function(event) {
//     clearTimeout(require('./ui').global_ui_vars.on_resize.timeout);
//     require('./ui').global_ui_vars.on_resize.timeout = setTimeout(_document_on_resize(event), 1000); // 1s delay after event is "complete" to run callback
// });


const _document_theme_toggle = () => {
    document.querySelector("body > footer > aside.left > button > i").addEventListener("click", (event) => {
        if (document.documentElement.classList.contains("theme-light")) {
            document.documentElement.classList.remove("theme-light");
        } else {
            document.documentElement.classList.add("theme-light");
        }
    });
}

const _document_init_scroll_right = (elements_array) => {
    const _init_scroll_right_elements = elements_array ? elements_array : [
        "body > header > aside.right > nav",
        "body > header > main > nav > section:last-child",
        "body > footer > aside.right > nav",
        "body > footer > main > nav",
        "body > footer > main > nav > section:last-child",
        "body > main > aside.right > header > nav",
        "body > main > aside.right > footer > nav",
        "body > main > main > header > nav > section:last-child",
        "body > main > main > footer > nav > section:last-child",
    ];
    for (const element of document.querySelectorAll(_init_scroll_right_elements.join(","))) {
        element.scrollLeft = element.scrollWidth - element.clientWidth;
    }
}

const _document_asides_panels_toggle = () => {
    for (const pos of ["left", "right"]) {
        this.global_ui_vars.asides_panels_toggle_last_class[pos] = "";
        document.querySelector(`body > header > aside.${pos} > .${pos}-panel-open-toggle > i`).addEventListener("click", (event) => {
            if (document.body.classList.contains(`${pos}-panel-mini-open`) && document.body.classList.contains(`${pos}-panel-open`)) {
                document.body.classList.remove(`${pos}-panel-open`);
                require('./ui').global_ui_vars.asides_panels_toggle_last_class[pos] = `${pos}-panel-open`;
            } else if (document.body.classList.contains(`${pos}-panel-mini-open`)) {
                if (require('./ui').global_ui_vars.asides_panels_toggle_last_class[pos] == `${pos}-panel-open`) { // from full to none direction
                    document.body.classList.remove(`${pos}-panel-mini-open`);
                    event.target.classList.replace(`icon-push-chevron-${pos == "left" ? "left" : "right"}-square`, `icon-push-chevron-${pos == "left" ? "right" : "left"}-square`);
                } else { // from none to full direction
                    document.body.classList.add(`${pos}-panel-open`);
                    event.target.classList.replace(`icon-push-chevron-${pos == "left" ? "right" : "left"}-square`, `icon-push-chevron-${pos == "left" ? "left" : "right"}-square`);
                }
            } else {
                document.body.classList.add(`${pos}-panel-mini-open`);
                require('./ui').global_ui_vars.asides_panels_toggle_last_class[pos] = "";
            }
        });
    }
}

// .scroll-vertical-as-horizontal
const _document_bind_vertical_as_horizontal = (elements_array) => {
    const _horizontal_scrollable_nav = elements_array ? elements_array : [
        "body > header > aside > nav",
        "body > header > main > nav",
        "body > header > main > nav > section",
        "body > footer > aside > nav",
        "body > footer > main > nav",
        "body > footer > main > nav > section",
        "body > main > aside > header > nav",
        "body > main > aside > footer > nav",
        "body > main > main > header > nav",
        "body > main > main > header > nav > section",
        "body > main > main > footer > nav",
        "body > main > main > footer > nav > section",
        ".scroll-vertical-as-horizontal"
    ];
    const _bind_vertical_as_horizontal = (event) => { // https://stackoverflow.com/a/59680347
        if (!event.deltaY) { return; }
        event.currentTarget.scrollLeft += event.deltaY + event.deltaX;
        event.preventDefault();
    };
    for (const element of document.querySelectorAll(_horizontal_scrollable_nav.join(","))) {
        element.removeEventListener('wheel', _bind_vertical_as_horizontal);
        element.addEventListener('wheel', _bind_vertical_as_horizontal);
    }
}