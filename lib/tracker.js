/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function Tracker() {
  // When start() was called as a DOMTimestamp
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

  this.start = function(onstart, onerror) {
    // XXX Check we're not already started
    startWatching('start', onstart, onerror);
  }

  this.pause = function() {
    // XXX Check we're actually started
    finishWatching('pause', oncomplete);
  }

  this.resume = function() {
    // XXX Check we're actually paused
    startWatching('resume');
  }

  this.stop = function(oncomplete) {
    // XXX Check we're actually started
    finishWatching('end', oncomplete);
  }

  this.__defineGetter__("startTime", function(){
    return startTime;
  });

  this.__defineGetter__("path", function(){
    return path;
  });

  function startWatching(type, onstart, onerror) {
    waitingToStart = true;
    navigator.geolocation.getCurrentPosition(
      function(position) {
        waitingToStart = false;
        if (type == 'start') {
          startTime = Date.now();
        }
        addPoint(position, type);
        watchID =
          navigator.geolocation.watchPosition(
            function(position) {
              addPoint(position, 'gps');
            }, { enableHighAccuracy: true, maximumAge: 0 }
          );
        if (onstart) {
          onstart(this);
        }
      },
      function(error) {
        waitingToStart = false;
        if (onerror) {
          onerror(error);
        }
      },
      { enableHighAccuracy: true, maximumAge: 30 * 1000 }
    );
  }

  function finishWatching(type, oncomplete) {
    // If we're still waiting to start, just keep waiting
    if (waitingToStart) {
      setTimeout(function() { finishWatching(type, oncomplete); }, 100);
      return;
    }
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    navigator.geolocation.getCurrentPosition(
      function(position) {
        addPoint(position, type);
        if (oncomplete) {
          oncomplete(this);
        }
      },
      function(error) {
        // XXX Copy the last point and set type to pause
        if (oncomplete) {
          oncomplete(this);
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000 * 120 }
    );
  }

  function addPoint(position, type) {
    path.push({ timestamp: Math.max(position.timestamp - startTime, 0),
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                type: type });
  }
};
