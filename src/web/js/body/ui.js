

exports.init = () => {
    _asides_panels_toggle();
    _set_nav_scroll_vertical();
}

const _asides_panels_toggle_last_class = {};
const _asides_panels_toggle = () => {
    for (const pos of ["left", "right"]) {
        _asides_panels_toggle_last_class[pos] = "";
        document.querySelector(`body > header > aside.${pos} .${pos}-panel-open-toggle`).addEventListener("click", () => {
            if (document.body.classList.contains(`${pos}-panel-mini-open`) && document.body.classList.contains(`${pos}-panel-open`)) {
                document.body.classList.remove(`${pos}-panel-open`);
                _asides_panels_toggle_last_class[pos] = `${pos}-panel-open`;
            } else if (document.body.classList.contains(`${pos}-panel-mini-open`)) {
                if (_asides_panels_toggle_last_class[pos] == `${pos}-panel-open`) {
                    document.body.classList.remove(`${pos}-panel-mini-open`);
                } else {
                    document.body.classList.add(`${pos}-panel-open`);
                }
            } else {
                document.body.classList.add(`${pos}-panel-mini-open`);
                _asides_panels_toggle_last_class[pos] = "";
            }
        });
    }
}

const _set_nav_scroll_vertical = () => {
    const _horizontal_scrollable_nav = [
        "header > aside > nav",
        "header > main > nav",
        "header > main > nav > section",
        "footer > aside > nav",
        "footer > main > nav",
        "footer > main > nav > section",
        "main > aside > header > nav",
        "main > aside > footer > nav",
        "main > main > header > nav",
        "main > main > header > nav > section",
        "main > main > footer > nav",
        "main > main > footer > nav > section"
    ];
    for (const element of document.querySelectorAll(_horizontal_scrollable_nav.join(","))) {
        element.addEventListener('wheel', (event) => { // https://stackoverflow.com/a/59680347
            if (!event.deltaY) { return; }
            event.currentTarget.scrollLeft += event.deltaY + event.deltaX;
            event.preventDefault();
        });
    }
}