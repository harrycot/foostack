

exports.init = () => {
    // start panels opens to have the scrollable width of elements
    _document_asides_panels_toggle();
    _document_bind_vertical_as_horizontal();
    _document_init_scroll_right();
    _document_theme_toggle();
}

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

const _document_asides_panels_toggle_last_class = {};
const _document_asides_panels_toggle = () => {
    for (const pos of ["left", "right"]) {
        _document_asides_panels_toggle_last_class[pos] = "";
        document.querySelector(`body > header > aside.${pos} > .${pos}-panel-open-toggle > i`).addEventListener("click", (event) => {
            if (document.body.classList.contains(`${pos}-panel-mini-open`) && document.body.classList.contains(`${pos}-panel-open`)) {
                document.body.classList.remove(`${pos}-panel-open`);
                _document_asides_panels_toggle_last_class[pos] = `${pos}-panel-open`;
            } else if (document.body.classList.contains(`${pos}-panel-mini-open`)) {
                if (_document_asides_panels_toggle_last_class[pos] == `${pos}-panel-open`) { // from full to none direction
                    document.body.classList.remove(`${pos}-panel-mini-open`);
                    event.target.classList.replace(`icon-push-chevron-${pos == "left" ? "left" : "right"}-square`, `icon-push-chevron-${pos == "left" ? "right" : "left"}-square`);
                } else { // from none to full direction
                    document.body.classList.add(`${pos}-panel-open`);
                    event.target.classList.replace(`icon-push-chevron-${pos == "left" ? "right" : "right"}-square`, `icon-push-chevron-${pos == "left" ? "left" : "right"}-square`);
                }
            } else {
                document.body.classList.add(`${pos}-panel-mini-open`);
                _document_asides_panels_toggle_last_class[pos] = "";
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