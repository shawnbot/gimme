(function(exports) {
  var GIMME_ID = 0;

	exports.gimme = function() {
		var gim = {},
				proj = null,
				container = null,
				data = null,
				radius = null,
				attrs = {};

		var img = document.createElement("img"),
				map = document.createElement("map");
		// default size fills the container
		img.setAttribute("class", "gim");
		img.setAttribute("width", "100%");
		img.setAttribute("height", "100%");

		function getElement(el) {
			return (typeof el == "string")
					? document.getElementById(el)
					: el;
		}

		// <map> "name" attribute
		gim.name = function(name) {
			if (arguments.length) {
				map.setAttribute("name", name);
				img.setAttribute("usemap", "#" + name);
				return gim;
			} else {
				return map.getAttribute("name");
			}
		};

		// get/set size; NOTE: these may be percentages!
		gim.size = function(w, h) {
			// two arguments: width, height
			if (arguments.length == 2) {
				img.setAttribute("width", w);
				img.setAttribute("width", h);
				return gim;
			// one argument: {x, y}
			} else if (arguments.length == 1) {
				img.setAttribute("width", w.x);
				img.setAttribute("height", w.y);
				return gim;
			// no arguments: return "width" and "height" attributes as {x, y}
			} else {
				return {x: img.getAttribute("width"),
								y: img.getAttribute("height")};
			}
		};

		// get set the target <img> element
		gim.img = function(el) {
			if (arguments.length) {
				img = getElement(el);
				img.setAttribute("usemap", "#" + gim.name());
				return gim;
			} else {
				return img;
			}
		};

		// get set the target <map> element
		gim.map = function(el) {
			if (arguments.length) {
				map = getElement(el);
				img.setAttribute("usemap", "#" + gim.name());
				return gim;
			} else {
				return map;
			}
		};

		// <img> "src" attribute
		gim.src = function(src) {
			if (arguments.length) {
				if (typeof src == "undefined") {
					img.removeAttribute("src");
				} else {
					img.setAttribute("src", src);
				}
				return gim;
			} else {
				return img.getAttribute("src");
			}
		};

		// the <img> and <map> container
		gim.container = function(c) {
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
				return gim;
			} else {
				return container;
			}
		};

		// the proj function, e.g. modestmaps.js Map.locationPoint()
		gim.proj = function(func) {
			if (arguments.length) {
				proj = func;
				return gim;
			} else {
				return proj;
			}
		};

		// GeoJSON data to render
		gim.data = function(d) {
			if (arguments.length) {
				data = d;
				return gim;
			} else {
				return data;
			}
		};

		// get/set attributes for each <area>
		gim.attr = function(attr, value) {
			// two args: set attr value
			if (arguments.length == 2) {

				if (typeof value == "undefined") {
					delete attrs[attr];
				} else {
					attrs[attr] = value;
				}
				return gim;
			// if only one arg...
			} else if (arguments.length == 1) {
				// get attr value
				if (typeof attr == "string") {
					return attrs[attr];
				// set all attributes
				} else {
					attrs = attr;
					return gim;
				}
			// get all attributes
			} else {
				return attrs;
			}
		};

		// radius getter for Point geometries:
		// radius(feature) -> number or percentage
		gim.radius = function(r) {
			if (arguments.length) {
				if (typeof r != "function") {
					radius = function() { return r; };
				} else {
					radius = r;
				}
				return gim;
			} else {
				return radius;
			}
		};

		// render data to the <map>
		gim.render = function() {
			if (typeof proj != "function") {
				throw new Error("gim.render() needs a proj()");
			}

			// append the <map> to the DOM in the <img>'s parent
			if (!map.parentNode && img.parentNode) {
				img.parentNode.appendChild(map);
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
			return gim;
		};

		// ModestMaps Map callback renderer
		gim.render.modestmaps = function(modestmap, message) {
			// append to map parent and push our <img> to the front
			gim.container(modestmap.parent);
			var img = gim.img();
			img.style.position = "absolute";
			img.style.zIndex = 1000;

			// wrap locationPoint so it's bound to the Map instance
			gim.proj(function(loc) { return modestmap.locationPoint(loc); });
			gim.size(modestmap.dimensions);
			gim.render();
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
		gim.name("gim" + (++GIMME_ID));
		// assume that we'll get an "href" property for each feature
		gim.attr("href", function(feature) { return feature.properties.href; });
		// default radius is 5px
		gim.radius(5);

		return gim;
	};

})(window); // FIXME
