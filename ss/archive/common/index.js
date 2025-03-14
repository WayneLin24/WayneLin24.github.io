/* created by Weinan Lin */

const config = {
    x_max: 270,
    y_max: 90,
    y_max_grid: 256,
    x_max_init: 80,
    margin: 30,
    axis_text_sep_screen: 60,
    bullets_tilt_angle:
        ((window.hasOwnProperty("bullets_tilt_angle_deg")
            ? bullets_tilt_angle_deg
            : 30) /
            180) *
        Math.PI,
    bullets_radius_world: 3.0 / 60,
    bullets_sep_world: 9.0 / 60 /* distance between the centers */,
    bullets_group_length_world: 1.1,
    camera_zoom_rate: navigator.userAgent.match("Macintosh") ? 1.1 : 1.2,
    camera_translate_pixels: 100,
    color_grid_line: "#909090",
    color_arrow: "#a0a0a0",
    color_normal: "#000000",
    rainbow_step: 5 / 23,
    R_PERM: 1000
};

const config_dynamic = {
    status: "start",
    camera_unit_screen_init: (window.innerWidth - config.margin) / (config.x_max_init + 1),
    camera_unit_screen_min:
        (window.innerWidth - config.margin) / (config.x_max + 1),
    camera_unit_screen_max: Math.min(window.innerWidth, window.innerHeight) - 30,
    page: 2,
    showDashed: true,
    showLines: "All",
};

const urlParams = new URLSearchParams(window.location.search);

/* The canvas is always as big as the window */
const svg_ss = document.getElementById("svg_ss");
const g_svg = document.getElementById("g_svg");
const g_plot = document.getElementById("g_plot");
const g_bullets = document.getElementById("g_bullets");
const g_xaxis = document.getElementById("g_xaxis");
const g_yaxis = document.getElementById("g_yaxis");
const g_labels = document.getElementById("g_labels");
function windowResize() {
    svg_ss.setAttribute("width", window.innerWidth);
    svg_ss.setAttribute("height", window.innerHeight);
    g_svg.setAttribute(
        "transform",
        "translate(0," + window.innerHeight + ") scale(1,-1)"
    );
    config_dynamic.camera_unit_screen_min = (window.innerWidth - config.margin) / (config.x_max + 1);
    config_dynamic.camera_unit_screen_max = Math.min(window.innerWidth, window.innerHeight) - 30;
}
window.addEventListener("resize", windowResize);

/* 2d Vector */
class Vector {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }
    addV2(x, y) {
        return new Vector(this.x + x, this.y + y);
    }
    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }
    mul(r) {
        return new Vector(this.x * r, this.y * r);
    }
    dist(v) {
        return Math.sqrt(
            (this.x - v.x) * (this.x - v.x) + (this.y - v.y) * (this.y - v.y)
        );
    }
    interpolate(v, t) {
        return new Vector(this.x * (1 - t) + v.x * t, this.y * (1 - t) + v.y * t);
    }
}

// Clip value `x` by [min_, max_].
function clip(x, min_, max_) {
    if (x < min_) {
        return min_;
    } else if (x > max_) {
        return max_;
    } else {
        return x;
    }
}

// camera is responsible for converting the coordinates
const camera = {
    /* The svg length of the world unit */
    unit_svg: config_dynamic.camera_unit_screen_init,
    /* The svg position of the world origin */
    o_svg: new Vector(
        config.margin + 0.5 * config_dynamic.camera_unit_screen_init,
        config.margin + 0.5 * config_dynamic.camera_unit_screen_init
    ),
    zoom: function (pivotSvg /* Vector */, rate) {
        let unit_svg1 = clip(
            this.unit_svg * rate,
            config_dynamic.camera_unit_screen_min,
            config_dynamic.camera_unit_screen_max
        );
        let rate1 = unit_svg1 / this.unit_svg;
        this.unit_svg = unit_svg1;

        let origin_sp1 = pivotSvg.add(this.o_svg.sub(pivotSvg).mul(rate1));
        let x_min = window.innerWidth - (config.x_max + 0.5) * this.unit_svg;
        let x_max = config.margin + 0.5 * this.unit_svg;
        let y_min = window.innerHeight - (config.y_max + 0.5) * this.unit_svg;
        let y_max = config.margin + 0.5 * this.unit_svg;
        if (y_min > y_max) { y_min = y_max; }
        this.o_svg = new Vector(
            clip(origin_sp1.x, x_min, x_max),
            clip(origin_sp1.y, y_min, y_max)
        );

        g_plot.setAttribute("transform", camera.getTransform());
        plotAxisLabels();
    },
    translate: function (deltaSvg /* Vector */) {
        origin_sp1 = this.o_svg.add(deltaSvg);
        let x_min = window.innerWidth - (config.x_max + 0.5) * this.unit_svg;
        let x_max = config.margin + 0.5 * this.unit_svg;
        let y_min = window.innerHeight - (config.y_max + 0.5) * this.unit_svg;
        let y_max = config.margin + 0.5 * this.unit_svg;
        if (y_min > y_max) { y_min = y_max; }
        this.o_svg = new Vector(
            clip(origin_sp1.x, x_min, x_max),
            clip(origin_sp1.y, y_min, y_max)
        );

        g_plot.setAttribute("transform", camera.getTransform());
        plotAxisLabels();
    },
    world2svg: function (ptWorld /* Vector */) {
        return this.o_svg.add(ptWorld.mul(this.unit_svg));
    },
    svg2world: function (ptSvg /* Vector */) {
        return ptSvg.sub(this.o_svg).mul(1 / this.unit_svg);
    },
    flip: function (ptScreen /* Vector */) {
        return new Vector(ptScreen.x, window.innerHeight - ptScreen.y);
    },
    world2svg_v2: function (wpx, wpy) {
        let world_pos = new Vector(wpx, wpy);
        return this.o_svg.add(world_pos.mul(this.unit_svg));
    },
    svg2world_v2: function (spx, spy) {
        let screen_pos = new Vector(spx, spy);
        return screen_pos.sub(this.o_svg).mul(1 / this.unit_svg);
    },
    getTransform: function () {
        return (
            "translate(" +
            this.o_svg.x +
            "," +
            this.o_svg.y +
            ") scale(" +
            this.unit_svg +
            ")"
        );
    },
};

function addGridLines() {
    let g_grid = document.getElementById("g_grid");
    for (let i = 0; i <= config.y_max_grid; i += 1) {
        let line = `<line x1="-0.5" y1="${i}" x2="${config.x_max + 0.5}" y2="${i}"></line>\n`;
        g_grid.insertAdjacentHTML("beforeend", line);
    }
    for (let i = 0; i <= config.x_max; i += 1) {
        let line = `<line x1="${i}" y1="-.5" x2="${i}" y2="${config.y_max_grid}"></line>\n`;
        g_grid.insertAdjacentHTML("beforeend", line);
    }
}

function getAxisNumber(x) {
    if (MODE == "DualPi") {
        if (x < SEP_RIGHT)
            return x;
        else
            return x - 1;
    }
    else if (MODE == "Exact") {
        if (x % 3 == 2)
            return Math.floor(x / 3 - T_TOP_CELL + 1)
        else
            return Math.floor(x / 3);
    }
    else {
        return x;
    }
}

function plotAxisLabels() {
    var stepLabel = Math.ceil(config.axis_text_sep_screen / camera.unit_svg);
    let i_min = Math.ceil(camera.svg2world(new Vector(30, 0)).x / stepLabel) * stepLabel;
    let i_max = Math.floor(camera.svg2world(new Vector(window.innerWidth, 0)).x);
    g_xaxis.innerHTML = "";
    for (let i = i_min; i <= i_max; i += stepLabel) {
        let xText = camera.world2svg(new Vector(i, 0)).x;
        let label = `<text x="${xText}" y="-10">${getAxisNumber(i)}</text>\n`;
        g_xaxis.insertAdjacentHTML("beforeend", label);
    }
    i_min = Math.ceil(camera.svg2world(new Vector(0, 30)).y / stepLabel) * stepLabel;
    i_max = Math.floor(camera.svg2world(new Vector(0, window.innerHeight)).y);
    g_yaxis.innerHTML = "";
    for (let i = i_min; i <= i_max; i += stepLabel) {
        let yText = camera.world2svg(new Vector(0, i)).y;
        let label = `<text x="26" y="${-yText}" dy="0.25em">${i}</text>\n`;
        g_yaxis.insertAdjacentHTML("beforeend", label);
    }
}

var gen_names_alias = new Map();

function getGenNames(i) {
    k = i.toString();
    if (gen_names_alias.has(k)) {
        return gen_names_alias.get(k);
    }
    else {
        return gen_names[i];
    }
}

function strMon(mon) {
    if (mon.length === 0) {
        return "1";
    }
    else {
        result = "";
        for (let i = 0; i < mon.length; i += 2) {
            if (mon[i + 1] == 1) {
                result += `${getGenNames(mon[i])}`;
            }
            else if (mon[i + 1] < 10) {
                result += `${getGenNames(mon[i])}^${mon[i + 1]}`;
            }
            else {
                result += `${getGenNames(mon[i])}^{${mon[i + 1]}}`;
            }
        }
        return result;
    }
}

function strLable(id) {
    const bullet = document.getElementById(id);
    const arr_base = bullet.dataset.b.split(",");
    let str_base = "";
    const offset_X = parseInt(bullet.dataset.i);
    for (let i = 0; i < arr_base.length; ++i) {
        if (i > 0)
            str_base += "+";
        str_base += strMon(basis[offset_X + parseInt(arr_base[i])]);
    }
    return str_base;
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function addBulletLabels() {
    const bullets = document.getElementsByClassName("b");
    g_labels.innerHTML = "";
    for (const bullet of bullets) {
        if (bullet.tagName === "circle" && bullet.id.slice(0, 1) === "b") {
            let str_mon = strLable(bullet.id);
            str_mon = replaceAll(str_mon, /\\Delta\s?/, "Δ");
            str_mon = replaceAll(str_mon, /\\mu\s?/, "μ");
            str_mon = replaceAll(str_mon, /\\rho\s?/, "ρ");
            str_mon = replaceAll(str_mon, /\\iota\s?/, "ι");
            str_mon = replaceAll(str_mon, /\\eta\s?/, "η");
            str_mon = replaceAll(str_mon, /\\nu\s?/, "ν");
            str_mon = replaceAll(str_mon, /\\bar\\sigma\s?/, "σ&#772");
            str_mon = replaceAll(str_mon, /\\sigma\s?/, "σ");
            str_mon = replaceAll(str_mon, /\\epsilon\s?/, "ε");
            str_mon = replaceAll(str_mon, /\\theta\s?/, "θ");
            str_mon = replaceAll(str_mon, /\\bar\\kappa\s?/, "κ&#772");
            str_mon = replaceAll(str_mon, /\\kappa\s?/, "κ");
            str_mon = replaceAll(str_mon, /\\zeta\s?/, "ζ");
            str_mon = replaceAll(str_mon, /\^\\prime\s?/, "'");
            str_mon = replaceAll(str_mon, /\^\{\\prime\\prime}\s?/, "''");
            str_mon = replaceAll(str_mon, /_(\d)/, "$1");
            str_mon = replaceAll(str_mon, /_\{(\d\d)\}/, "$1");

            const re = /^(?!(P|P\^\d|P\^\d\d|Δ|M|M_1|\()h(0|1|2)).*h(0|1|2)/;
            if (str_mon.length <= 10 && parseFloat(bullet.getAttribute("cx")) <= 127 && !(str_mon.match(re) && str_mon.length > 2)) {
                const r = parseFloat(bullet.getAttribute("r"));
                let class_ = "label";
                if (bullet.classList.contains("b0"))
                    class_ += " label0";
                else if (bullet.classList.contains("b1"))
                    class_ += " label1";
                const label = `<text class="${class_}" x=${parseFloat(bullet.getAttribute("cx")) - r * 0.75} y=${-parseFloat(bullet.getAttribute("cy")) + r * 2} font-size=${r * 1.125} data-page=${bullet.dataset.page}>${str_mon}</text>\n`;
                g_labels.insertAdjacentHTML("beforeend", label);
            }
        }
    }
}

function AdjustVisibilityBySeparator() {
    const rect_separator = document.getElementById("rect_separator");
    const rect_second_ss = document.getElementById("rect_second_ss");
    rect_separator.setAttribute('x', SEP_RIGHT - SEP_WIDTH);
    rect_separator.setAttribute('width', SEP_WIDTH);
    rect_second_ss.setAttribute('x', SEP_RIGHT - SEP_WIDTH - 300);
    const sep_left = SEP_RIGHT - SEP_WIDTH;

    const bullets_b0 = document.getElementsByClassName("b0");
    for (const b of bullets_b0) {
        const x = Math.round(b.getAttribute("cx"));
        if (x <= sep_left)
            b.style.visibility = "visible";
        else
            b.style.visibility = "hidden";
    }

    const bullets_b1 = document.getElementsByClassName("b1");
    for (const b of bullets_b1) {
        const x = Math.round(b.getAttribute("cx"));
        if (x >= SEP_RIGHT)
            b.style.visibility = "visible";
        else
            b.style.visibility = "hidden";
    }

    const lines_l0 = document.getElementsByClassName("l0");
    for (const line of lines_l0) {
        const x1 = parseInt(line.dataset.x1);
        const x2 = parseInt(line.dataset.x2);
        if (x1 <= sep_left && x2 <= sep_left)
            line.style.visibility = "visible";
        else
            line.style.visibility = "hidden";
    }

    const lines_l1 = document.getElementsByClassName("l1");
    for (const line of lines_l1) {
        const x1 = parseInt(line.dataset.x1);
        const x2 = parseInt(line.dataset.x2);
        if (x1 >= SEP_RIGHT && x2 >= SEP_RIGHT)
            line.style.visibility = "visible";
        else
            line.style.visibility = "hidden";
    }

    const lines_lbc = document.getElementsByClassName("lbc");
    if (SEP_WIDTH != 1) {
        for (const line of lines_lbc)
            line.style.visibility = "hidden";
    }
    else {
        for (const line of lines_lbc) {
            const x2 = parseInt(line.dataset.x2);
            if (x2 == SEP_RIGHT) {
                line.style.visibility = "visible";
            }
            else {
                line.style.visibility = "hidden";
            }
        }
    }

    const lines_ltc = document.getElementsByClassName("ltc");
    if (SEP_WIDTH == 1) {
        for (const line of lines_ltc) {
            line.style.visibility = "hidden";
        }
    }
    else {
        for (const line of lines_ltc) {
            const x2 = parseInt(line.dataset.x2);
            if (x2 == SEP_RIGHT)
                line.style.visibility = "visible";
            else
                line.style.visibility = "hidden";
        }
    }

    const labels0 = document.getElementsByClassName("label0");
    for (const label of labels0) {
        const x = Math.round(parseFloat(label.getAttribute("x")));
        if (x <= sep_left)
            label.style.visibility = "visible";
        else
            label.style.visibility = "hidden";
    }

    const labels1 = document.getElementsByClassName("label1");
    for (const label of labels1) {
        const x = Math.round(parseFloat(label.getAttribute("x")));
        if (x >= SEP_RIGHT)
            label.style.visibility = "visible";
        else
            label.style.visibility = "hidden";
    }
}

function addRectProduct() {
    for (const i of arr_factors) {
        const id = "b" + i;
        const bullet = document.getElementById(id);
        let rect_product = `<rect id="rect_prod${i}" x="-1000" y="-1000" width="1" height="1" fill="green" opacity="0.1"  data-x="${bullet.getAttribute("cx")}" data-y="${bullet.getAttribute("cy")}" />`;
        g_plot.insertAdjacentHTML("afterbegin", rect_product);
    }
    if (MODE === "Exact") {
        for (let i = 0; i < 300; ++i) {
            let rect_product = `<rect x="${3*i-0.5}" y="-0.5" width="1" height="300" fill="#00ffff" opacity="0.1"/>`;
            g_plot.insertAdjacentHTML("afterbegin", rect_product);
        }
    }
}

function processParams() {
    let has_x = urlParams.get("x") !== null, has_y = urlParams.get("y") !== null;
    if (has_x && has_y && urlParams.get("scale") !== null) {
        const pivot_svg = camera.world2svg(new Vector(urlParams.get("x"), urlParams.get("y")));
        const scale = urlParams.get("scale");
        camera.zoom(pivot_svg, scale);
    }
    if (has_x) {
        wx = urlParams.get("x");
        const pivot_svg = camera.world2svg(new Vector(wx, 0));
        camera.translate(new Vector(config.margin + (window.innerWidth - config.margin) / 2 - pivot_svg.x, 0));
    }
    if (has_y) {
        wy = urlParams.get("y");
        const pivot_svg = camera.world2svg(new Vector(0, wy));
        camera.translate(new Vector(0, config.margin + (window.innerHeight - config.margin) / 2 - pivot_svg.y));
    }
}

/***************************************************
 * init
 ***************************************************/
function init() {
    svg_ss.setAttribute("width", window.innerWidth);
    svg_ss.setAttribute("height", window.innerHeight);
    g_svg.setAttribute(
        "transform",
        "translate(0," + window.innerHeight + ") scale(1,-1)"
    );
    g_plot.setAttribute("transform", camera.getTransform());
    addGridLines();
    plotAxisLabels();
    // if (MODE !== "FromRes")
    //     addBulletLabels();
    addRectProduct();

    if (MODE === "DualPi")
        AdjustVisibilityBySeparator();
    initHandlers();

    processParams();
}
