/**
 * Created by Zach Grant on 8/17/15.
 */

console.log('start script');
// code to extend L.Marker and enable adding of id's to each marker --
// KEEP AT TOP
(function(L) {

	/*
	 * by tonekk. 2014, MIT License
	 */

	L.ExtendedDivIcon = L.DivIcon.extend({
		createIcon: function(oldIcon) {
			var div = L.DivIcon.prototype.createIcon.call(this, oldIcon);

			if(this.options.id) {
				div.id = this.options.id;
			}

			if(this.options.style) {
				for(var key in this.options.style) {
					div.style[key] = this.options.style[key];
				}
			}

			return div;
		}
	});

	L.extendedDivIcon = function(options) {
		return new L.ExtendedDivIcon(options);
	}
})(window.L);


// this enables dropdown to stay open while filling in filter options on mobile-view filter dropdown

$('div.dropdown.mega-dropdown button').on('click', function (event) {
	$(this).parent().toggleClass('open');
});


$('body').on('click', function (e) {
	if (!$('div.dropdown.mega-dropdown').is(e.target)
		&& $('div.dropdown.mega-dropdown').has(e.target).length === 0
		&& $('.open').has(e.target).length === 0
	) {
		$('div.dropdown.mega-dropdown').removeClass('open');
	}
});



///////////////////////////////////////////////////////////////////////////////////
/*
 * Set up Map and necessary layers and variables
 *
 *
 *
 */


// create global:
window.Voter = window.Voter || {};

console.log('next set up map:');

// set up map
map = L.map('map', {closePopupOnClick: true});

console.log('next set up tile layer:');

L.tileLayer( 'http://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: "Esri, HERE, DeLorme, USGS, Intermap, increment P Corp., NRCAN, Esri Japan, METI, " +
	"Esri China (Hong Kong), Esri (Thailand), MapmyIndia, © OpenStreetMap contributors, and the GIS User Community ",
	noWrap: 'true'
}).addTo( map );


console.log('next set up globals:');

// LAYERS
// layer to hold all location icons and add to map
Voter.locationsLayer = L.layerGroup().addTo(map);

// layer to hold all original icons,  add to map
Voter.allIconsLayer = L.layerGroup().addTo(map);

//set up arrays to hold location info and heatmap
Voter.all = [];
Voter.locations = [];

Voter.zoomList = [];
Voter.heat = [];
Voter.maxWait = 60;

// set global variable to adjust location to center of off-center map view when list is overlayed on left of map.
Voter.latlngAdjustment = -.07;

// set up sort booleans for re-sorting when new items added or removed from all location array
Voter.isSortListByMaxWait = true;

console.log('next set up data:');

// pull in data from API, assign to global locations array
var url = "data/voting_locations_json.json";
//var url = "http://where2vote.unm.edu/locationinfo/";
$.ajax({
	url     : url,
	dataType: 'json',
	success : function(data) {
		console.log(data);
		var theThing = 1;
		for(x in data) {

			data[x].count = 7 + theThing;

			var theId = "id" + data[x].UniqueID;
			Voter.locations[theId] = data[x];
			theThing++;
		}
		console.log(Voter.locations);
		setBaseLocation();
		checkForLocations(Voter.lat, Voter.lng);
		findCurrentLocation();
	}
});




///////////////////////////////////////////////////////////////////////////////////
/*
 * Set View using Location Data
 *
 *
 *
 */

// set view to default address, then get current location or keep to default runner base address

function setBaseLocation (lat, lng) {
	console.log ('setBaseLocation fires now');
	Voter.lat = 35.077982299999995;
	Voter.lng = -106.643478;

	var voterLatLong = [Voter.lat, Voter.lng];

	var adjustedLatLong = [Voter.lat, Voter.latlngAdjustment + Voter.lng];
	map.setView(adjustedLatLong, 12);

	var currentLocationButton;
	currentLocationButton = "<br/><button class='btn btn-danger btn-xs' id = 'homePopupButton' onClick='tryAgain()'>Try Current Location Again</button></div>";

	// build variable for popup display
	var locationDetails2 =	"<div style = 'text-align: center'><strong>You can edit your default <br/>address in settings.  " +
		"</strong>"+ currentLocationButton;

	// build html to use in icon
	var homeMarker = "Home" +
		"<div class='leaflet-popup-tip-container' style='margin-top: 4px; margin-left: 0px'>" +
		"<div class='leaflet-popup-tip your-location-pointer'></div></div> ";

	var iconAnchor2 = turf.point([Voter.lng, Voter.lat]);

	// build custom icon
	myAddressIcon = L.divIcon({
		iconSize   	: [40, 30],
		className  	: "address-icon",
		iconAnchor 	: iconAnchor2,
		popupAnchor	: [0, -35],
		html       	: homeMarker
	});

	// build popup for use in switching
	Voter.addressPopup = L.popup().setContent(locationDetails2);

	// add icon to map with popup
	L.marker(voterLatLong, {icon: myAddressIcon, title: "Home Address"}).addTo(Voter.locationsLayer)
		.bindPopup(Voter.addressPopup).openPopup();
}

function findCurrentLocation() {
	map.locate();
	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);
}

function onLocationFound(e) {
	console.log ('onLocationFound fires now');

	// build popup display
	Voter.currentRadius = Math.round(e.accuracy / 2);
	Voter.currentLocation = e.latlng;
	Voter.currentLat = e.latlng.lat;
	Voter.currentLng = e.latlng.lng;

	map.setView([Voter.currentLat, Voter.currentLng + Voter.latlngAdjustment], 12);

	var locationDetails ="<div style = 'text-align: center'><strong>We think you are within <br/> " + Voter.currentRadius +
		" meters of this point. </strong><br/>" +
		"<button class='btn btn-danger btn-xs' id = 'currentPopupButton' onClick='changeLocations(" + false + ")'>" +
		"Use Default Address Instead</button></div>";


	// build html to use in icon
	var currentLocationMarker = "You!" +
		"<div class='leaflet-popup-tip-container' style='margin-top: 0px; margin-left: -5px'>" +
		"<div class='leaflet-popup-tip your-location-pointer'></div></div> ";

	var iconAnchor = turf.point([Voter.currentLocation[1], Voter.currentLocation[0]]);


	// build custom icon
	myLocationIcon = L.divIcon({
		iconSize   : [30, 30],
		className  : "your-location-icon",
		iconAnchor : iconAnchor,
		popupAnchor: [0, -35],
		html       : currentLocationMarker
	});


	// build popup for use in switching
	Voter.currentPopup = L.popup().setContent(locationDetails);


	// add icon and range circle to map
	L.marker(Voter.currentLocation, {icon: myLocationIcon, title: "Current Location"}).addTo(Voter.locationsLayer)
		.bindPopup(Voter.currentPopup).openPopup();

	L.circle(Voter.currentLocation, Voter.currentRadius).addTo(Voter.locationsLayer);


	// fixme is this the right function to recalc distance etc.
	//checkForLocations(Voter.currentLat, Voter.currentLng);
	changeLocations(true);

	// fixme doesn't work set up zoom events
	resetZoomEvents();
}


function onLocationError(e) {
	console.log ('onLocationError fires now');

	// notify user
	alert(e.message);
	// re-set view with Runner Address as base'
	setToHomeAddress();
}


function tryAgain(){
	//remove any layers already built
	tearDown();
	// retry
	findCurrentLocation();
}


function changeLocations(isToCurrent){
	console.log ('changeLocations fires now');

	//remove any layers already built
	tearDown();
	map.removeLayer(Voter.locationsLayer);
	Voter.locationsLayer = L.layerGroup().addTo(map);


	if (isToCurrent){
		rebuildHomeIcon(true);
		rebuildCurrentIcon(true);
		setToCurrentLocation();

	} else {
		rebuildHomeIcon(false);
		rebuildCurrentIcon(false);
		setToHomeAddress();
	}
}

function rebuildHomeIcon(isToCurrent){
	console.log ('rebuildHomeIcon fires now');
	if(isToCurrent){
		var theBool = false;
		var theInnerHtml = "Switch to this location as base.";

	} else {
		var theBool = true;
		var theInnerHtml = "Use current location instead";
	}

	var voterLatLong = [Voter.lat, Voter.lng];
	var currentLocationButton;
	currentLocationButton = "<br/><button class='btn btn-danger btn-xs' id = 'homePopupButton' " +
	"onClick='changeLocations(" + theBool + ")'>" + theInnerHtml + "</button></div>";

	// build variable for popup display
	var locationDetails2 =	"<div style = 'text-align: center'><strong>You can edit your default <br/>address in settings.  " +
		"</strong>"+ currentLocationButton;


	// build html to use in icon
	var homeMarker = "Home" +
		"<div class='leaflet-popup-tip-container' style='margin-top: 4px; margin-left: 0px'>" +
		"<div class='leaflet-popup-tip your-location-pointer'></div></div> ";

	var iconAnchor2 = turf.point([Voter.lng, Voter.lat]);

	// build custom icon
	myAddressIcon = L.divIcon({
		iconSize   	: [40, 30],
		className  	: "address-icon",
		iconAnchor 	: iconAnchor2,
		popupAnchor	: [0, -35],
		html       	: homeMarker
	});

	// build popup for use in switching
	Voter.addressPopup = L.popup().setContent(locationDetails2);

	// add icon to map with popup
	L.marker(voterLatLong, {icon: myAddressIcon, title: "Home Address"}).addTo(Voter.locationsLayer)
		.bindPopup(Voter.addressPopup).openPopup();
}


function rebuildCurrentIcon(isToCurrent){
	console.log ('rebuildCurrentIcon fires now');

	if(isToCurrent){
		var theBool = false;
		var theInnerHtml = "Use default address instead.";

	} else {
		var theBool = true;
		var theInnerHtml = "Switch to this location as base.";
	}

	var locationDetails ="<div style = 'text-align: center'><strong>We think you are within <br/> " + Voter.currentRadius +
		" meters of this point. </strong><br/>" +
		"<button class='btn btn-danger btn-xs' id = 'currentPopupButton' onClick='changeLocations(" + theBool + ")'>" +
		theInnerHtml + "</button></div>";

	// build html to use in icon
	var currentLocationMarker = "You!" +
		"<div class='leaflet-popup-tip-container' style='margin-top: 0px; margin-left: -5px'>" +
		"<div class='leaflet-popup-tip your-location-pointer'></div></div> ";

	var iconAnchor = turf.point([Voter.currentLocation[1], Voter.currentLocation[0]]);

	// build custom icon
	myLocationIcon = L.divIcon({
		iconSize   : [30, 30],
		className  : "your-location-icon",
		iconAnchor : iconAnchor,
		popupAnchor: [0, -35],
		html       : currentLocationMarker
	});

	// fixme might be able to just tear down popup layer and then readd?
	// build popup for use in switching
	Voter.currentPopup = L.popup().setContent(locationDetails);

	// add icon and range circle to map
	L.marker(Voter.currentLocation, {icon: myLocationIcon, title: "Current Location"}).addTo(Voter.locationsLayer)
		.bindPopup(Voter.currentPopup).openPopup();

	L.circle(Voter.currentLocation, Voter.currentRadius).addTo(Voter.locationsLayer);
}


// enables bouncing back and forth between locations
function setToCurrentLocation() {
	console.log ('setToCurrentLocation fires now');

	map.setView([Voter.currentLat, Voter.currentLng  + Voter.latlngAdjustment], 12).openPopup(Voter.currentPopup);
	checkForLocations(Voter.currentLat, Voter.currentLng);

	// set up zoom events
	resetZoomEvents();
}

// enables bouncing back and forth between locations
function setToHomeAddress() {
	console.log ('setToHomeAddress fires now');

	map.setView([Voter.lat, Voter.lng + Voter.latlngAdjustment], 12).openPopup(Voter.addressPopup);

	checkForLocations(Voter.lat, Voter.lng);

	// set up zoom events
	resetZoomEvents();
}




///////////////////////////////////////////////////////////////////////////////////
/*
 * Functions to Build Original List and Map Icons
 *
 *
 *
 */

function checkForLocations(lat, long){
	console.log ('checkForLocations fires now');
	// check if query returned locations.  Then check if all array has already been filled.
	if (Voter.locations === ""){
		alert("We cannot find any locations near you at this time.");

	} else if (Voter.all[0] != null) {
		console.log ('not first time set up, within checkForLocations fires now');
		// code to rebuild from pre-made Voter.all lists to previous list locations
		if (Voter.all[0] != null) {
			console.log('rebuilding ALL and ZOOM lists after location change');

			reCalcDistance(lat, long); // for all list
			resetZoomList(); // re-curate zoom list from new All List to update distances.
		}

	} else {
		// set up for first time:
		console.log ('set up for first time: fires now inside Check For locations');

		// build all array and zoomList array from scratch using all locations from DB
		buildAllArrayWithDistance(lat, long);

		// set up initial page
		buildIconsAndLists("insertMapListHere");

		// set combined template into live div and reset template
		buildCombinedView();
	}
}

// reCalcDistance of all locations in case of base location change
function reCalcDistance(lat, long) {
	console.log ('reCalcDistance fires now');

	array = Voter.all;
	// loop through all locations
	for (var x = 0; x < array.length; x ++) {

		// calc distance
		var point1 = {
			"type"      : "Feature",
			"properties": {},
			"geometry"  : {
				"type"       : "Point",
				"coordinates": [long, lat]
			}
		};

		var point2 = {
			"type"      : "Feature",
			"properties": {},
			"geometry"  : {
				"type"       : "Point",
				"coordinates": [array[x].lon, array[x].lat]
			}
		};

		array[x].Distance = turf.distance(point1, point2, "miles").toFixed(2);
	}

	console.log('Voter.all after change locations');
	console.log(Voter.all);
}

// build all array and calc Distance.  initially sorted by lowest waitTime.
function buildAllArrayWithDistance(lat, long) {
	console.log ('buildAllArrayWithDistance fires now');
	console.log ('Voter.locations list is ');
	console.log (Voter.locations);

	// loop through all locations
	for( x in Voter.locations) {
		// calc distance
		var point1 = 	{
			"type": "Feature",
			"properties": {},
			"geometry": {
				"type": "Point",
				"coordinates": [long, lat]
			}
		};

		var point2 = 	{
			"type": "Feature",
			"properties": {},
			"geometry": {
				"type": "Point",
				"coordinates": [Voter.locations[x].lon, Voter.locations[x].lat]
			}
		};

		Voter.locations[x]["Distance"] = turf.distance(point1, point2, "miles").toFixed(2);

		// add all locations to allList
		Voter.all.push(Voter.locations[x]);

		// check if location is within the map view and add to zoom list
		if (map.getBounds().contains( [Number(Voter.locations[x].lat), Number(Voter.locations[x].lon)] )) {
			// only add items in view to zoomList
			Voter.zoomList.push(Voter.locations[x]);
		}
	}

	console.log("zoomList on load is ");
	console.log(Voter.zoomList);

	console.log("allList on load is ");
	console.log(Voter.all);
}

// apply color code to each location based on nearest
function buildHeatMap(){
	console.log ('buildHeatMap fires now');

	// collect Distances to build heat map
	var distances = [];
	var withinDistances = [];
	var theLocationId;
	for (things=0; things< Voter.all.length; things++) {
		theLocationId = "id" + Voter.all[things].UniqueID;
		if(checkMaxWait(theLocationId)) {
			distances.push(Voter.all[things].Distance);
			withinDistances.push(theLocationId);
		}
	}

	var max = Math.max.apply(Math, distances);
	var min = Math.min.apply(Math, distances);
	var totalIncrements = 20;
	var increment = (max-min)/(totalIncrements-1);
	var theId;
	var theDistance;

	for (things = 0; things < withinDistances.length; things++) {
		theId = withinDistances[things];
		theDistance = Voter.locations[theId].Distance;
		Voter.heat[theId] = Math.round((theDistance-min+(increment/2))/increment);
	}

	return withinDistances;
}

///////////////////////////////////////////////////////////////////////////////////
/*
 * Functions that Build Stuff
 *
 *
 *
 */

// build all list and icons from scratch using all arrays.
function buildIconsAndLists(listLocationAll){
	console.log ('buildIconsAndLists fires now');
	// build all list and icons
	if (Voter.all[0] != null) {
		// rebuild all icons
		build(null, "isAll");
		// rebuild zoom List
		build(listLocationAll, "isZoomList");
	}
}

// checks against maxWait, then builds both icons and locations for all groupings depending on boolean
function build(listLocation, whichArray){
	console.log ('build fires now');
	console.log ("whichArray is " + whichArray);
	// set variables
	var array = [];
	var counta;
	var count;
	var counter;
	var theLocationId;

	// build only "all" icons
	if (whichArray === "isAll") {
		console.log ('build the allList should fire now');

		//rebuild heat map array and underMaxWait array out of all array
		var underMaxWait = buildHeatMap();
		console.log (underMaxWait);

		// rebuild icon and buffer for each item underMaxWait array
		for(count = 0; count < underMaxWait.length; count++) {
			theLocationId = underMaxWait[count];
			buildIcon(theLocationId);
		}

		// if undefined, build zoom list only (no icons)
	} else if (whichArray === "isZoomList") {
		array = Voter.zoomList;
		counta = 1;
		// rebuild the layers and list for given array
		for(count = 0; count < array.length; count++) {
			theLocationId = "id" + array[count].UniqueID;
			if(checkMaxWait(theLocationId)) {
				//rebuild zoom List
				counter = count + counta;
				buildListItem(	theLocationId,
					listLocation,
					counter,
					false);
			}
		}
	}
}


// plot a single location icon and buffer zone
function buildIcon(theId) {
	//console.log ('buildIcon fires now');

	// set variables
	var theLocation = Voter.locations[theId];
	var timeString;
	var iconClass;
	var iconId;
	var theLayer;
	iconClass = 'location-icon heatmap-' + Voter.heat[theId];
	iconId = 'locationIcon-' + theId;
	theLayer = Voter.allIconsLayer;

	// build random point from latlong in DB
	var locationPoint = turf.point([theLocation.lon, theLocation.lat]);

	// build point at top of the circle to use for the delivery area marker and icon
	var anchor = turf.destination(locationPoint, 0.2, 0, 'miles');


	// build time string
	if(theLocation.count >= 10){
		timeString = "00:"+ theLocation.count;
	} else{
		timeString = "00:0"+ theLocation.count;
	}

	// build html to use in icon
	var waitTimeMarker = timeString +
		"<div class='leaflet-popup-tip-container' style='margin-top: -0.6px'>" +
		"<div class='leaflet-popup-tip location-pointer'></div></div> ";

	// build custom icon
	locationIcon = L.extendedDivIcon({
		iconSize   	: [50, 25],
		className  	: iconClass,
		iconAnchor 	: anchor,
		popupAnchor	: [10, -35],
		html       	: waitTimeMarker,
		id				: iconId

	});

	// build LocationDetails template using correct location id
	editLocationDetails (theId, false);

	// set variable for location detail display
	var locationBodyDetails = document.getElementById("locationBodyDetails").innerHTML;

	// load icon to geojson layer with anchor as the underlying point
	var locationMarker = L.geoJson(anchor, {
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, {icon: locationIcon, riseOnHover: true});
		}
	}).bindPopup(locationBodyDetails);

	theLayer.addLayer(locationMarker);
}


function buildListItem(theId, listLocation, counter){
	//console.log ('buildListItem fires now');

	var cssId = "collapse" + counter;
	var href = "#" + cssId;

	// build time string
	var timeString;
	if(Voter.locations[theId].count >= 10){
		timeString = "00:"+ Voter.locations[theId].count;
	} else{
		timeString = "00:0"+ Voter.locations[theId].count;
	}

	// set href and waitTime in buildList template
	document.getElementById("cssId").					setAttribute("id", cssId);
	document.getElementById("insert-list-panel-id").setAttribute("onmouseover", "highlightIcon(\'" + theId + "\');");
	document.getElementById("insert-list-panel-id").setAttribute("onmouseout", "unHighlight(\'" + theId + "\');");
	document.getElementById("insert-list-panel-id").setAttribute("id", "list-panel-"+theId);
	document.getElementById("list-href").				setAttribute("href", href);
	document.getElementById("list-waitTime").				innerHTML = timeString;

	// pass isList boolean = true with location description to edit location details using template
	editLocationDetails (theId, true);

	var theList = document.getElementById(listLocation).innerHTML;

	// add each buildList div to insertListHere div
	document.getElementById(listLocation).innerHTML = theList + document.getElementById("buildList").innerHTML;

	// reset ids for each of template template cssId, and list item panel
	resetBuildListTemplate(theId, counter)
}



///////////////////////////////////////////////////////////////////////////////////
/*
 * Rebuild Functions
 *
 *
 *
 */

function rebuildAll() {
	console.log ('rebuildAll fires now');
	// remove all layers and reset
	tearDown();
	findListLocation();
}

function tearDown(){
	console.log ('tearDown fires now');

	// remove layers
	map.removeLayer(Voter.allIconsLayer);

	// reset layers
	Voter.allIconsLayer = L.layerGroup().addTo(map);

}


function findListLocation(){
	console.log ('findListLocation fires now');
	// find location of live base list and reset
	document.getElementById("mapListLive").innerHTML = "";
	var listLocation = "mapListLive";
	buildIconsAndLists(listLocation);
}



///////////////////////////////////////////////////////////////////////////////////
/*
 * All filter related functions
 *
 *
 *
 */

// sort list by waitTime or by distance
function sortArray(isByWaitTime){
	console.log("sortArray fires now");

	var theArray = Voter.zoomList;

	// check for byWaitTime or byNearest
	if(isByWaitTime) {
		document.getElementById('byLowestLive').style.backgroundColor = "#A54A4A";
		document.getElementById('byLowestLive').style.color = "white";
		document.getElementById('byNearestLive').style.backgroundColor = "sandybrown";
		document.getElementById('byNearestLive').style.color = "black";

		theArray.sort(function(a, b) {
			return a.count - b.count
		})
	} else {
		document.getElementById('byLowestLive').style.backgroundColor = "sandybrown";
		document.getElementById('byLowestLive').style.color = "black";
		document.getElementById('byNearestLive').style.backgroundColor = "#A54A4A";
		document.getElementById('byNearestLive').style.color = "white";

		theArray.sort(function(a, b) {
			return a.Distance - b.Distance
		})
	}
	//console.log ('zoomList AFTER SORT: ');
	//console.log (Voter.zoomList);

	//reset the sort boolean to new value
	Voter.isSortListByMaxWait = isByWaitTime;
	rebuildAll();
}


// TOGGLING ALL PREFERENCES
// Show only Preferred -- Deprecated for now but can be refactored for a different filter
function showPreferredOnly(){
	console.log ('showPreferredOnly fires now');

	// hide all location icons
	var icons = document.getElementsByClassName("location-icon");
	var index;
	for (index = 0; index < icons.length; index++) {
		icons[index].style.visibility = "hidden";
	}

	// hide allBuffer layer
	map.removeLayer(Voter.allBufferLayer);

	// close last opened popup
	map.closePopup();

	// re-set ShowPreferred Checkboxes
	document.getElementById("preferredBox").setAttribute( "onClick", "showAll()" );
	document.getElementById("mobilePreferredBox").setAttribute( "onClick", "showAll()" );

	// make sure both checkboxes are checked
	document.getElementById("preferredBox").checked = true;
	document.getElementById("mobilePreferredBox").checked = true;
}


// Unhide all non-preferred locations
function showAll(){
	console.log ('showAll fires now');

	var icons = document.getElementsByClassName("location-icon");
	var index;
	for (index = 0; index < icons.length; index++) {
		icons[index].style.visibility = "visible";
	}

	// Add allBuffers layer back
	map.addLayer(Voter.allBufferLayer);

	// re-set ShowPreferred Checkbox
	document.getElementById("preferredBox").setAttribute( "onClick", "showPreferredOnly()" );
	document.getElementById("mobilePreferredBox").setAttribute( "onClick", "showPreferredOnly()" );

	// make sure both checkboxes are UNchecked
	document.getElementById("preferredBox").checked = false;
	document.getElementById("mobilePreferredBox").checked = false;
}


// Max Wait FILTER
// change max wait, apply if checkbox is checked
function changeMaxWait(dollars) {
	console.log ('changeMaxWait fires now');

	// fixme: validate input!
	// ensure input is number format and reset maxWait to value of input
	Voter.maxWait = Number(dollars);

	// ensure both
	document.getElementById("theMaxWait").value = Voter.maxWait;
	document.getElementById("theMobileMaxWait").value = Voter.maxWait;


	if(document.getElementById("isMaxWait").checked){
		rebuildAll();
	}

}

// toggle maxWait on
function selectMaxWait (){
	console.log ('selectMaxWait fires now');

	// switch onclick function for max wait checkboxes
	document.getElementById("isMaxWait").setAttribute( "onclick", "unselectMaxWait()" );
	document.getElementById("isMobileMaxWait").setAttribute( "onclick", "unselectMaxWait()" );

	// make sure both checkboxes are "checked"
	document.getElementById("isMaxWait").checked = true;
	document.getElementById("isMobileMaxWait").checked = true;

	rebuildAll();

}

// toggle maxWait off
function unselectMaxWait() {
	console.log ('unselectMaxWait fires now');

	// assign current max wait to temp value
	var tempMaxWait = Voter.maxWait;

	// set maxWait to 0 to show all locations
	Voter.maxWait = 0;


	// switch onclick function for max wait checkbox
	document.getElementById("isMaxWait").setAttribute("onclick", "selectMaxWait()");
	document.getElementById("isMobileMaxWait").setAttribute("onclick", "selectMaxWait()");

	// make sure both checkboxes are not "checked"
	document.getElementById("isMaxWait").checked = false;
	document.getElementById("isMobileMaxWait").checked = false;

	// rebuild all layers
	rebuildAll();


	// reset maxWait to previous number
	Voter.maxWait = tempMaxWait;
}




///////////////////////////////////////////////////////////////////////////////////
/*
 * Helper and Highlight Functions
 *
 *
 *
 */

// edit location details of hidden template for  popup display
function editLocationDetails (theId, isList) {

	// determine with location details are going in the list items or the icon popups
	if (isList){
		var listName = "list-";
	} else {
		var listName = "";
	}

	// get google maps link to find directions
	var addressLink = "https://www.google.com/maps/dir/Current+Location/" + Voter.locations[theId].Address.replace(/ /g, '+');

	// calculate number of hours since last updated wait estimat
	var hoursSince = (Voter.locations[theId].minutesold/60).toFixed(2).toString();

	// inject them into the appropriate html stubs
	document.getElementById(listName + "addressLink").			setAttribute('href', addressLink);
	document.getElementById(listName + "address").				innerHTML = Voter.locations[theId].Address;
	document.getElementById(listName + "lastUpdate").			innerHTML = hoursSince;
	document.getElementById(listName + "name").					innerHTML = Voter.locations[theId].MVCName;
	document.getElementById(listName + "distance").				innerHTML = Voter.locations[theId].Distance;

	document.getElementById(listName + "voting-type").			innerHTML = Voter.locations[theId].Voting;
	document.getElementById(listName + "electionDayTime").	innerHTML = Voter.locations[theId].ElectionDayTime;
	document.getElementById(listName + "openDate").				innerHTML = Voter.locations[theId].OpenDate;

}

// check if meets max wait time criteria set by user
function checkMaxWait(theId){
	// check if max wait checkbox is checked "on" and if so, check if meets the criteria
	if (!document.getElementById('isMaxWait').checked
		|| Voter.locations[theId].count <= Voter.maxWait) {
		return true;
	}
}


function resetBuildListTemplate(id, counter){
	//console.log ('resetBuildListTemplate fires now');
	document.getElementById("list-panel-" + id).setAttribute("id", "insert-list-panel-id");
	document.getElementById("collapse" + counter).setAttribute('id', 'cssId');
}


// highlight on mouseover
function highlightIcon(theId){
	//console.log ('highlightIcon fires now');
	if(!!document.getElementById("locationIcon-" + theId)) {
		document.getElementById("locationIcon-" + theId).style.background = "yellow";
		document.getElementById("locationIcon-" + theId).style.color = "black";
		document.getElementById("locationIcon-" + theId).style.zIndex = 100000;
	}
}

// unhighlight on mouseout

function unHighlight(theId) {
	//console.log ('unHighlight fires now');
	if(!!document.getElementById("locationIcon-" + theId)) {
		document.getElementById("locationIcon-" + theId).style.background = "";
		document.getElementById("locationIcon-" + theId).style.color = "";
		document.getElementById("locationIcon-" + theId).style.zIndex = "";
	}
}

///////////////////////////////////////////////////////////////////////////////////
/*
 * All view-toggling functions
 *
 *
 *
 */

function decideView(message) {
	console.log('decideView fires now');

	//document.getElementById("isListView").value = "list-off";
	console.log(message);
	// check source:
	if(message === "map-on") {
		console.log('Starting map-on');
		console.log(message);

		//...then map only box was turned on.  First reset the map checkbox value.
		document.getElementById("mapViewId").value = "map-off";

		// then hide the list div regardless of view it contains to show map-only view.
		document.getElementById("listGoesHere").style.display = "none";

		console.log('Map on works');

	} else if(message === "map-off") {
		console.log('Starting map-off');
		//...then map only box was turned off.  First reset the map checkbox value.
		document.getElementById("mapViewId").value = "map-on";

		// Unhide listGoesHere div....
		document.getElementById("listGoesHere").style.display = "inline";

		console.log('Map-off worked');
	}
}


function buildCombinedView(){
	console.log ('buildCombinedView fires now');

	// add new id's to soon-to-be-live list
	document.getElementById("insertMapListHere").				setAttribute('id', 'mapListLive');

	// add new ids to tabs and sort buttons
	//document.getElementById("zoomTabLink").					setAttribute('href', '#liveZoomTab');
	//document.getElementById("zoomTabLink").					setAttribute('aria-controls', 'liveZoomTab');
	document.getElementById("zoomTabLink").					setAttribute('id', 'liveZoomLink');
	document.getElementById("zoomPane").						setAttribute('id', 'liveZoomTab');

	document.getElementById("byLowest").						setAttribute('id', 'byLowestLive');
	document.getElementById("byNearest").						setAttribute('id', 'byNearestLive');

	// add new ids to scrollable list for hiding
	document.getElementById("scrollableList").				setAttribute('id', 'liveScrollableList');
	document.getElementById("listRow").							setAttribute('id', 'liveListRow');



	// set list live by putting it into the list div and identifying it with new value string
	//console.log("innerHTML being added");
	//console.log(document.getElementById("buildListInMap").innerHTML);

	document.getElementById("listGoesHere").					innerHTML = document.getElementById("buildListInMap").innerHTML;
	document.getElementById("listGoesHere").					value = 'combined';

	// reset template html and id's
	document.getElementById('mapListLive').					innerHTML = "";
	document.getElementById('mapListLive').					setAttribute('id', "insertMapListHere");

	// reset hrefs and links on template
	// document.getElementById("liveZoomLink").					setAttribute('href', '');
	// document.getElementById("liveZoomLink").					setAttribute('aria-controls', '');
	document.getElementById("liveZoomLink").					setAttribute('id', 'zoomTabLink');
	document.getElementById("liveZoomTab").					setAttribute('id', 'zoomPane');

	document.getElementById("byLowestLive").					setAttribute('id', 'byLowest');
	document.getElementById("byNearestLive").					setAttribute('id', 'byNearest');

	// reset scrollable list
	document.getElementById("liveScrollableList").						setAttribute('id', 'scrollableList');
	document.getElementById("liveListRow").							setAttribute('id', 'listRow');

}



function showMobileMap(){
	console.log ('showMobileMap fires now');

	console.log('mobileMap fired');
	console.log(document.getElementById('scrollableList'));
	document.getElementById('liveScrollableList').style.display = "none";
	document.getElementById('liveListRow').style.height = "0%";
	document.getElementById('liveZoomLink').style.display = "none";
	document.getElementById('mapToggler').style.display = "none";
	document.getElementById('listToggler').style.display = "inline";
}


function hideMobileMap(){
	console.log ('hideMobileMap fires now');

	document.getElementById('liveScrollableList').style.display = "block";
	document.getElementById('liveListRow').style.display = "block";
	document.getElementById('liveZoomLink').style.display = "block";
	document.getElementById('mapToggler').style.display = "inline";
	document.getElementById('listToggler').style.display = "none";
}



///////////////////////////////////////////////////////////////////////////////////
/*
 * Zone Filter-related Functions
 *
 *
 *
 */

function resetZoomEvents() {
	map.on("moveend", resetZoomList);
	map.on("zoomend", resetZoomList);
	map.on("rezize", resetZoomList);
}

function resetZoomList () {
	console.log ('resetZoomList fires now');
	Voter.zoomList = [];
	for (var x = 0; x < Voter.all.length; x++) {
		if(map.getBounds().contains( [Number(Voter.all[x].lat), Number(Voter.all[x].lon)] )) {
			Voter.zoomList.push(Voter.all[x]);
		}
	}
	console.log ('resetZoomList is done:');
	console.log (Voter.zoomList);

	sortArray(Voter.isSortListByMaxWait);
}




///////////////////////////////////////////////////////////////////////////////////
/*
 * DropDown Menu Manipulations: opens dropdowns within the dropdown
 * fixme: deprecated unless we have more filter options.
 *
 *
 */

function showBasics(){
	console.log('showBasics fired');
	document.getElementById('hiddenBasics').style.display = "inline-block";
	document.getElementById('basicsHr').style.display = "block";
	document.getElementById('basicsButton').setAttribute("onclick", "hideBasics()");
}

function hideBasics(){
	console.log('hideBasics fired');
	document.getElementById('hiddenBasics').style.display = "none";
	document.getElementById('basicsHr').style.display = "none";
	document.getElementById('basicsButton').setAttribute("onclick", "showBasics()");
}

function showSort(){
	console.log('showSort fired');
	document.getElementById('hiddenSort').style.display = "inline-block";
	document.getElementById('sortHr').style.display = "block";
	document.getElementById('sortButton').setAttribute("onclick", "hideSort()");
}

function hideSort(){
	console.log('hideSort fired');
	document.getElementById('hiddenSort').style.display = "none";
	document.getElementById('sortHr').style.display = "none";
	document.getElementById('sortButton').setAttribute("onclick", "showSort()");
}

function showReset(){
	console.log('showReset fired');
	document.getElementById('hiddenReset').style.display = "inline-block";
	//document.getElementById('resetHr').style.display = "block";
	document.getElementById('resetButton').setAttribute("onclick", "hideReset()");
	var myDiv = document.getElementById("filterDrowdownArea");
	myDiv.scrollTop = myDiv.scrollHeight;
}

function hideReset(){
	console.log('hideReset fired');
	document.getElementById('hiddenReset').style.display = "none";
	//document.getElementById('resetHr').style.display = "none";
	document.getElementById('resetButton').setAttribute("onclick", "showReset()");
	var myDiv = document.getElementById("filterDrowdownArea");
	myDiv.scrollTop = myDiv.scrollHeight;
}


function hideFilterBar() {
	document.getElementById("collapsingFilter").innerHTML = "SHOW FILTER OPTIONS <span class='caret'></span>";
	document.getElementById('collapsingFilter').setAttribute("onclick", "showFilterBar()");
}

function showFilterBar() {
	document.getElementById("collapsingFilter").innerHTML = "HIDE FILTER OPTIONS <span class='caret'></span>";
	document.getElementById('collapsingFilter').setAttribute("onclick", "hideFilterBar()");
}

