/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function Tracker(geolocation) {
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

  // The geolocation watchPosition ID
  var watchId = null;

  // Flag to indicate that we are supposed to start but are still waiting for
  // the initial position to arrive
  var waitingToStart = false;

  this.start = function(onstart, onprogress, onerror) {
    // If we're already waiting to start, just keep waiting
    if (waitingToStart)
      return;

    // If we're still running, then just keep running
    if (watchId)
      return;

    // Start watching
    waitingToStart = true;
    watchId =
      geolocation.watchPosition(
        function(position) {
          waitingToStart = false;
          // First point
          if (path.length === 0) {
            startTime = position.timestamp;
            addPoint(position, 'start');
            if (onstart) {
              onstart(path[path.length-1], this);
            }
          // Resuming
          } else if (path[path.length-1].type == 'end') {
            path[path.length-1].type = 'pause';
            addPoint(position, 'resume');
            if (onstart) {
              onstart(path[path.length-1], this);
            }
          // Regular point
          } else {
            addPoint(position, 'gps');
            if (onprogress) {
              onprogress(path[path.length-1], this);
            }
          }
        },
        function(error) {
          waitingToStart = false;
          watchId = null;
          if (onerror) {
            onerror(error, this);
          }
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
  }

  this.stop = function(oncomplete) {
    // If we're still waiting to start, just keep waiting
    if (waitingToStart) {
      setTimeout(function() { this.stop(oncomplete); }.bind(this), 100);
      return;
    }

    // Ensure we are actually running
    if (watchId === null) {
      if (oncomplete) {
        oncomplete(this);
      }
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
        { timestamp: Math.max(currentLast.timestamp, Date.now() - startTime),
          latitude: currentLast.longitude,
          longitude: currentLast.longitude,
          altitude: currentLast.altitude,
          type: 'end'
        };
      path.push(newLast);
    }

    // Finish
    if (oncomplete) {
      oncomplete(this);
    }
  }

  this.__defineGetter__("startTime", function(){
    return startTime;
  });

  this.__defineGetter__("path", function(){
    return path;
  });

  function addPoint(position, type) {
    path.push({ timestamp: Math.max(position.timestamp - startTime, 0),
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                type: type });
  }
};
