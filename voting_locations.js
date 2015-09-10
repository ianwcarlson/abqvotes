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
/*
$('div.dropdown.mega-dropdown button').on('click', function (event) {
	$(this).parent().toggleClass('close');
});


$('body').on('click', function (e) {
	if (!$('div.dropdown.mega-dropdown').is(e.target)
		&& $('div.dropdown.mega-dropdown').has(e.target).length === 0
		&& $('.open').has(e.target).length === 0
	) {
		$('div.dropdown.mega-dropdown').removeClass('open');
	}
});

*/


// ajax post to submit line count report
(function (){
	$(document).on('submit', 'form[data-remote]', function(e) {
		var form = $(this);
		var method = form.find('input[name="_method"]').val() || 'POST';
		var theId = form.find('input[id="liveReportButton"]').val();
		var url = form.prop('action');
		$.ajax({
			type: method,
			url: url,
			data: form.serialize(),
			success: function() {
				showThankModal();
			},
			error: function(){
				showThankModal();

			}
		});
		e.preventDefault();
		//$('#confirmModal').modal("hide");
	});
})();

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
map = L.map('map', {closePopupOnClick: true, zoomControl: false});
new L.Control.Zoom({position: 'topright'}).addTo(map);

console.log('next set up tile layer:');

L.tileLayer(
	//'http://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
	'http://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
	//'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
	{
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
Voter.maxDistance = 3;
Voter.requiredRange = 5; //min range in miles from a location to allow line reporting

// set global variable to adjust location to center of off-center map view when list is overlayed on left of map.
Voter.latlngAdjustment = 0;

// set up sort booleans for re-sorting when new items added or removed from all location array
Voter.isSortByType = 'distance';
Voter.isFilteredBy = 'early';

// set up current location boolean for use in reporting line and boolean for whether or not user is waiting to see report modal.
Voter.isCurrent = false;
Voter.isWaiting = false;
Voter.isWaitingSplash = false;
Voter.isSearchDone = false;

// boolean to see which settings to default to
Voter.isTodayEarlyVoting = true;


// boolean to determine whether or not list has already been built for radio button checking
Voter.isFirstBuild = true;


// set datasource -- override on URL with "data=UNM | CABQ"
Voter.datasource = "CABQ";
tmp = getQueryVariable("data");
if(tmp=="UNM" || tmp=="CABQ") {
	Voter.datasource = tmp;
}


// set election day indicator -- override on URL with "electionday=Y"
Voter.isElectionDay = false;
Voter.electionDate = new Date(2015,10-1,6);
Voter.earlyVotingDate = new Date();

var currdate = new Date();
tmp = getQueryVariable("electionday");
if(tmp=="y" || currdate.toDateString()==Voter.electionDate.toDateString()) {
	Voter.isElectionDay = true;
}

console.log(Voter);
console.log('next set up data:');

// pull in data from API, assign to global locations array
if(Voter.datasource=="UNM")
{
	//var url = "data/voting_locations.json";
	var url = "http://where2vote.unm.edu/locationinfo/";
	$.ajax({
		url     : url,
		dataType: 'json',
		cache: true,
		success : function(data) {
		var theThing = 1;
			console.log("UNM DATA: " + data);
			console.log(data);
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
}
else
{
	var url = "http://coagisweb.cabq.gov/arcgis/rest/services/public/Voting2015/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json";

	var result = '';
	$.ajax({
		type: 'GET', 
		url     : url,
		dataType: 'json',
	  	async: false,
		cache: true,
		success : function(text) {
			//result= JSON.parse(text);
			data=text.features;
			console.log(data);



			// get UNM data on election day
			if(Voter.isElectionDay==true)
			{
				var url2 = "http://where2vote.unm.edu/locationinfo/";
				$.ajax({
					url     : url2,
					dataType: 'json',
					async: false,
					cache: true,
					success : function(unmData) {
						// assign id to each object
						for (x in unmData) {
							var theId = "id" + unmData[x].UniqueId;
							Voter.unmData[theId] = unmData[x];
						}
					},
					error: function(){
						Voter.unmData = [];
					}

				});
			} else {
				Voter.unmData = [];
			}

			// get data from abqvotes db:
			// fixme: switch this to the right url and take out the hard coded stuff once db is set up
			var url2 = "http://where2vote.unm.edu/locationinfo/";
			$.ajax({
				url     : url2,
				dataType: 'json',
				async: false,
				cache: true,
				success : function(abqvData) {
					// fixme: take out hardcoded db values
					var theThing3 = 1;
					for (x in abqvData){
						// assign id to each object
						var theId = "id" + abqvData[x].UniqueId;
						Voter.abqVotes[theId] = abqvData[x];
						Voter.abqVotes[theId]["lineCount"] = theThing3 + 20;
						Voter.abqVotes[theId]["boothCount"] = theThing3 + 10;
						Voter.abqVotes[theId]["boothUpdatedAt"] = new Date();
						Voter.abqVotes[theId]["lineUpdatedAt"] = new Date();

						Voter.abqVotes[theId]["lineCountSpecial"] = theThing3 + 40;
						Voter.abqVotes[theId]["boothCountSpecial"] = theThing3 + 5;
						Voter.abqVotes[theId]["boothUpdatedAtSpecial"] = new Date();
						Voter.abqVotes[theId]["lineUpdatedAtSpecial"] = new Date();
						theThing3++;
					}
				},
				error: function(){
					Voter.abqVotes = [];
				}

			});

			var hardcodedWaitTimes = [100, 6, 68, 241, 100000, 200000];
			for(x in data) {
				var objectId = data[x].attributes.OBJECTID;
				var theId = "id" + objectId;
				Voter.locations[theId] = data[x].attributes;
				// repeat latitude and longitude data in array using variable names from UNM data, so all other functions work without extra logic for variable naming differences
				Voter.locations[theId]["lat"] = data[x].geometry.y;
				Voter.locations[theId]["lon"] = data[x].geometry.x;
				// add variables to array that are using in future functions
				Voter.locations[theId]["waitTime"] = hardcodedWaitTimes[Math.floor(Math.random()*hardcodedWaitTimes.length)]; //fixme: include this: assignWaitTime(theId);
				Voter.locations[theId]["waitTimeString"] = getTimeString(theId);

				Voter.locations[theId]["UniqueID"] = objectId;
				Voter.locations[theId]["MVCName"] = data[x].attributes.name;


				// fixme: preserved code in case my nesting attempt above fails

				//if(Voter.isElectionDay==true)
				//{
				//	var url2 = "http://where2vote.unm.edu/locationinfo/";
				//	$.ajax({
				//		url     : url2,
				//		dataType: 'json',
				//		cache: true,
				//		success : function(data) {
				//			for(x in data) {
				//				for (i in Voter.locations) {
				//					if(data[x].MVCName==Voter.locations[i].name)
				//					{
				//						if(data[x].count > 0) {
				//							Voter.locations[i]["unmCount"] = data[x].count;
				//						}
				//						Voter.locations[i]["unmLastUpdate"] = data[x].lastupdate;
				//						Voter.locations[i]["unmMinutesOld"] = data[x].minutesold;
				//					}
				//				}
				//			}
				//		}
				//	});
				//}
			}
		console.log(Voter.locations);
		setBaseLocation();
		checkForLocations(Voter.lat, Voter.lng);
		findCurrentLocation();
		}
	});
}



// function to calc wait time in minutes depending on accuracy of source or set to default large number
function assignWaitTime (theId){
	/*
	WHICH WINS
	special input wins
	unm input overwrites special user if it's unmBufferTime minutes or after the special user's input
	normal user overwrites special user if it's normalUserBufferTime minutes or after either the special user's input or the unm input

	WHEN EXPIRES
	if oldest (not most recent) used line count is older than the estimated time by 1.5, then it goes to unknown
	booth count we accept whatever the last input was period.
	*/
	// logic to see if after hours



	//if (earlyVoteStart <= currentDate <= earlyVoteEnd){
	//	Voter.isTodayEarlyVoting = true;
	//} else {
	//	Voter.isTodayEarlyVoting = false;
	//}

	// set calculation variables and defaults
	var estimateMultiple = 1.5;
	var avgPersonTime = 10;

	// these represent how old an approved or special user's input has to be to be considered invalid relative to newer inputs
	var unmBufferTime = 1;
	var normalUserBufferTime = 1;
	var validLineCount;
	var validLastUpdate;
	var validBoothCount = 10; // set default to guess of average amount across all locations
	var validWaitTime;

	// get line count
	var unmDate = Voter.unmData[theId].lastupdate;
	var specialDate = Voter.abqVotes[theId]["lineUpdatedAtSpecial"];
	var normalDate = Voter.abqVotes[theId]["lineUpdatedAt"];

	// variables should be in minutes, so if special is even older than the others by 1 minute it still wins
	if ((unmDate - specialDate < unmBufferTime) && (normalDate -  specialDate < normalUserBufferTime)) {
		validLineCount = Voter.abqVotes[theId]["lineCountSpecial"];
		validLastUpdate = specialDate;

	} else if (normalDate -  unmDate < normalUserBufferTime){
		validLineCount = Voter.unmData[theId].count;
		validLastUpdate = unmDate;

	} else {
		validLineCount = Voter.abqVotes[theId]["lineCount"];
		validLastUpdate = normalDate;
	}

	// get booth count
	var specialBoothDate = Voter.abqVotes[theId]["boothUpdatedAtSpecial"];
	var normalBoothDate = Voter.abqVotes[theId]["boothUpdatedAt"];

	if (normalBoothDate - specialBoothDate < normalUserBufferTime){
		validBoothCount = Voter.abqVotes[theId]["boothCountSpecial"];
	} else {
		validBoothCount = Voter.abqVotes[theId]["boothCount"];
	}


	return (1+ validLineCount) * avgPersonTime/validBoothCount;
}

function isValidVotingTime(){
	var timeValid = true;
	var currentTime = new Date(); // hours/minutes UTC
	var currentDay = 	new Date();	// day of week local
	var currentDate = new Date(); // actual date/year
	var earlyVoteStart = Voter.locations[theId].earlyVotingStartDateStr;
	var earlyVoteEnd = Voter.locations[theId].earlyVotingEndDateStr;
	var electionDay = Voter.electionDay;
	var opensAt = 		Voter.locations[theId].earlyVotingDayStartTimeUTC; // convert to hours/minutes UTC
	var closesAt = 	Voter.locations[theId].earlyVotingEndTimeUTC; // convert to hours/minutes UTC

	if (currentTime < opensAt || currentTime > closesAt || currentDay === "Sat" ||
		currentDay === "Sun" || currentDate < earlyVoteStart || 
		((earlyVoteEnd < currentDate) && (currentDate < electionDay)) ||
		currentDate > electionDay){
			timeValid = false;	
	}	

		// logic to see if still valid
	// if ((currentDate - validLastUpdate) < (estimateMultiple * validWaitTime)){
	// 	return validWaitTime;
	// }

		// this number of default hours indicates an invalid or "unknown" wait time.  Set to a high number so that it goes to the bottom on any sort, will display as "00:??"
	return timeValid;
}

function getVotingIconStatus(earlyVotingStart, currentDate, earlyVotingEnd){
	// take opportunity to set global boolean for whether current day is within early Voting Period
	Voter.isTodayEarlyVoting = ((earlyVoteStart <= currentDate) && (currentDate <= earlyVoteEnd));
	if (Voter.isTodayEarlyVoting){
		// make sure both early checkboxes are checked
		document.getElementById("earlyBoxLive").checked = true;
		document.getElementById("earlyBoxMobile").checked = true;
	}

	if ((earlyVoteEnd < currentDate) && (currentDate <= electionDay)){
		// make sure both all checkboxes are checked
		document.getElementById("allBoxLive").checked = true;
		document.getElementById("allBoxMobile").checked = true;

		// and hide mobile filter button and list filter button, reveal brigade logo in its place
		document.getElementById("filterButtons").style.display = "none";
		document.getElementById("headerFilterButton").style.display = "none";
		document.getElementById("headerLogo").style.display = "inline";


	}	
}

function getTimeString(theId){
	// build time string
	theLocation = Voter.locations[theId];
	if(theLocation.waitTime === 100000) {
		// indicates open but unknown wait time
		//timeString = "00:??";
		timeString = 	"<span class = 'glyphicon glyphicon-time' style = 'font-size: 14px;     margin-left: 2px;'></span>" +
							"<span style = 'font-size: 15px;'>?</span>";
	} else if(theLocation.waitTime === 200000) {
		// indicates closed
		//timeString = "<span class = 'glyphicon glyphicon-minus-sign'></span>";
		timeString = "<span class = 'glyphicon glyphicon-ban-circle' style = 'font-size: 16px;     margin-left: 2px;'></span>";
		//timeString = "<span class = 'glyphicon glyphicon-off'></span>";
	} else if(theLocation.waitTime > 240) {
		// indicates open but unknown wait time
		//timeString = "00:??";
		timeString = 	"<span class = 'glyphicon glyphicon-time' style = 'font-size: 14px;     margin-left: 2px;'></span>" +
							"<span style = 'font-size: 15px;'>?</span>";
	} else if(theLocation.waitTime < 10) {
		timeString = "00:0" + theLocation.waitTime;
	} else {
		var hours = Math.floor(theLocation.waitTime / 60);
		var minutes = Math.round( ((theLocation.waitTime/60) - hours) *60);
		if (minutes < 10) {
			timeString = hours + ":0" + minutes;
		} else {
			timeString = hours + ":" + minutes;
		}
	}

	return timeString;
}


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
	map.setView(adjustedLatLong, 11);

	//var currentLocationButton;
	//currentLocationButton = "<br/><button class='btn btn-danger btn-xs' id = 'homePopupButton' onClick='tryAgain()'>Try Current Location Again</button></div>";

	// build variable for popup display
	var locationDetails2 =	"<div style = 'text-align: center'><strong>We couldn't find you.  Try turning on locations services for your browser and refresh page.</strong>";
		//+ currentLocationButton;

	// build html to use in icon
	var homeMarker = "ABQ" +
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
		.bindPopup(Voter.addressPopup);
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

	changeLocations(true);

	// set current location boolean to true for use in reporting the line
	Voter.isCurrent = true;
	Voter.isSearchDone = true;

	if (Voter.isWaiting){
		checkReportLocation();
	}

	if (Voter.isWaitingSplash){
		$('#splashModal').modal("hide");
	}





	/*
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


	 map.setView([Voter.currentLat, Voter.currentLng + Voter.latlngAdjustment], 11).openPopup(Voter.currentPopup);

	 // fixme is this the right function to recalc distance etc.
	 //checkForLocations(Voter.currentLat, Voter.currentLng);
	 changeLocations(true);

	 // fixme doesn't work set up zoom events
	 resetZoomEvents();
	 */
}


function onLocationError(e) {
	console.log ('onLocationError fires now');
	Voter.isSearchDone = true;
	if (Voter.isWaiting){
		checkReportLocation();
	}

	if (Voter.isWaitingSplash){
		$('#splashModal').modal("hide");
		// notify user
		alert(e.message + " Because of the this error, we were not able to get your current location. To use the sorting and links to directions in this app, we recommend making sure your locations services are on for your browser and refreshing the page.");
	}

	Voter.maxDistance = 10;
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
		//rebuildHomeIcon(true);
		rebuildCurrentIcon(true);
		setToCurrentLocation();

	} else {
		rebuildHomeIcon(false);
		rebuildCurrentIcon(false);
		setToHomeAddress();
	}
	ga('send', 'event', 'button', 'click', 'changeLocations');
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
	var locationDetails2 =	"<div style = 'text-align: center'><strong>Location not enabled <br/>on this device.  " +
		"</strong>"+ currentLocationButton;


	// build html to use in icon
	var homeMarker = "ABQ" +
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
		.bindPopup(Voter.addressPopup);
}


function rebuildCurrentIcon(isToCurrent){
	console.log ('rebuildCurrentIcon fires now');

	if(isToCurrent){
		var theBool = false;
		var theInnerHtml = "Switch your location to downtown ABQ.";

	} else {
		var theBool = true;
		var theInnerHtml = "Switch to this location as base.";
	}

	var locationDetails ="<div style = 'text-align: center'><strong>We think you are within <br/> " + Voter.currentRadius +
		" meters of this point. </strong><br/><button class='btn btn-warning btn-xs' id = 'currentPopupButton' onClick='changeLocations(" + theBool + ")'>" + theInnerHtml + "</button></div>";

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
		.bindPopup(Voter.currentPopup);

	L.circle(Voter.currentLocation, Voter.currentRadius).addTo(Voter.locationsLayer);
}


// enables bouncing back and forth between locations
function setToCurrentLocation() {
	console.log ('setToCurrentLocation fires now');

	map.setView([Voter.currentLat, Voter.currentLng  + Voter.latlngAdjustment], 11);
		//openPopup(Voter.currentPopup);
	checkForLocations(Voter.currentLat, Voter.currentLng);

	// set up zoom events
	resetZoomEvents();
}

// enables bouncing back and forth between locations
function setToHomeAddress() {
	console.log ('setToHomeAddress fires now');

	map.setView([Voter.lat, Voter.lng + Voter.latlngAdjustment], 11);
		//.openPopup(Voter.addressPopup);

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
		console.log('rebuilding ALL and ZOOM lists after location change');

		reCalcDistance(lat, long); // for all list
		resetZoomList(); // re-curate zoom list from new All List to update distances.
		rebuildAll();


	} else {
		// set up for first time:
		console.log ('set up for first time: fires now inside Check For locations');

		// build all array and zoomList array from scratch using all locations from DB
		buildAllArrayWithDistance(lat, long);

		sortArray('default');

		// set up initial page
		buildIconsAndLists("insertMapListHere");


		// set combined template into live div and reset template
		buildCombinedView();

		Voter.isFirstBuild = false;


		// show splash modal
		$('#splashModal').modal('show');

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
		if(checkMaxWait(theLocationId) && checkMaxDistance(theLocationId) && checkEarlyVoting(theLocationId) && checkEarly(theLocationId) && checkAbsentee(theLocationId)) {
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
		// rebuild list for given array
		for(count = 0; count < array.length; count++) {
			theLocationId = "id" + array[count].UniqueID;
			if(checkMaxWait(theLocationId) && checkMaxDistance(theLocationId) && checkEarlyVoting(theLocationId) && checkEarly(theLocationId) && checkAbsentee(theLocationId)) {
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

	// set variables needed for icons
	var theLocation = Voter.locations[theId];
	var timeString;
	var iconType;
	var iconClass;
	var iconId;
	var iconSize;
	var theLayer;
	var waitTimeMarker;
	var locationPoint;
	var anchor;
	var popupAnchor;

	/* fixme: may activate and build on this for hiding/showing icons if performance becomes an issue
	 var classType1 ="";
	 var classType2 ="";
	 var classType3 ="";
	 if (Voter.locations[theId].isAbsenteeVoting === "y"){
	 classType1 = "absenteeLocation";
	 }

	 if (Voter.locations[theId].isEarlyVoting === "y"){
	 classType2 = "earlyLocation";
	 }

	 if (Voter.locations[theId].isAbsenteeVoting !== "y" && Voter.locations[theId].isEarlyVoting !== "y"){
	 classType3 = "allLocations";
	 }

	 iconClass = classType1 + classType2 + classType3 + 'location-icon heatmap-' + Voter.heat[theId];
	 */


	// set generic variables
	iconId = 'locationIcon-' + theId;
	theLayer = Voter.allIconsLayer;
	// build latlong point
	locationPoint = turf.point([theLocation.lon, theLocation.lat]);
	// build point at top of the circle to use for the delivery area marker and icon
	anchor = turf.destination(locationPoint, 0, 0, 'miles');


	// set icon Class and build icons depending on if it's early voting today and the location is eligible for early voting
	if(Voter.isTodayEarlyVoting && Voter.locations[theId].isEarlyVoting === "n") {
		iconClass = 'grey-icon';
		//iconClass = 'location-icon heatmap-' + Voter.heat[theId];

		timeString = "";

		// build html to use in icon
		waitTimeMarker = 	timeString;
								//"<div class='leaflet-popup-tip-container' style='margin-top: -0.6px'>" +
								//"<div class='leaflet-popup-tip location-pointer'></div></div> ";
		popupAnchor = [-5, -5];
		iconSize = [12, 12];

		buildIconType(theId, iconId, theLayer, anchor, iconClass, waitTimeMarker, iconSize, popupAnchor);

	} else {

		if (theLocation.waitTime === 200000) {
			iconClass = 'location-icon grey-icon-active';
		} else {
			iconClass = 'location-icon heatmap-' + Voter.heat[theId];
		}
		timeString = Voter.locations[theId].waitTimeString;


		// build html to use in icon
		waitTimeMarker = 	timeString +
								"<div class='leaflet-popup-tip-container' style='margin-top: -0.6px'>" +
								"<div class='leaflet-popup-tip location-pointer'></div></div> ";
		popupAnchor = [10, -35];
		iconSize = [50, 25];

		buildIconType(theId, iconId, theLayer, anchor, iconClass, waitTimeMarker, iconSize, popupAnchor);
	}
}

function buildIconType(theId, iconId, theLayer, anchor, iconClass, waitTimeMarker, iconSize, popupAnchor) {

	// build custom icon
	locationIcon = L.extendedDivIcon({
		iconSize   	: iconSize,
		className  	: iconClass,
		iconAnchor 	: anchor,
		popupAnchor	: popupAnchor,
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
	var timeString = Voter.locations[theId].waitTimeString;

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
	document.getElementById("mapListLive").innerHTML = "";
	buildIconsAndLists("mapListLive");
}

function tearDown(){
	console.log ('tearDown fires now');
	// remove layers
	map.removeLayer(Voter.allIconsLayer);

	// reset layers
	Voter.allIconsLayer = L.layerGroup().addTo(map);
}

function rebuildList(){
	console.log('rebuildList fires now');
	document.getElementById("mapListLive").innerHTML = "";
	build("mapListLive", "isZoomList");
}



///////////////////////////////////////////////////////////////////////////////////
/*
 * All filter related functions
 *
 *
 *
 */

// sort list by waitTime or by distance
function sortArray(isWhatType){
	console.log("sortArray fires now");

	var theArray = Voter.zoomList;

	//check type of sort
	if(isWhatType === 'default') {
		console.log("sortArray DEFAULT fires now");
		theArray.sort(function(a, b) {
			return a.Distance - b.Distance
		});

		// grab nearest location into global for reporting of line length
		Voter.nearest = Voter.zoomList[0];
		console.log('nearest location is ' + Voter.nearest);

	} else if(isWhatType === 'time') {
		console.log("sortArray TIME fires now");
		ga('send', 'event', 'button', 'click', 'sortByTime');

		document.getElementById('byLowestLive').style.backgroundColor = "#A54A4A";
		document.getElementById('byLowestLive').style.color = "wheat";
		document.getElementById('lowestCaretLive').className = "caret";

		document.getElementById('byNearestLive').style.backgroundColor = "#E4C9C9 ";
		document.getElementById('byNearestLive').style.color = "#999999";
		document.getElementById('nearestCaretLive').className = "right-caret";

		document.getElementById('byNameLive').style.backgroundColor = "#E4C9C9 ";
		document.getElementById('byNameLive').style.color = "#999999";
		document.getElementById('nameCaretLive').className = "right-caret";

		theArray.sort(function(a, b) {
			return a.waitTime - b.waitTime
		});
		console.log('nearest location is ' + Voter.nearest);

	} else if ((isWhatType === 'distance')) {
		console.log("sortArray DISTANCE fires now");
		ga('send', 'event', 'button', 'click', 'sortByDistance');

		document.getElementById('byNearestLive').style.backgroundColor = "#A54A4A";
		document.getElementById('byNearestLive').style.color = "wheat";
		document.getElementById('nearestCaretLive').className = "caret";


		document.getElementById('byLowestLive').style.backgroundColor = "#E4C9C9 ";
		document.getElementById('byLowestLive').style.color = "#999999";
		document.getElementById('lowestCaretLive').className = "right-caret";

		document.getElementById('byNameLive').style.backgroundColor = "#E4C9C9 ";
		document.getElementById('byNameLive').style.color = "#999999";
		document.getElementById('nameCaretLive').className = "right-caret";


		theArray.sort(function(a, b) {
			return a.Distance - b.Distance
		})
	} else if ((isWhatType === 'name')) {
		console.log("sortArray NAME fires now");
		ga('send', 'event', 'button', 'click', 'sortByName');


		document.getElementById('byNameLive').style.backgroundColor = "#A54A4A";
		document.getElementById('byNameLive').style.color = "wheat";
		document.getElementById('nameCaretLive').className = "caret";

		document.getElementById('byLowestLive').style.backgroundColor = "#E4C9C9 ";
		document.getElementById('byLowestLive').style.color = "#999999";
		document.getElementById('lowestCaretLive').className = "right-caret";

		document.getElementById('byNearestLive').style.backgroundColor = "#E4C9C9 ";
		document.getElementById('byNearestLive').style.color = "#999999";
		document.getElementById('nearestCaretLive').className = "right-caret";


		theArray.sort(function(a, b) {
			if(a.MVCName < b.MVCName) return -1;
			if(a.MVCName > b.MVCName) return 1;
			return 0;
		})
	}
	//console.log ('zoomList AFTER SORT: ');
	//console.log (Voter.zoomList);

	//reset the sort boolean to new value
	Voter.isSortByType = isWhatType;
}


// TOGGLING ALL filters

function setFilterRadios(type){
	console.log('setFilterRadios fires now with type:' + type);

	// make sure both checkboxes are checked
	document.getElementById(type + "BoxLive").checked = true;
	document.getElementById(type + "BoxMobile").checked = true;

	// move map to nearby location to absentee locations
	if (type === "absentee"){
		map.setView([Voter.lat, Voter.lng + Voter.latlngAdjustment], 12);
	}

	// rebuild all.
	rebuildAll();

	/* may activate and build on this if performance becomes an issue
	if (type === "all"){
		// show all icons by unhiding any that are hidden
		showIconsByType(type);
	}else if (type === "early"){
		// show only early locations by hiding any with class "allLocations" and rebuilding list
		showIconsByType(type);
		hideIconsByType("all");

	}else if (type === "absentee"){
		// show only absentee locations by hiding any with class "allLocations" or class "absenteeLocations" and rebuilding List
		showIconsByType(type);
		hideIconsByType("all");
		hideIconsByType("early");

	}*/

}


// Show only early voting
function showIconsByType(type) {
	console.log('hideIconsByType fires now');

	// hide all non-early location icons on map
	var icons = document.getElementsByClassName(type + "Locations");
	var index;

	if(icons[0].style.visibility === "visible"){
		for(index = 0; index < icons.length; index++) {
			icons[index].style.visibility = "visible";
		}
	}

	// close last opened popup
	map.closePopup();
}

function hideIconsByType(type) {
	console.log('hideIconsByType fires now');

	// hide all non-early location icons on map
	var icons = document.getElementsByClassName(type + "Locations");
	var index;

	if(icons[0].style.visibility === "visible"){
		for(index = 0; index < icons.length; index++) {
			icons[index].style.visibility = "hidden";
		}
	}

	// close last opened popup
	map.closePopup();
}




// Max Wait FILTER
// change max wait, apply if checkbox is checked
function changeMaxWait(dollars) {
	console.log ('changeMaxWait fires now');

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
	Voter.maxWait = 10000;


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




// Max Distance FILTER
// change max distance, apply if checkbox is checked
function changeMaxDistance(miles) {
	console.log ('changeMaxDistance fires now');

	// ensure input is number format and reset maxDistance to value of input
	Voter.maxDistance = Number(miles);

	// ensure both
	document.getElementById("theMaxDistance").value = Voter.maxDistance;
	document.getElementById("theMobileMaxDistance").value = Voter.maxDistance;


	if(document.getElementById("isMaxDistance").checked){
		rebuildAll();
	}

}

// toggle maxDistance on
function selectMaxDistance (){
	console.log ('selectMaxDistance fires now');

	// switch onclick function for max wait checkboxes
	document.getElementById("isMaxDistance").setAttribute( "onclick", "unselectMaxDistance()" );
	document.getElementById("isMobileMaxDistance").setAttribute( "onclick", "unselectMaxDistance()" );

	// make sure both checkboxes are "checked"
	document.getElementById("isMaxDistance").checked = true;
	document.getElementById("isMobileMaxDistance").checked = true;

	rebuildAll();

}

// toggle maxDistance off
function unselectMaxDistance() {
	console.log ('unselectMaxDistance fires now');

	// assign current max wait to temp value
	var tempMaxDistance = Voter.maxDistance;

	// set maxDistance to 0 to show all locations
	Voter.maxDistance = 10000;


	// switch onclick function for max wait checkbox
	document.getElementById("isMaxDistance").setAttribute("onclick", "selectMaxDistance()");
	document.getElementById("isMobileMaxDistance").setAttribute("onclick", "selectMaxDistance()");

	// make sure both checkboxes are not "checked"
	document.getElementById("isMaxDistance").checked = false;
	document.getElementById("isMobileMaxDistance").checked = false;

	// rebuild all layers
	rebuildAll();


	// reset maxDistance to previous number
	Voter.maxDistance = tempMaxDistance;
}


// Early voting FILTER
// change early voting date, apply if checkbox is checked
function changeEarlyVotingDate(earlyDate) {
	console.log ('changeEarlyVotingDate fires now');

	// reset earlyVotingDate to value of input
	Voter.earlyVotingDate = earlyDate;

	// ensure both
	document.getElementById("isEarlyVotingDatepicker").value = Voter.earlyVotingDate;
	document.getElementById("isEarlyVotingMobileDatepicker").value = Voter.earlyVotingDate;


	if(document.getElementById("isEarlyVoting").checked){
		rebuildAll();
	}

}

// toggle earlyVoting on
function selectEarlyVoting (){
	console.log ('selectEarlyVoting fires now');

	// switch onclick function for max wait checkboxes
	document.getElementById("isEarlyVoting").setAttribute( "onclick", "unselectEarlyVoting()" );
	document.getElementById("isEarlyVotingMobile").setAttribute( "onclick", "unselectEarlyVoting()" );

	// make sure both checkboxes are "checked"
	document.getElementById("isEarlyVoting").checked = true;
	document.getElementById("isEarlyVotingMobile").checked = true;

	rebuildAll();

}

// toggle earlyVoting off
function unselectEarlyVoting() {
	console.log ('unselectEarlyVoting fires now');

	// switch onclick function for max wait checkbox
	document.getElementById("isEarlyVoting").setAttribute("onclick", "selectEarlyVoting()");
	document.getElementById("isEarlyVotingMobile").setAttribute("onclick", "selectEarlyVoting()");

	// make sure both checkboxes are not "checked"
	document.getElementById("isEarlyVoting").checked = false;
	document.getElementById("isEarlyVotingMobile").checked = false;

	// rebuild all layers
	rebuildAll();

}


// modal to submit wait time form.
function confirmReport(){
	// ensure it opens at top of modal.
	$("#confirmModal").scrollTop(0);
	// edit report modal stub
	document.getElementById('confirmedLocation').innerHTML = Voter.nearest.MVCName;
	document.getElementById('modalReportButton').value = Voter.nearest.OBJECTID;
	document.getElementById('modalReportButton').setAttribute('id', 'liveReportButton');

	// set into modal stub
	document.getElementById('modalBody').innerHTML = document.getElementById('confirmReportModal').innerHTML;

	// reset template
	document.getElementById('liveReportButton').setAttribute('id', 'modalReportButton');
}

// modal to verify location
function checkReportLocation(){
	$('#splashModal').modal("hide");

	if (Voter.isSearchDone === false){
		document.getElementById('modalBody').innerHTML = document.getElementById('stillWaitingModalReport').innerHTML;
		Voter.isWaiting = true;

	} else {

		// first, check to see if we have their current location at all
		if(Voter.isCurrent === false) {
			showReportError();
		}

		// second, check to see if they are within the required range of the location
		else if(Voter.nearest["Distance"] < Voter.requiredRange) {
			// edit report modal stub
			document.getElementById('reportItems').innerHTML = Voter.nearest.MVCName;

			// set into modal stub
			document.getElementById('modalBody').innerHTML = document.getElementById('confirmLocationModal').innerHTML;
		} else {
			notNearEnoughModal();
		}
	}
}

// modal to display location error modal for reporting.
function showReportError(){
	// ensure it opens at top of modal.
	$("#confirmModal").scrollTop(0);

	// set into modal stub
	document.getElementById('modalBody').innerHTML = document.getElementById('reportModalError').innerHTML;
}

function notNearEnoughModal(){
	// ensure it opens at top of modal.
	$("#confirmModal").scrollTop(0);

	// set into modal stub
	document.getElementById('modalBody').innerHTML = document.getElementById('notNearEnoughModal').innerHTML;
}

// modal to display report thank you, links, and confirmation
function showThankModal(){
	// ensure it opens at top of modal.
	$("#confirmModal").scrollTop(0);

	// set into modal stub
	document.getElementById('modalBody').innerHTML = document.getElementById('thankModal').innerHTML;
}

// modal to close report modal
function closeModal(){
	$('#confirmModal').modal("hide");

	// set into modal stub
	//document.getElementById('modalBody').innerHTML = document.getElementById('reportModalError').innerHTML;
}

// function to close splash to find location
function closeSplash(){
	if (Voter.isSearchDone === false){
		Voter.isWaitingSplash = true;
		document.getElementById('splashModalBody').innerHTML = document.getElementById('stillWaitingModalSplash').innerHTML;
	} else {
		$('#splashModal').modal("hide");
		$("body").scrollTop(0);
	}
}

function showLightReading(){
	console.log('showLightReading fired');
	document.getElementById('lightReading').style.display = "block";
}
// modal to close splash and show report modal
//function closeSplashOpenReport(){
//	if (Voter.isSearchDone){
//		document.getElementById('modalBody').innerHTML = document.getElementById('thankModal').innerHTML;
//
//	} else {
//		Voter.isWaiting = true;
//		//alert ("One second - still looking for your location...");
//	}
//	$('#splashModal').modal("hide");
//	checkReportLocation();
//
//
//}

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

	if(Voter.datasource=="UNM")
	{
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
		document.getElementById(listName + "electionDayTime").		innerHTML = Voter.locations[theId].ElectionDayTime;
		document.getElementById(listName + "openDate").				innerHTML = Voter.locations[theId].OpenDate;


	}
	else
	{
		// set URL prefix so maps open in the native app if on an iOS or Android device
		var userAgent = navigator.userAgent || navigator.vendor || window.opera;
		var urlprefix = 'https';
		if( userAgent.match( /iPad/i ) || userAgent.match( /iPhone/i ) || userAgent.match( /iPod/i ) )
			urlprefix = 'comgooglemapsurl';
		else if( userAgent.match( /Android/i ) )
			urlprefix = 'maps';
		
  		// get google maps link to find directions
		var addressLink = urlprefix + "://www.google.com/maps/dir/Current+Location/" + Voter.locations[theId].address.replace(/ /g, '+');
	
		// calculate number of hours since last updated wait estimate
		//var hoursSince = (Voter.locations[theId].minutesold/60).toFixed(2).toString();
	
		// inject them into the appropriate html stubs
		document.getElementById(listName + "addressLink").			setAttribute('href', addressLink);
		document.getElementById(listName + "address").				innerHTML = Voter.locations[theId].address;
		//document.getElementById(listName + "lastUpdate").			innerHTML = hoursSince;
		document.getElementById(listName + "name").					innerHTML = Voter.locations[theId].name;
		document.getElementById(listName + "distance").				innerHTML = Voter.locations[theId].Distance;
	
		var votingType = "";
		var dayCount = 0;
		if(Voter.locations[theId].isElectionDay=="y")
			votingType = "Election Day";
		if(Voter.locations[theId].isEarlyVoting=="y")
		{
			votingType = votingType + ", Early Voting";
			votingDays = "<br>Days: ";
			if(Voter.locations[theId].isEarlyVotingMonday=="y"){
				votingDays = votingDays + "M ";
				dayCount++;
			}
			if(Voter.locations[theId].isEarlyVotingTuesday=="y") {
				votingDays = votingDays + "Tu ";
				dayCount++;
			}
			if(Voter.locations[theId].isEarlyVotingWednesday=="y") {
				votingDays = votingDays + "W ";
				dayCount++;
			}
			if(Voter.locations[theId].isEarlyVotingThursday=="y"){
				votingDays = votingDays + "Th ";
				dayCount++;
			}
			if(Voter.locations[theId].isEarlyVotingFriday=="y"){
				votingDays = votingDays + "F";
				dayCount++;
			}

			if (dayCount === 5) {
				votingDays = "M-F";
			}
			document.getElementById(listName + "openDate").			innerHTML = Voter.locations[theId].EarlyVotingStartDateStr + " to " + Voter.locations[theId].EarlyVotingEndDateStr + votingDays;
		}
		if(Voter.locations[theId].isAbsenteeVoting=="y")
			votingType = votingType + ", Absentee Dropoff";
		document.getElementById(listName + "voting-type").			innerHTML = votingType;
		
		document.getElementById(listName + "electionDayTime").		innerHTML = Voter.locations[theId].electionDayStartTimeStr + " to " + Voter.locations[theId].electionDayEndTimeStr;
	}
}

// check if meets max wait time criteria set by user
function checkMaxWait(theId){
	// check if max wait checkbox is checked "on" and if so, check if meets the criteria
	if (!document.getElementById('isMaxWait').checked
		|| Voter.locations[theId].waitTime <= Voter.maxWait) {
		return true;
	}
}

// check if meets max distance criteria set by user
function checkMaxDistance(theId){
	// check if max wait checkbox is checked "on" and if so, check if meets the criteria
	if (!document.getElementById('isMaxDistance').checked
		|| Voter.locations[theId].Distance <= Voter.maxDistance) {
		return true;
	}
}

// check if it's early voting
function checkEarly(theId){
	var element;
	if (Voter.isFirstBuild){
		element = "earlyBox";
	} else {
		element = "earlyBoxLive"
	}
	// check if max wait checkbox is checked "on" and if so, check if meets the criteria
	if (!document.getElementById(element).checked
		|| Voter.locations[theId].isEarlyVoting == "y") {
		return true;
	}
}

// check if it's absentee voting
function checkAbsentee(theId){
	var element;
	if (Voter.isFirstBuild){
		element = "absenteeBox";
	} else {
		element = "absenteeBoxLive"
	}

	// check if max wait checkbox is checked "on" and if so, check if meets the criteria
	if (!document.getElementById(element).checked
		|| Voter.locations[theId].isAbsenteeVoting == "y") {
		return true;
	}
}



// check if meets early voting criteria set by user
function checkEarlyVoting(theId){
	var earlyCheck = true;
	// check if early voting is open on the user specified date, based on day of week and start/end dates
	if(Voter.locations[theId].isEarlyVoting != undefined)
	{
		// create date variables for early voting start and end
		var earlyStart = new Date(Voter.locations[theId].earlyVotingStartDate);
		var earlyEnd = new Date(Voter.locations[theId].earlyVotingEndDate);
		
		// check if early voting is allowed at this location
		if(Voter.locations[theId].isEarlyVoting != 'y')
			earlyCheck = false;
		// check if date is before early voting start date
		else if(new Date(Voter.earlyVotingDate) < earlyStart)	
			earlyCheck = false;
		// check if date is past early voting end date
		else if(new Date(Voter.earlyVotingDate) > earlyEnd)	
			earlyCheck = false;
		else 
		{
			var earlyDay = new Date(Voter.earlyVotingDate).getDay();
			// check if location is open on that day of the week
			if(earlyDay == 1 && Voter.locations[theId].isEarlyVotingMonday != 'y')	
				earlyCheck = false;
			else if(earlyDay == 2 && Voter.locations[theId].isEarlyVotingTuesday != 'y')	
				earlyCheck = false;
			else if(earlyDay == 3 && Voter.locations[theId].isEarlyVotingWednesday != 'y')	
				earlyCheck = false;
			else if(earlyDay == 4 && Voter.locations[theId].isEarlyVotingThursday != 'y')	
				earlyCheck = false;
			else if(earlyDay == 5 && Voter.locations[theId].isEarlyVotingFriday != 'y')	
				earlyCheck = false;
			else if(earlyDay == 6 || earlyDay == 0)	
				earlyCheck = false;
		}
	}
	// check if early voting checkbox is checked "on" and if so, check if meets the criteria
	if (!document.getElementById('isEarlyVoting').checked
		|| earlyCheck==true) {
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

		// set current map div to 100% width and reload tiles
		document.getElementById("mapGoesHere").style.width = "100%";
		map.invalidateSize();

		console.log('Map on works');

	} else if(message === "map-off") {
		console.log('Starting map-off');
		//...then map only box was turned off.  First reset the map checkbox value.
		document.getElementById("mapViewId").value = "map-on";

		// Unhide listGoesHere div....
		document.getElementById("listGoesHere").style.display = "inline";

		// remove 100% width from inline and reload tiles
		if (document.getElementById("mapGoesHere").style.removeProperty) {
			document.getElementById("mapGoesHere").style.removeProperty('width');
		} else {
			document.getElementById("mapGoesHere").style.removeAttribute('width');
		}
		map.invalidateSize();

		console.log('Map-off worked');
	}
}

Voter.listCount = 0;

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
	document.getElementById("byName").							setAttribute('id', 'byNameLive');

	document.getElementById("lowestCaret").					setAttribute('id', 'lowestCaretLive');
	document.getElementById("nearestCaret").					setAttribute('id', 'nearestCaretLive');
	document.getElementById("nameCaret").						setAttribute('id', 'nameCaretLive');

	// add new ids to scrollable list for hiding
	document.getElementById("listRow").							setAttribute('id', 'liveListRow');

	// set filter in list id's
	document.getElementById("allBox").							setAttribute('id', 'allBoxLive');
	document.getElementById("earlyBox").						setAttribute('id', 'earlyBoxLive');
	document.getElementById("absenteeBox").					setAttribute('id', 'absenteeBoxLive');

	// assign class to scrollabeList wrapper, then change id -> used to be able to make it vertically responsive
	document.getElementById("scrollableList").				className = "listWrapperLive";
	document.getElementById("scrollableList").				setAttribute('id', 'liveScrollableList');
	document.getElementById("scrollableList2").				setAttribute('id', 'liveScrollableList2');
	document.getElementById("subtractFromList1").				setAttribute('id', 'subtractFromList1Live');
	//document.getElementById("subtractFromList2").				setAttribute('id', 'subtractFromList2Live');


	// set list live by putting it into the list div and identifying it with new value string
	//console.log("innerHTML being added");
	//console.log(document.getElementById("buildListInMap").innerHTML);
	Voter.listCount ++;
	console.log('LIST COUNT INFO');
	console.log(Voter.listCount);
	document.getElementById("listGoesHere").					innerHTML = document.getElementById("buildListInMap").innerHTML;

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
	document.getElementById("byNameLive").						setAttribute('id', 'byName');


	document.getElementById("lowestCaretLive").						setAttribute('id', 'lowestCaret');
	document.getElementById("nearestCaretLive").						setAttribute('id', 'nearestCaret');
	document.getElementById("nameCaretLive").							setAttribute('id', 'nameCaret');


	// reset scrollable list
	document.getElementById("liveScrollableList").			setAttribute('id', 'scrollableList');
	document.getElementById("liveScrollableList2").			setAttribute('id', 'scrollableList2');
	document.getElementById("subtractFromList1Live").				setAttribute('id', 'subtractFromList1');
	//document.getElementById("subtractFromList2Live").				setAttribute('id', 'subtractFromList2');

	document.getElementById("liveListRow").							setAttribute('id', 'listRow');

	// reset list filter id's
	document.getElementById("allBoxLive").							setAttribute('id', 'allBox');
	document.getElementById("earlyBoxLive").						setAttribute('id', 'earlyBox');
	document.getElementById("absenteeBoxLive").					setAttribute('id', 'absenteeBox');

	// UNassign class to template scrollabeList wrapper template so it can be reused
	document.getElementById("scrollableList").className = "";
}



function showMobileMap(){
	console.log ('showMobileMap fires now');

	console.log('mobileMap fired');
	console.log(document.getElementById('scrollableList'));
	document.getElementById('liveScrollableList2').style.display = "none";
	//document.getElementById('liveListRow').style.height = "0%";
	//document.getElementById('liveZoomLink').style.display = "none";
	document.getElementById('mapToggler').style.display = "none";
	document.getElementById('listToggler').style.display = "inline";
	document.getElementById('listDiv').style.height = "0";

}


function hideMobileMap(){
	console.log ('hideMobileMap fires now');

	document.getElementById('liveScrollableList2').style.display = "block";
	//document.getElementById('liveListRow').style.display = "block";
	//document.getElementById('liveZoomLink').style.display = "block";
	document.getElementById('mapToggler').style.display = "inline";
	document.getElementById('listToggler').style.display = "none";
	document.getElementById('listDiv').style.height = "100%";

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

	sortArray(Voter.isSortByType);
	rebuildList();

}



///////////////////////////////////////////////////////////////////////////////////
/*
 * set the current date in the date fields and enable date picker
 *		**commented out for now since datepicker is deprecated**
 *
 */
//$(document).load(
//
//	// This function will get executed after the DOM is fully loaded
//  	function ()
//	{
//		// early voting date fields
//		$("#isEarlyVotingDatepicker").datepicker({minDate: -1, maxDate: Voter.electionDate});
//		$("#isEarlyVotingDatepicker").datepicker("setDate", Voter.earlyVotingDate);
//		$("#isEarlyVotingMobileDatepicker").datepicker({minDate: -1, maxDate: Voter.electionDate});
//		$("#isEarlyVotingMobileDatepicker").datepicker("setDate", Voter.earlyVotingDate);
//		/* absentee dropoff date fields
//		$("#AbsenteeDatepicker").datepicker({minDate: -1, maxDate: Voter.electionDate});
//		$("#AbsenteeDatepicker").datepicker("setDate", new Date);
//		$("#AbsenteeMobileDatepicker").datepicker({minDate: -1, maxDate: Voter.electionDate});
//		$("#AbsenteeMobileDatepicker").datepicker("setDate", new Date); */
//
//		// hide certain filter elements, depending on whether it is election day
//		if (Voter.isElectionDay==false)
//		{
//			document.getElementById('maxWait').style.display = "none";
//			document.getElementById('mobileMaxWait').style.display = "none";
//			document.getElementById('mobileMaxWait2').style.display = "none";
//		} else {
//			document.getElementById('earlyVoting').style.display = "none";
//			document.getElementById('earlyVotingMobile').style.display = "none";
//		}
//
//		// if mobile display, show map as default view
//		var w = window.innerWidth
//		|| document.documentElement.clientWidth
//		|| document.body.clientWidth;
//		if(w < 768)
//			showMobileMap();
//
//	}
//);



///////////////////////////////////////////////////////////////////////////////////
/*
 *Miscellaneous function s
 *
 *
 */
// get values of URL parameters
function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
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
	document.getElementById("collapsingFilter").innerHTML = "SHOW FILTER OPTIONS";
	document.getElementById('collapsingFilter').setAttribute("onclick", "showFilterBar()");
}

function showFilterBar() {
	document.getElementById("collapsingFilter").innerHTML = "HIDE FILTER OPTIONS";
	document.getElementById('collapsingFilter').setAttribute("onclick", "hideFilterBar()");
}





// function to get height of list div and scrollable list
$(window).resize(function(){
	// first get current listDiv height and display
	var listDiv = $('#listDiv');
	var listDivHeight = listDiv.outerHeight();
	var listDivDisplay = listDiv.css('display');



	// then make sure list div is set to 100% height
	listDiv.css({"height":"100%"});

	// then calc scrollable list height
	var tabsHeight = $('#subtractFromList1Live').outerHeight();
	//var filterButtonHeight = $('#subtractFromList2Live').outerHeight();
	var wrapperHeight =  $('.listWrapperLive').outerHeight();
	var height = wrapperHeight-tabsHeight;
	console.log(wrapperHeight  + "-" + tabsHeight + "=" + height );

	$('.scrollable-height').css({"height":height+"px"});

	// reset ListDiv height and display
	listDiv.css({"height": listDivHeight});
	listDiv.css({"display": listDivDisplay});

});

//// function to get height of list div to
$(window).ready(function(){
	var tabsHeight = $('#subtractFromList1Live').outerHeight();
	//var filterButtonHeight = $('#subtractFromList2Live').outerHeight();
	var wrapperHeight =  $('.listWrapperLive').outerHeight();
	Voter.listHeight = wrapperHeight-tabsHeight;
	console.log(wrapperHeight + "-" + tabsHeight + "=" + Voter.listHeight );
	$('.scrollable-height').css({"height": Voter.listHeight+"px"});


	// if mobile display, show map as default view
	var w = window.innerWidth
		|| document.documentElement.clientWidth
		|| document.body.clientWidth;
	if(w < 768)
		showMobileMap();
});
