/* elements */
const div_binfo_style = document.getElementById("div_binfo").style;
const circle_mouseon = document.getElementById("circle_mouseon");
const circle_selected = document.getElementById("circle_selected");
const rect_selected = document.getElementById("rect_selected");
const p_deg = document.getElementById("p_deg");
const p_base = document.getElementById("p_base");
const p_latex = document.getElementById("p_latex");
const p_diff = document.getElementById("p_diff");
const g_prod = document.getElementById("g_prod");
const div_menu_style = document.getElementById("div_menu").style;
const p_button_rename_style = document.getElementById("p_button_rename").style;

/* pointers */
const pointerCache = new Array();
var prevPtsDist = null;
var prevPt = null;

/* other globals */
const arr_factors = [1, 3, 7, 15, 23, 29, 33, 42];
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
	if (event.button === 0) {
		div_menu_style.visibility = "hidden";
		div_binfo_style.visibility = "hidden";
		/* This event is cached to support 2-finger gestures */
		pointerCache.push(event);

		if (pointerCache.length === 1) {
			prevPt = new Vector(event.offsetX, event.offsetY);
		}
		else if (pointerCache.length === 2) {
			prevPtsDist = getDistPts();
		}
		restartTimer();
	}
}

/* This function implements a 2-pointer horizontal pinch/zoom gesture. */
function on_pointermove(event) {
	/* Check if this event is in the cache and update it */
	let index = 0;
	for (; index < pointerCache.length; index++) {
		if (event.pointerId === pointerCache[index].pointerId) {
			pointerCache[index] = event;
			break;
		}
	}

	/* Move only when the only one down pointer moves */
	if (pointerCache.length === 1 && index < pointerCache.length) {
		let curPt = new Vector(event.offsetX, event.offsetY);
		let deltaScreen = curPt.sub(prevPt);
		camera.translate(new Vector(deltaScreen.x, -deltaScreen.y));
		prevPt = curPt;
	}

	/* If two pointers are down, check for pinch gestures */
	if (pointerCache.length === 2 && index < pointerCache.length) {
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
	/* Remove this event from the target's cache */
	for (let i = 0; i < pointerCache.length; i++) {
		if (pointerCache[i].pointerId === event_id) {
			pointerCache.splice(i, 1);
			return true;
		}
	}
	return false;
}

function on_pointerup(event) {
	/* Remove this pointer from the cache */
	if (event.button === 0) {
		if (removeEvent(event.pointerId)) {
			if (pointerCache.length === 0) {
				prevPt = null;
			}
			else if (pointerCache.length === 1) {
				prevPt = new Vector(pointerCache[0].offsetX, pointerCache[0].offsetY);
			}
			else if (pointerCache.length === 2) {
				prevPtsDist = getDistPts();
			}
		}

		let tgt = event.target;
		if (tgt.classList.contains("b")) {
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
			if (level === 5000) { p_diff.innerHTML = `Permanant`; }
			else if (level === 9800) { p_diff.innerHTML = `Permanant`; }
			else if (level > 9800) {
				const r = 10000 - level;
				let str_diff = `d_{${r}}(\\mathrm{this})=(${bullet.dataset.d})`;
				str_diff = str_diff.replace('None', '?');
				p_diff.innerHTML = katex.renderToString(str_diff, { throwOnError: false });
			}
			else {
				const r = level;
				let str_diff = `d_{${r}}(${bullet.dataset.d})=\\mathrm{this}`;
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

		restartTimer();
	}
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

	const id_selected = circle_selected.dataset.id.slice(1);
	g_prod.innerHTML = "";
	for (const i of arr_factors) {
		const rect_prod = document.getElementById("rect_prod" + i);
		rect_prod.setAttribute("x", Math.round(bullet.getAttribute("cx")) + Math.round(rect_prod.dataset.x) - 0.5);
		rect_prod.setAttribute("y", Math.round(bullet.getAttribute("cy")) + Math.round(rect_prod.dataset.y) - 0.5);

		const id1 = i, id2 = id_selected;
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

function on_key_down(event) {
	if (typeof MODE !== 'undefined' && MODE == "DualSS") {
		console.log(event.which)
		if (event.which === 39) { // Right arrow
			sep_right += 1;
			AdjustVisibilityBySeparator();
		}
		else if (event.which === 37) { // Left arrow
			sep_right -= 1;
			AdjustVisibilityBySeparator();
		}
		else if (event.which === 38) { // Up arrow
			if(sep_width === 1) {
				sep_right += 1;
				sep_width = sep_max_width;
			}
			else {
				sep_width = 1;
			}
			AdjustVisibilityBySeparator();
		}
		else if (event.which === 40) { // Down arrow
			if(sep_width === 1) {
				sep_width = sep_max_width;
			}
			else {
				sep_right -= 1;
				sep_width = 1;
			}
			AdjustVisibilityBySeparator();
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
	if (!event.ctrlKey) {
		let posX = event.clientX;
		let posY = event.clientY;

		if (event.target.id === "button_cm") {
			div_menu_style.left = null;
			div_menu_style.right = (window.innerWidth - posX) + "px";
		}
		else {
			div_menu_style.left = posX + "px";
			div_menu_style.right = null;
		}
		div_menu_style.top = posY + "px";
		div_menu_style.visibility = "visible";

		event.preventDefault();
	}
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
	alert("Author: Weinan Lin");
}

function AdjustVisibilityByMenu() {
	const bullets = document.getElementsByClassName("b");
	for (const b of bullets) {
		if (b.dataset.page >= config_dynamic.page) {
			b.style.visibility = "visible";
			if (b.dataset.page === "200" && b.dataset.d !== "None" && b.dataset.l > 10000 - config_dynamic.page) {
				b.setAttribute("opacity", "0.6");
			} else {
				b.setAttribute("opacity", "1");
			}

			if (config_dynamic.showLines === "Minimal") {
				if (b.classList.contains("prim_b")) {
					b.setAttribute("stroke", "red");
					b.setAttribute("stroke-width", b.getAttribute("r") / 3);
				}
			}
			else {
				if (b.classList.contains("prim_b")) {
					b.removeAttribute("stroke");
					b.removeAttribute("stroke-width");
				}
			}
		}
		else {
			b.style.visibility = "hidden";
		}
	}
	const structlines = document.getElementsByClassName("strt_l");
	for (const ele of structlines) {
		if (ele.dataset.page >= config_dynamic.page) {
			ele.style.visibility = "visible";
		}
		else {
			ele.style.visibility = "hidden";
		}
	}

	const difflines = document.getElementsByClassName("diff_l");
	if (config_dynamic.showLines === "Minimal") {
		for (const ele of difflines) {
			ele.style.visibility = "hidden";
		}
		for (const ele of document.getElementsByClassName("prim_l")) {
			if (ele.dataset.page >= config_dynamic.page) {
				ele.style.visibility = "visible";
			}
		}
	}
	else {
		for (const ele of difflines) {
			if (ele.dataset.page == config_dynamic.page || (config_dynamic.showLines === "All" && ele.dataset.page > config_dynamic.page)) {
				ele.style.visibility = "visible";
			}
			else {
				ele.style.visibility = "hidden";
			}
		}
	}

	const dashedlines = document.getElementsByClassName("dashed_l");
	if (config_dynamic.showLines !== "Minimal") {
		for (const ele of dashedlines) {
			if (config_dynamic.showDashed && (ele.dataset.r <= config_dynamic.page || config_dynamic.showLines === "All")) {
				ele.style.visibility = "visible";
			}
			else {
				ele.style.visibility = "hidden";
			}
		}
	}
	else {
		for (const ele of dashedlines) {
			ele.style.visibility = "hidden";
		}
	}

	const labels = document.getElementsByClassName("label");
	for (const ele of labels) {
		if (ele.dataset.page >= config_dynamic.page) {
			ele.style.visibility = "visible";
		}
		else {
			ele.style.visibility = "hidden";
		}
	}
}

function on_select_page(event) {
	switch (event.target.value) {
		case "E2":
			config_dynamic.page = 2;
			break;

		case "E3":
			config_dynamic.page = 3;
			break;

		case "E4":
			config_dynamic.page = 4;
			break;

		case "E5":
			config_dynamic.page = 5;
			break;

		case "E6":
			config_dynamic.page = 6;
			break;

		case "Einf":
			config_dynamic.page = 200;
			break;

		default:
			console.log("Faulty on_select_page option" + event.target.value);
			break;
	}
	AdjustVisibilityByMenu();
}

function on_select_dashed(event) {
	switch (event.target.value) {
		case "Show dashed":
			config_dynamic.showDashed = true;
			break;

		case "No dashed":
			config_dynamic.showDashed = false;
			break;

		default:
			console.log("Faulty on_select_dashed option" + event.target.value);
			break;
	}
	AdjustVisibilityByMenu();
}

function on_select_lines(event) {
	config_dynamic.showLines = event.target.value
	AdjustVisibilityByMenu();
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
