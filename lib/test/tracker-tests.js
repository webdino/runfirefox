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
    ok(timeoutId !== null, 'Called clearWatch when not watching');
    window.clearTimeout(timeoutId);
    timeoutId = null;
  };
}

asyncTest("start test", function() {
  var tracker = new Tracker(new MockGeolocation());
  tracker.start();
  tracker.stop(function() {
    // Check first point is a start point
    ok(tracker.startTime > 0 && tracker.startTime <= Date.now());
    equal(tracker.path[0].timestamp, 0);
    equal(tracker.path[0].type, 'start');

    // Check last point is an end point
    var last = tracker.path.length - 1;
    ok(last > 0);
    ok(tracker.path[last].timestamp >=  0);
    equal(tracker.path[last].type, 'end');

    // Finish test
    start();
  });
});

asyncTest("pause test", function() {
  var tracker = new Tracker(new MockGeolocation());
  tracker.start();
  tracker.stop(function() {
    tracker.start();
    tracker.stop(function() {
      // Check first point is a start point
      equal(tracker.path[0].type, 'start');

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
        equal(tracker.path[i+1].type, 'resume');
      }

      // Check last point is an end point
      var last = tracker.path.length - 1;
      ok(last > 0);
      equal(tracker.path[last].type, 'end');

      // Finish test
      start();
    });
  });
});
