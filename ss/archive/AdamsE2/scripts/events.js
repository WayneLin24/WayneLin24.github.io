/* pointers */
const pointerCache = new Array();
var prevPtsDist = null;
var prevPt = null;

/* elements */
const div_binfo_style = document.getElementById("div_binfo").style;
const circle_mouseon = document.getElementById("circle_mouseon");
const circle_selected = document.getElementById("circle_selected");
const circle_fixed_factor = document.getElementById("circle_fixed_factor");
const rect_selected = document.getElementById("rect_selected");
const rect_fixed_factor = document.getElementById("rect_fixed_factor");
const rect_prod = document.getElementById("rect_prod");
const p_deg = document.getElementById("p_deg");
const p_base = document.getElementById("p_base");
const p_latex = document.getElementById("p_latex");
const p_diff = document.getElementById("p_diff");
const g_prod = document.getElementById("g_prod");
const div_menu_style = document.getElementById("div_menu").style;
const a_menu_bullet_style = document.getElementById("a_menu_bullet").style;
const p_button_rename_style = document.getElementById("p_button_rename").style;

/* other globals */
var id_right_click = null;
var timerClearCache = null;

function getDistPts() {
	let p1Screen = new Vector(pointerCache[0].offsetX, pointerCache[0].offsetY);
	let p2Screen = new Vector(pointerCache[1].offsetX, pointerCache[1].offsetY);
	return p1Screen.dist(p2Screen);
}

function restartTimer() {
	clearTimeout(timerClearCache);
	timerClearCache = window.setTimeout(function () { pointerCache.length = 0; }, 3000);
}

function on_pointerdown(event) {
	div_menu_style.visibility = "hidden";
	div_binfo_style.visibility = "hidden";
	// This event is cached to support 2-finger gestures
	pointerCache.push(event);

	if (pointerCache.length == 1) {
		prevPt = new Vector(event.offsetX, event.offsetY);
	}
	else if (pointerCache.length == 2) {
		prevPtsDist = getDistPts();
	}
	restartTimer();
}

// This function implements a 2-pointer horizontal pinch/zoom gesture.
function on_pointermove(event) {
	// Check if this event is in the cache and update it
	let index = 0;
	for (; index < pointerCache.length; index++) {
		if (event.pointerId === pointerCache[index].pointerId) {
			pointerCache[index] = event;
			break;
		}
	}

	// Move only when the only one down pointer moves
	if (pointerCache.length == 1 && index < pointerCache.length) {
		let curPt = new Vector(event.offsetX, event.offsetY);
		let deltaScreen = curPt.sub(prevPt);
		camera.translate(new Vector(deltaScreen.x, -deltaScreen.y));
		prevPt = curPt;
	}

	// If two pointers are down, check for pinch gestures
	if (pointerCache.length == 2 && index < pointerCache.length) {
		let p1Svg = camera.flip(new Vector(pointerCache[0].offsetX, pointerCache[0].offsetY));
		let p2Svg = camera.flip(new Vector(pointerCache[1].offsetX, pointerCache[1].offsetY));
		let curDist = p1Svg.dist(p2Svg);
		camera.zoom(index === 0 ? p2Svg : p1Svg, curDist / prevPtsDist);
		prevPtsDist = curDist;
	}
}

/**
 * Return if at least one event is removed
 */
function removeEvent(event_id) {
	// Remove this event from the target's cache
	for (let i = 0; i < pointerCache.length; i++) {
		if (pointerCache[i].pointerId == event_id) {
			pointerCache.splice(i, 1);
			return true;
		}
	}
	return false;
}

function on_pointerup(event) {
	/* Remove this pointer from the cache */
	if (removeEvent(event.pointerId)) {
		if (pointerCache.length == 0) {
			prevPt = null;
		}
		else if (pointerCache.length == 1) {
			prevPt = new Vector(pointerCache[0].offsetX, pointerCache[0].offsetY);
		}
		else if (pointerCache.length == 2) {
			prevPtsDist = getDistPts();
		}
	}
	restartTimer();
}

function on_wheel(event) {
	// TODO: make the zoom rate smaller for the Macbook trackpad
	if (event.deltaY < 0) {
		let pivotScreen = new Vector(event.offsetX, event.offsetY);
		let pivotSvg = camera.flip(pivotScreen);
		camera.zoom(pivotSvg, config.camera_zoom_rate);
		g_plot.setAttribute("transform", camera.getTransform());
	} else {
		let pivotScreen = new Vector(event.offsetX, event.offsetY);
		let pivotSvg = camera.flip(pivotScreen);
		camera.zoom(pivotSvg, 1 / config.camera_zoom_rate);
		g_plot.setAttribute("transform", camera.getTransform());
	}
	plotAxisLabels();
}

function select_bullet(bullet) {
	circle_selected.setAttribute("cx", bullet.getAttribute("cx"));
	circle_selected.setAttribute("cy", bullet.getAttribute("cy"));
	circle_selected.setAttribute("r", bullet.getAttribute("r"));
	circle_selected.innerHTML = bullet.innerHTML;
	circle_selected.dataset.id = bullet.id;

	rect_selected.setAttribute("x", Math.round(bullet.getAttribute("cx")) - 0.5);
	rect_selected.setAttribute("y", Math.round(bullet.getAttribute("cy")) - 0.5);
	if (Number(rect_fixed_factor.getAttribute("x")) > -1) {
		/* Highlight the product */

		rect_prod.setAttribute("x", Math.round(bullet.getAttribute("cx")) + Number(rect_fixed_factor.getAttribute("x")));
		rect_prod.setAttribute("y", Math.round(bullet.getAttribute("cy")) + Number(rect_fixed_factor.getAttribute("y")));

		let id1 = circle_selected.dataset.id.slice(1);
		let id2 = circle_fixed_factor.dataset.id.slice(1);
		if (Number(id1) > Number(id2)) {
			[id1, id2] = [id2, id1];
		}
		g_prod.innerHTML = "";
		if (basis_prod[id1 + "," + id2]) {
			for (const index of basis_prod[id1 + "," + id2]) {
				const id = "b" + index;
				const bullet = document.getElementById(id);
				circle_prod = `<circle cx="${bullet.getAttribute("cx")}" cy="${bullet.getAttribute("cy")}" r="${Number(bullet.getAttribute("r")) * 1.7}"></circle>`;
				g_prod.insertAdjacentHTML("beforeend", circle_prod);
			}
		}
	}
}

function on_click(event) {
	let tgt = event.target;
	if (tgt.getAttribute("class") === "b") {
		select_bullet(tgt);
	}
	else if (tgt.getAttribute("id") === "circle_selected") {
		/* info pane */
		const posX = event.clientX;
		const posY = window.innerHeight - event.clientY;

		div_binfo_style.left = posX + "px";
		div_binfo_style.bottom = posY + "px";
		div_binfo_style.visibility = "visible";

		const bullet = document.getElementById(tgt.dataset.id); /* The actualy bullet behind what is clicked */
		p_deg.innerHTML = `Deg: (${Math.round(bullet.getAttribute("cx"))},${Math.round(bullet.getAttribute("cy"))})`;
		p_base.innerHTML = `Base: ${bullet.dataset.b}`;
		const str_base = strLable(tgt.dataset.id);
		const tex_base = katex.renderToString(str_base, { throwOnError: false });
		p_latex.innerHTML = `LaTeX: ${tex_base}`;

		const level = parseInt(bullet.dataset.l);
		if (level === 5000) { p_diff.innerHTML = `PC`; }
		else if (level === 9800) { p_diff.innerHTML = `PC or boundary`; }
		else if (level > 9800) {
			const r = 10000 - level;
			let str_diff = `d_${r}(\\mathrm{this})=(${bullet.dataset.d})`;
			str_diff = str_diff.replace('None', '?');
			p_diff.innerHTML = katex.renderToString(str_diff, { throwOnError: false });
		}
		else {
			const r = level;
			let str_diff = `d_${r}(${bullet.dataset.d})=\\mathrm{this}`;
			str_diff = str_diff.replace('None', '?');
			p_diff.innerHTML = katex.renderToString(str_diff, { throwOnError: false });
		}


		if (bullet.dataset.g === "1") {
			p_button_rename_style.display = "block";
		}
		else {
			p_button_rename_style.display = "none";
		}
	}
}

function on_click_document(event) {
	div_menu_style.visibility = "hidden";
}

function on_key_down(event) {
	if (event.which === 39) {
		if (Number(rect_selected.getAttribute("x")) > -1) {
			const next_id = Number(circle_selected.dataset.id.slice(1)) + 1;
			let selected = document.getElementById("b" + next_id);
			if (selected) {
				select_bullet(selected);
			}
		}
	}
	else if (event.which === 37) {
		if (Number(rect_selected.getAttribute("x")) > -1) {
			const prev_id = Number(circle_selected.dataset.id.slice(1)) - 1;
			if (prev_id < 0) {
				prev_id = 0;
			}
			let selected = document.getElementById("b" + prev_id);
			select_bullet(selected);
		}
	}
}

function on_pointerenter_bullet(event) {
	let tgt = event.target;
	circle_mouseon.setAttribute("cx", tgt.getAttribute("cx"));
	circle_mouseon.setAttribute("cy", tgt.getAttribute("cy"));
	circle_mouseon.setAttribute("r", Number(tgt.getAttribute("r")) * 1.3);
}
function on_pointerleave_bullet(event) {
	let tgt = event.target;
	circle_mouseon.setAttribute("cx", "-1000");
}

/************************************
 * Context menu events handlers 
 ************************************/

function on_contextmenu(event) {
	if (event.target.getAttribute("class") === "b") {
		a_menu_bullet_style.display = "block";
		id_right_click = event.target.id;
	}
	else if (event.target.getAttribute("id") === "circle_selected") {
		a_menu_bullet_style.display = "block";
		id_right_click = event.target.dataset.id;
	}
	else {
		a_menu_bullet_style.display = "none"
	}

	let posX = event.clientX;
	let posY = event.clientY;

	div_menu_style.left = posX + "px";
	div_menu_style.top = posY + "px";
	div_menu_style.visibility = "visible";

	event.preventDefault();
}

function fixed_factor(id) {
	let tgt = document.getElementById(id);
	circle_fixed_factor.setAttribute("cx", tgt.getAttribute("cx"));
	circle_fixed_factor.setAttribute("cy", tgt.getAttribute("cy"));
	circle_fixed_factor.setAttribute("r", Number(tgt.getAttribute("r")) * 1.5);
	circle_fixed_factor.dataset.id = id;

	rect_fixed_factor.setAttribute("x", Math.round(tgt.getAttribute("cx")) - 0.5);
	rect_fixed_factor.setAttribute("y", Math.round(tgt.getAttribute("cy")) - 0.5);
}

function on_click_fixed_factor() {
	fixed_factor(id_right_click);
}

function on_click_fixed_factor_lc() {
	fixed_factor(circle_selected.dataset.id);
}

function on_rename() {
	let bullet = document.getElementById(circle_selected.dataset.id);
	const arr_base = bullet.dataset.b.split(",");
	let mon = basis[parseInt(bullet.dataset.i) + parseInt(arr_base[0])];
	let gen_id = mon[0];
	let name = prompt("New name for the generator", strMon(mon));
	if (name !== null) {
		gen_names_alias.set(gen_id.toString(), name);
	}
	let str_mon = strMon(mon);
	var tex_mon = katex.renderToString(str_mon, { throwOnError: false });
	p_latex.innerHTML = `LaTeX: ${tex_mon}`;
	plotBulletLabels();
}

function on_copy_aliases() {
	let text = "";
	gen_names_alias.forEach((k, v) => { text += `${v}: "${k}",\n` });
	navigator.clipboard.writeText(text);
	alert("Copied and you can send it to me");
}

function on_click_about() {
	alert(`navigator.userAgent=${navigator.userAgent}\nnavigator.vendor=${navigator.vendor}\nwindow.opera=${window.opera}\n2022-06-13 22:34:08`);
}

/***********************************
 * Initialization of event handlers
 ***********************************/
function initHandlers() {
	svg_ss.addEventListener("wheel", on_wheel);
	svg_ss.addEventListener("pointerdown", on_pointerdown);
	svg_ss.addEventListener("pointermove", on_pointermove);
	svg_ss.addEventListener("pointerup", on_pointerup);
	svg_ss.addEventListener("pointerleave", on_pointerup);

	svg_ss.addEventListener("contextmenu", on_contextmenu);
	svg_ss.addEventListener("click", on_click);
	document.addEventListener("click", on_click_document);
	document.addEventListener("keydown", on_key_down);

	/* Desktop browser will support pointer enter and leave events */
	if (navigator.userAgent.match("Windows") || navigator.userAgent.match("Macintosh")) {
		let bullets = document.getElementsByClassName("b");
		for (const b of bullets) {
			b.onpointerenter = on_pointerenter_bullet;
			b.onpointerleave = on_pointerleave_bullet;
		}
		circle_selected.onpointerenter = on_pointerenter_bullet;
		circle_selected.onpointerleave = on_pointerleave_bullet;
	}
	if (navigator.userAgent.match("Macintosh")) {
		config.camera_zoom_rate = 1.06;
	}


	let str_text_date = `<text id="text8733d2c" x="60" y="-40" opacity="0.5" transform="scale(1,-1)" style="-moz-user-select: none;-webkit-user-select: none;-ms-user-select: none;user-select: none;-o-user-select: none;">js:07/29</text>`;
	g_yaxis.insertAdjacentHTML("afterend", str_text_date);
	const text_date = document.getElementById('text8733d2c');
	window.setTimeout(function () { text_date.remove(); }, 5000);
}
