/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var Runfirefox = Runfirefox || {};

(function(){
    var MAP_API = "http://maps.googleapis.com/maps/api/js?libraries=geometry&sensor=false";
    if(!Runfirefox.MapView){
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = MAP_API;
	script.onload = function(){
	    window.Runfirefox.MapView = window.Runfirefox.__initMapView(google.maps);
	    delete(window.Runfirefox.__initMapView);
	};
    }
})();

Runfirefox._initMapView = function(maps){

    var MapFactory = function(){
	this.loadMapAPI();
    };

    MapFactory.prototype = (function(){
	var getInitialCenter = function(tracker){
	    var p = tracker.path[0];
	    return new maps.LatLng(p.latitude, p.longitude);
	};

	var getInitialZoom = function(tracker){
	    return 15; // XXX
	};
	
	return {
	    createMap: function(tracker, elm_or_id){
		var elm = elm_or_id;
		if(!(elm_or_id instanceof Element)){
		    elm = document.getElementById(elm_or_id.toString());
		}
		if(elm && this.tracker){
		    var map = new maps.Map(elm, {
			center: getInitialCenter(tracker),
			zoom: getInitialZoom(tracker),
			mapTypeId: "OSM",
			mapTypeControl: false,
			streetViewControl: false
		    });
		    map.mapTypes.set("OSM", new maps.ImageMapType({
			getTileUrl: function(coord, zoom) {
			    return "http://tile.openstreetmap.org/" +
				zoom + "/" +
				coord.x + "/" +
				coord.y + ".png";
			},
			tileSize: new maps.Size(256, 256),
			name: "OpenStreetMap",
			maxZoom: 18
		    }));
		    return map;
		}
		return null;
	    }
	};

    })();

    var MapView = function(tracker, elm_or_id){
	this.tracker = tracker;
	
	if(this.tracker){
	    var factory = new MapFactory();
	    this.map = factory.createMap(this.tracker, elm_or_id);
	}
    };

    MapView.prototype = (function(){
	var MILESTONE_UNIT = 1000;
	var toLatLng = function(list){
	    var ret = [];
	    for(var i = 0; i < list.length; i++){
		var p = list[i];
		if(p.latitude && p.longitude){
		    ret.push(new maps.LatLng(p.latitude, p.longitude));
		}
	    }
	    return ret;
	};

	var extractMilestonesFrom = function(list){
	    var ret = [];
	    if(list && list.length && list.length > 0){
		var total = 0;
		for(var i = 1; i < list.length; i++){
		    total += maps.geometry.spherical.computeDistanceBetween(list[i-1], list[i]);
		    if(total > (ret.length + 1) * MILESTONE_UNIT){
			ret.push(new maps.LatLng(list[i].p));
		    }
		}
	    }
	    return ret;
	};
	
	return {
	    plotPath: function(){
		if(this.tracker && this.map){
		    var path = toLatLng(this.tracker.path);
		    var args = {
			map: this.map,
			path: path
		    };
		    return maps.Polyline(args);
		}
		return null;
	    },
	    plotMilestones: function(){
		var milestones = extractMilestonesFrom(this.tracker.path);
		for(var i = 0; i < milestones.length; i++){
		    milestones[i] = new maps.Marker({
			position: milestones[i],
			map: this.map,
			title: i + "km"
		    });
		}
		return milestones;
	    }
	};
    })();

    return {
	Map: MapView,
	new: function(tracker, elm_or_id){
	    return new MapView(tracker, elm_or_id);
	}
    };
};