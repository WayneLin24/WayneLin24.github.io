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
    camera_zoom_rate: 1.2,
    color_grid_line: "#909090",
    color_arrow: "#a0a0a0",
    color_normal: "#000000",
    rainbow_step: 5 / 23,
};

const config_dynamic = {
    status: "start",
    camera_unit_screen_init: (window.innerWidth - config.margin) / (config.x_max_init + 1),
    camera_unit_screen_min:
        (window.innerWidth - config.margin) / (config.x_max + 1),
    camera_unit_screen_max: Math.min(window.innerWidth, window.innerHeight) - 30,
};

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

function plotGridLines() {
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

function plotAxisLabels() {
    var stepLabel = Math.ceil(config.axis_text_sep_screen / camera.unit_svg);
    let i_min = Math.ceil(camera.svg2world(new Vector(30, 0)).x / stepLabel) * stepLabel;
    let i_max = Math.floor(camera.svg2world(new Vector(window.innerWidth, 0)).x);
    g_xaxis.innerHTML = "";
    for (let i = i_min; i <= i_max; i += stepLabel) {
        let xText = camera.world2svg(new Vector(i, 0)).x;
        let label = `<text x="${xText}" y="-10">${i}</text>\n`;
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
    let bullet = document.getElementById(id);
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

function plotBulletLabels() {
    g_labels.innerHTML = "";
    for (bullet of g_bullets.childNodes) {
        if (bullet.tagName === "circle" && bullet.id.slice(0, 1) === "b") {
            let str_mon = strLable(bullet.id);
            str_mon = replaceAll(str_mon, "\\\\Delta ", "Δ");
            str_mon = replaceAll(str_mon, "\\\\Delta", "Δ");
            str_mon = replaceAll(str_mon, "\\^\\\\prime", "'");
            str_mon = replaceAll(str_mon, "\\^\\{\\\\prime\\\\prime}", "''");
            str_mon = replaceAll(str_mon, "_0", "0");
            str_mon = replaceAll(str_mon, "_1", "1");
            str_mon = replaceAll(str_mon, "_2", "2");
            str_mon = replaceAll(str_mon, "_3", "3");
            str_mon = replaceAll(str_mon, "_4", "4");
            str_mon = replaceAll(str_mon, "_5", "5");
            str_mon = replaceAll(str_mon, "_6", "6");
            str_mon = replaceAll(str_mon, "_7", "7");

            const re = /^(?!(P|P\^\d|P\^\d\d|Δ|M|M_1)h(0|1|2)).*h(0|1|2)/;
            if (str_mon.length < 10 && parseFloat(bullet.getAttribute("cx")) <= 127 && !(str_mon.match(re) && str_mon.length > 2)) {
                let label = `<text x=${parseFloat(bullet.getAttribute("cx")) - 0.06} y=${-parseFloat(bullet.getAttribute("cy")) + 0.16}>${str_mon}</text>\n`;
                g_labels.insertAdjacentHTML("beforeend", label);
            }
        }
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
    plotGridLines();
    plotAxisLabels();
    plotBulletLabels();
    initHandlers();
}
