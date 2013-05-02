/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function MockGeolocation() {
  var timeoutId = null;
  var positionInterval = 100;

  this.watchPosition = function(onsuccess, onerror, options) {
    timeoutId = window.setTimeout(
      function() { dispatchPosition(onsuccess); }, positionInterval);
  };

  function dispatchPosition(callback) {
    var pos = {
      coords: {
                latitude: Math.random() * 1000,
                latitude: Math.random() * 1000,
                altitude: 0,
                accuracy: 0,
                altitudeAccuracy: 0,
                heading: 0,
                speed: 0
              },
      timestamp: Date.now()
    };
    callback(pos);
    timeoutId = window.setTimeout(
      function() { dispatchPosition(callback); }, positionInterval);
  }

  this.clearWatch = function(watchId) {
    ok(timeoutId !== null, 'Called clearWatch while watching');
    window.clearTimeout(timeoutId);
    timeoutId = null;
  };
}

function errorHandler(cause) {
  return function(arg) {
    ok(false, "Error whilst " + cause);
    start();
  }
}

asyncTest("start test", function() {
  var tracker = new Tracker(new MockGeolocation());
  tracker.start().then(
    function(arg) {
      equal(arg, tracker, "Argument passed to start callback is tracker");
      // Check first point is a start point
      ok(tracker.startTime > 0 && tracker.startTime <= Date.now(),
         "Tracker start time is a valid time before or at now");
      equal(tracker.path[0].timestamp, 0,
            "Initial path point has zero timestamp");
      equal(tracker.path[0].type, 'start', "Path begins with 'start'");
      return tracker.stop();
    },
    errorHandler("starting tracker")
  ).then(
    function(arg) {
      equal(arg, tracker, "Argument passed to stop callback is tracker");
      // Check last point is an end point
      var last = tracker.path.length - 1;
      ok(last > 0, "More than one point in path");
      ok(tracker.path[last].timestamp >= 0, "Last point has a timestamp >= 0");
      equal(tracker.path[last].type, 'end', "Path ends with 'end'");
      // Finish test
      start();
    },
    errorHandler("stopping tracker")
  );
});

asyncTest("pause test", function() {
  (new Tracker(new MockGeolocation())).start().then(
    function(tracker) {
      return tracker.stop();
    },
    errorHandler("starting tracker first time")
  ).then(
    function(tracker) {
      return tracker.start();
    },
    errorHandler("stopping tracker first time")
  ).then(
    function(tracker) {
      return tracker.stop();
    },
    errorHandler("starting tracker second time")
  ).then(
    function(tracker) {
      // Check first point is a start point
      equal(tracker.path[0].type, 'start', "First point is start");

      // Check we have a pause entry
      var foundPause = false;
      for (var i = 1; i < tracker.path.length - 2; i++) {
        if (tracker.path[i].type == 'pause') {
          foundPause = true;
          break;
        }
      }
      ok(foundPause, "Found pause entry");

      // Followed by a resume
      if (foundPause) {
        equal(tracker.path[i+1].type, 'resume', "Got resume point");
      }

      // Check last point is an end point
      var last = tracker.path.length - 1;
      ok(last > 2, "Got more than three points in the path");
      equal(tracker.path[last].type, 'end', "Got an end point");

      // Finish test
      start();
    },
    errorHandler("stopping tracker second time")
  );
});
