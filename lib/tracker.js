/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function Tracker(geolocation, timeout) {
  // The geolocation service to use
  var geolocation = geolocation ? geolocation : navigator.geolocation;

  // When start() was *first* called as a DOMTimestamp
  var startTime = null;

  // Array of objects { timestamp, latitude, longitude, altitude, type }
  //  timestamp - number of seconds since startTime as a double
  //  latitude  - double
  //  longitude - double
  //  altitude  - double
  //  type      - start, gps, pause, resume, end
  var path = [];

  // The cumulative distance travelled
  var distance = 0;

  // The geolocation watchPosition ID
  var watchId = null;

  // Flag to indicate that we are supposed to start but are still waiting for
  // the initial position to arrive
  var waitingToStart = false;

  // The timeout value to pass when calling watchPosition
  this.timeout = timeout || null;

  // Start/resume tracking the position
  //
  // The returned promise will resolve *after* the first position has been sent
  // to the registered "progress" callback (if any).
  //
  // (This is just an artefact of the way rsvp.js works and so it may change.)
  this.start = function() {
    var tracker = this;
    return new RSVP.Promise(function(resolve, reject) {
      // If we're already waiting to start cancel previous request and
      // try again
      if (waitingToStart) {
        geolocation.clearWatch(watchId);
        watchId = null;
        waitingToStart = false;
      }

      // If we're already running, then just keep running
      if (watchId) {
        resolve(tracker);
        return;
      }

      // Set watch options
      var positionOptions = { enableHighAccuracy: true, maximumAge: 0 };
      if (tracker.timeout) {
        positionOptions.timeout = tracker.timeout;
      }

      // Start watching
      waitingToStart = true;
      watchId =
        geolocation.watchPosition(
          function(position) {
            // First point
            if (path.length === 0) {
              startTime = position.timestamp;
              addPoint(position, 'start');
            // Resuming
            } else if (path[path.length-1].type == 'end') {
              path[path.length-1].type = 'pause';
              addPoint(position, 'resume');
            // Regular point
            } else {
              addPoint(position, 'gps');
            }
            // Do start callback if we've just started/resumed
            if (waitingToStart) {
              waitingToStart = false;
              resolve(tracker);
            }
            // Notify observer of new point in path
            tracker.trigger("progress",
              { position: path[path.length-1], distance: distance });
          },
          function(error) {
            waitingToStart = false;
            watchId = null;
            reject({ tracker: tracker, error: error });
          },
          positionOptions
        );
    });
  }

  this.stop = function() {
    // If we're still waiting to start cancel the request
    if (waitingToStart) {
      geolocation.clearWatch(watchId);
      watchId = null;
      waitingToStart = false;
    }

    // If we are not running, just return
    if (watchId === null) {
      return;
    }

    // Cancel watch
    geolocation.clearWatch(watchId);
    watchId = null;

    // Make sure the last point in the path is 'end'
    if (path.length && path[path.length-1].type == 'gps') {
      // Tweak last point
      var last = path[path.length-1];
      last.type = 'end';
      last.timestamp = Math.max(last.timestamp, Date.now() - startTime);
    } else if (path.length) {
      // Duplicate last point and adjust parameters
      var currentLast = path[path.length-1];
      var newLast =
        { timestamp: currentLast.timestamp,
          latitude: currentLast.latitude,
          longitude: currentLast.longitude,
          altitude: currentLast.altitude,
          type: 'end'
        };
      path.push(newLast);
      this.trigger("progress", { position: newLast, distance: distance });
    }
  }

  this.__defineGetter__("startTime", function(){
    return startTime;
  });

  this.__defineGetter__("path", function(){
    return path;
  });

  this.__defineGetter__("distance", function(){
    return distance;
  });

  // Event target support
  RSVP.EventTarget.mixin(this);

  function addPoint(position, type) {
    // Add to path
    path.push({ timestamp: Math.max(position.timestamp - startTime, 0),
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                type: type });

    // Update distance
    if (path.length > 1) {
      distance +=
        distanceBetweenPoints(path[path.length-1], path[path.length-2]);
    }
  }

  function distanceBetweenPoints(pointA, pointB) {
    // Haversine formulae
    var R = 6371000; // m
    var deltaLat  = pointB.latitude  - pointA.latitude;
    var deltaLong = pointB.longitude - pointA.longitude;
    var a = Math.pow(Math.sin(deltaLat / 2), 2) +
            Math.cos(pointA.latitude) * Math.cos(pointB.latitude) *
            Math.pow(Math.sin(deltaLong / 2), 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var flatDistance = R * c;

    // Check if there is altitude to factor in
    if (pointA.altitude === null || pointB.altitude === null ||
        pointA.altitude == pointB.altitude)
      return flatDistance;

    // Factor in altitude
    var verticalDistance = pointB.altitude - pointA.altitude;
    return Math.sqrt(Math.pow(flatDistance, 2) + Math.pow(verticalDistance, 2));
  }
};
