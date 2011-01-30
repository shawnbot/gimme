(function(ns) {
  var TMI_ID = 0;

	ns.tmi = function() {
		var tmi = {},
				proj = null,
				container = null,
				data = null,
				radius = null,
				attrs = {};

		var img = document.createElement("img"),
				map = document.createElement("map");
		// default size fills the container
		img.setAttribute("class", "tmi");
		img.setAttribute("width", "100%");
		img.setAttribute("height", "100%");

		function getElement(el) {
			return (typeof el == "string")
					? document.getElementById(el)
					: el;
		}

		// <map> "name" attribute
		tmi.name = function(name) {
			if (arguments.length) {
				map.setAttribute("name", name);
				img.setAttribute("usemap", "#" + name);
				return tmi;
			} else {
				return map.getAttribute("name");
			}
		};

		// get/set size; NOTE: these may be percentages!
		tmi.size = function(w, h) {
			// two arguments: width, height
			if (arguments.length == 2) {
				img.setAttribute("width", w);
				img.setAttribute("width", h);
				return tmi;
			// one argument: {x, y}
			} else if (arguments.length == 1) {
				img.setAttribute("width", w.x);
				img.setAttribute("height", w.y);
				return tmi;
			// no arguments: return "width" and "height" attributes as {x, y}
			} else {
				return {x: img.getAttribute("width"),
								y: img.getAttribute("height")};
			}
		};

		tmi.img = function(el) {
			if (arguments.length) {
				img = getElement(el);
				img.setAttribute("usemap", "#" + tmi.name());
				return tmi;
			} else {
				return img;
			}
		};

		tmi.map = function(el) {
			if (arguments.length) {
				map = getElement(el);
				img.setAttribute("usemap", "#" + tmi.name());
				return tmi;
			} else {
				return img;
			}
		};

		// <img> "src" attribute
		tmi.src = function(src) {
			if (arguments.length) {
				if (typeof src == "undefined") {
					img.removeAttribute("src");
				} else {
					img.setAttribute("src", src);
				}
				return tmi;
			} else {
				return img.getAttribute("src");
			}
		};

		// the <img> and <map> container
		tmi.container = function(c) {
			if (arguments.length) {
				if (container) {
					container.removeChild(img);
					container.removeChild(map);
				}
				container = getElement(c);
				if (container) {
					container.appendChild(img);
					container.appendChild(map);
				}
				return tmi;
			} else {
				return container;
			}
		};

		// the proj function, e.g. modestmaps.js Map.locationPoint()
		tmi.proj = function(func) {
			if (arguments.length) {
				proj = func;
				return tmi;
			} else {
				return proj;
			}
		};

		// GeoJSON data to render
		tmi.data = function(d) {
			if (arguments.length) {
				data = d;
				return tmi;
			} else {
				return data;
			}
		};

		// get/set attributes for each <area>
		tmi.attr = function(attr, value) {
			// two args: set attr value
			if (arguments.length == 2) {

				if (typeof value == "undefined") {
					delete attrs[attr];
				} else {
					attrs[attr] = value;
				}
				return tmi;
			// if only one arg...
			} else if (arguments.length == 1) {
				// get attr value
				if (typeof attr == "string") {
					return attrs[attr];
				// set all attributes
				} else {
					attrs = attr;
					return tmi;
				}
			// get all attributes
			} else {
				return attrs;
			}
		};

		// radius getter for Point geometries:
		// radius(feature) -> number or percentage
		tmi.radius = function(r) {
			if (arguments.length) {
				if (typeof r != "function") {
					radius = function() { return r; };
				} else {
					radius = r;
				}
				return tmi;
			} else {
				return radius;
			}
		};

		// render data to the <map>
		tmi.render = function() {
			if (typeof proj != "function") {
				throw new Error("tmi.render() needs a proj()");
			}

			// clear the map
			while (map.firstChild) {
				map.removeChild(map.firstChild);
			}

			if (typeof data != "undefined") {
				render(data);
			} else {
				// console.log("NO DATA!");
			}
			return tmi;
		};

		// ModestMaps Map callback renderer
		tmi.render.modestmaps = function(modestmap, message) {
			// append to map parent and push our <img> to the front
			tmi.container(modestmap.parent);
			var img = tmi.img();
			img.style.position = "absolute";
			img.style.zIndex = 1000;

			// wrap locationPoint so it's bound to the Map instance
			tmi.proj(function(loc) { return modestmap.locationPoint(loc); });
			tmi.size(modestmap.dimensions);
			tmi.render();
		};

		function render(data) {
			var areas = [];
			switch (data.type) {
				case "FeatureCollection":
					data.features.forEach(function(feature, i) {
						areas = areas.concat(renderFeature(data.features[i], proj));
					});
					break;

				case "GeometryCollection":
					data.geometries.forEach(function(geom) {
						areas = areas.concat(renderFeature({properties: {}, geometry: data.geometries[i]}, proj));
					});
					break;

				case "Feature":
				default:
					areas = renderFeature(data, proj);
					break;
			}

			areas.forEach(function(area) {
				map.appendChild(area);
			});
			return areas;
		}

		function renderFeature(feature, proj) {
			var areas = [],
					geom = feature.geometry;

			switch (geom.type) {
				case "Point":
					// one circular link
					areas.push(point(feature));
					break;

				case "Polygon":
					// one polygonal link
					areas.push(polygon(feature, geom.coordinates[0]));
					break;

				case "MultiPolygon":
					// one link for each polygon
					for (var i = 0; i < geom.coordinates.length; i++) {
						areas.push(polygon(feature, geom.coordinates[i][0]));
					}
					break;

				case "GeometryCollection":
					// one or more links per geometry
					for (var i = 0; i < geom.geometries.length; i++) {
						var rendered = renderFeature({properties: feature.properties, geometry: geom.geometries[i]}, proj);
						areas = areas.concat(rendered);
					}
					break;
			}

			areas.forEach(function(area) {
				applyFeatureAttributes(feature, area);
			});
			return areas;
		}

		// apply feature-specific attributes to an <area>
		function applyFeatureAttributes(feature, area) {
			for (var attr in attrs) {
				var value = attrs[attr];
				if (typeof value == "function") {
					value = value(feature);
				}
				if (typeof value != "undefined") {
					area.setAttribute(attr, value);
				}
			}
		}

		// create an <area> for a given GeoJSON Point feature
		function point(feature) {
			var area = document.createElement("area"),
					geom = feature.geometry;
			area.setAttribute("shape", "circle");
			var p = proj({lon: geom.coordinates[0], lat: geom.coordinates[1]}),
					r = radius(feature.properties);
			area.setAttribute("coords", [p.x, p.y, r].join(","));
			return area;
		}

		// create an <area> for a given polygonal ring
		// NOTE: this function needs a ring, typically the outer ring of a GeoJSON
		// Polygon
		function polygon(feature, ring) {
			var area = document.createElement("area");
			area.setAttribute("shape", "poly");
			area.setAttribute("coords", ring.map(function(c) {
				var p = proj({lon: c[0], lat: c[1]});
				return p.x + "," + p.y;
			}).join(","));
			return area;
		}

		// set the default name
		tmi.name("tmi" + (++TMI_ID));
		// assume that we'll get an "href" property for each feature
		tmi.attr("href", function(feature) { return feature.properties.href; });
		// default radius is 5px
		tmi.radius(5);

		return tmi;
	};

})(window);
