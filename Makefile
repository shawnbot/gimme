all: lib/modestmaps.min.js lib/polymaps.min.js

lib/modestmaps.min.js:
	curl "https://github.com/stamen/modestmaps-js/raw/master/modestmaps.min.js" > $@

lib/polymaps.min.js:
	curl "https://github.com/simplegeo/polymaps/raw/master/polymaps.min.js" > $@

clean:
	rm -f lib/modestmaps.min.js
	rm -f lib/polymaps.min.js
