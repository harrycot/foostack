

exports.init = () => {
    _asides_panels_toggle();
}

const _asides_panels_toggle_last_class = { left: "left-panel-open", right: "right-panel-open" };
const _asides_panels_toggle = () => {
    for (const pos of ["left", "right"]) {
        document.querySelector(`body > header > aside.${pos} > button.${pos}-panel-open-toggle`).addEventListener("click", () => {
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