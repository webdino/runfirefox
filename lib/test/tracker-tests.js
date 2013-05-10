/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function MockGeolocation() {
  var timeoutId = null;
  var queuedPositions = 0;
  var onposition;
  var onqueuecomplete;

  this.watchError = 0;
  this.timeout = null;

  this.watchPosition = function(onsuccess, onerror, options) {
    // Check for error
    if (this.watchError) {
      timeoutId = null;
      onposition = undefined;
      var errorObject = { code: this.watchError, message: "Error!" };
      onerror(errorObject);
      return null;
    }
    // Check for timeout
    if (this.timeout && options.timeout &&
        options.timeout < this.timeout) {
      timeoutId = null;
      onposition = undefined;

      // Dispatch error asynchronously to more closely approximate the behavior
      var errorObject = { code: 3, message: "Timeout!" };
      window.setTimeout( function() { onerror(errorObject); }, 0);
      return 2;
    }
    // Success
    onposition = onsuccess;
    timeoutId = window.setTimeout( function() { dispatchPosition(); }, 0);
    return timeoutId;
  };

  this.clearWatch = function(watchId) {
    ok(timeoutId !== null, 'Called clearWatch while watching');
    window.clearTimeout(timeoutId);
    timeoutId = null;
    onposition = undefined;
    onqueuecomplete = undefined;
  };

  // This is not part of the Geolocation API but is an additional test method
  // that allows queueing a series of position events and then getting
  // a callback when they have all been dispatched.
  this.queuePositions = function(numPositions) {
    queuedPositions += numPositions;
    if (queuedPositions)
      timeoutId = window.setTimeout( function() { dispatchPosition(); }, 0);
    return new RSVP.Promise(function(resolve, reject) {
      onqueuecomplete = resolve;
    });
  };

  function dispatchPosition() {
    var pos = {
      coords: {
                latitude: Math.random() * 1000,
                longitude: Math.random() * 1000,
                altitude: 0,
                accuracy: 0,
                altitudeAccuracy: 0,
                heading: 0,
                speed: 0
              },
      timestamp: Date.now()
    };
    onposition(pos);
    if (queuedPositions--) {
      timeoutId = window.setTimeout( function() { dispatchPosition(); }, 0);
    } else if (onqueuecomplete) {
      onqueuecomplete();
      onqueuecomplete = undefined;
    }
  }
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

      // Check last point is an end point
      tracker.stop();
      var last = tracker.path.length - 1;
      ok(last > 0, "More than one point in path");
      ok(tracker.path[last].timestamp >= 0, "Last point has a timestamp >= 0");
      equal(tracker.path[last].type, 'end', "Path ends with 'end'");

      // Finish test
      start();
    },
    errorHandler("starting tracker")
  );
});

asyncTest("stop test", function() {
  (new Tracker(new MockGeolocation())).start().then(
    function(tracker) {
      // Stop immediately, this will cause us to create a synthetic stop point
      tracker.stop();

      equal(tracker.path.length, 2, "Two points in tracker after stopping");
      equal(tracker.path[0].type, "start");
      equal(tracker.path[1].type, "end", "Synthetic point has end type");
      equal(tracker.path[1].timestamp, tracker.path[0].timestamp,
            "Synthetic point has correct timestamp");
      equal(tracker.path[1].latitude, tracker.path[0].latitude,
            "Synthetic point has correct latitude");
      equal(tracker.path[1].longitude, tracker.path[0].longitude,
            "Synthetic point has correct longitude");
      equal(tracker.path[1].altitude, tracker.path[0].altitude,
            "Synthetic point has correct altitude");

      // Finish test
      start();
    },
    errorHandler("starting tracker")
  );
});

asyncTest("pause test", function() {
  (new Tracker(new MockGeolocation())).start().then(
    function(tracker) {
      // Stop and re-start tracker
      tracker.stop();
      return tracker.start();
    },
    errorHandler("starting tracker first time")
  ).then(
    function(tracker) {
      // Stop second time
      tracker.stop();

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
    errorHandler("starting tracker second time")
  );
});

asyncTest("double start test", function() {
  // Check that calling start() again without waiting for the first one to
  // complete cancels the first request.
  var tracker = new Tracker(new MockGeolocation());
  tracker.start().then(
    function() {
      ok(false, "First request was cancelled.");
      start();
    },
    errorHandler("starting tracker first time")
  );
  tracker.start().then(
    function() {
      equal(tracker.path.length, 1,
            "Got expect number of points in tracker path");
      start();
    },
    errorHandler("starting tracker second time")
  );
});

asyncTest("redundant start test", function() {
  (new Tracker(new MockGeolocation())).start().then(
    function(tracker) {
      // Try starting again
      return tracker.start();
    },
    errorHandler("starting tracker first time")
  ).then(
    function(tracker) {
      // Still should only be one segment in the path since the second request
      // should basically be ignored.
      equal(tracker.path.length, 1,
            "Got expect number of points in tracker path");
      start();
    },
    errorHandler("starting tracker second time")
  );
});

asyncTest("test positions", function() {
  var mockGeolocation = new MockGeolocation();
  var tracker = new Tracker(mockGeolocation);
  tracker.start().then(
    function() {
      return mockGeolocation.queuePositions(2);
    },
    errorHandler("starting tracker first time")
  ).then(
    function() {
      // Should have: start, gps, gps
      equal(tracker.path.length, 3);
      equal(tracker.path[0].type, 'start');
      equal(tracker.path[1].type, 'gps');
      equal(tracker.path[2].type, 'gps');

      // Check last point is converted to end
      tracker.stop();
      equal(tracker.path.length, 3);
      equal(tracker.path[0].type, 'start');
      equal(tracker.path[1].type, 'gps');
      equal(tracker.path[2].type, 'end');

      start();
    }
  );
});

asyncTest("test progress callback", function() {
  var mockGeolocation = new MockGeolocation();
  var tracker = new Tracker(mockGeolocation);

  // Set up test progress callback
  var numCalls = 0;
  var latestPosition;
  tracker.on("progress", function(position) {
    numCalls++;
    latestPosition = position;
  });

  tracker.start().then(
    function() {
      // Due to the way rsvp.js call resolve functions asynchronously and event
      // callbacks synchronously, we will have called the progress callback once
      // by the time the promise from start() resolves.
      equal(numCalls, 1,
            "Progress callback already called when start() promise resolves");
      equal(latestPosition.timestamp, 0,
            "First progress event has correct timestamp");

      // Add some more events
      return mockGeolocation.queuePositions(2);
    },
    errorHandler("starting tracker first time")
  ).then(
    function() {
      // Check intermediate events
      equal(numCalls, 3, "Progress callback successfully made");
      ok(latestPosition.timestamp != 0,
         "Position passed to progress callback is correct");

      // Stopping should not generate any more callbacks
      tracker.stop();

      // Wait a moment to make sure none are queued
      window.setTimeout(function() {
        equal(numCalls, 3,
              "No additional progress callbacks when stopping normally");
        start();
      }, 0);
    }
  );
});

asyncTest("test progress callback with immediate stop", function() {
  var mockGeolocation = new MockGeolocation();
  var tracker = new Tracker(mockGeolocation);

  // Set up test progress callback
  var numCalls = 0;
  var latestPosition;
  tracker.on("progress", function(position) {
    numCalls++;
    latestPosition = position;
  });

  tracker.start().then(
    function() {
      equal(numCalls, 1, "Initial progress callback made.");

      // When we stop a tracker and the latest event is start or resume, we
      // duplicate it in order to generate a stop event.
      //
      // In that case we *should* call the progress callback.
      tracker.stop();

      // Give it a chance to run in case it's queued
      window.setTimeout(function() {
        equal(numCalls, 2,
              "Got additional callback for synthetic stop position");
        start();
      }, 0);
    }
  );
});

asyncTest("test error", function() {
  var mockGeolocation = new MockGeolocation();
  mockGeolocation.watchError = 2;
  var tracker = new Tracker(mockGeolocation);
  tracker.start().then(
    function() {
      ok(false, "Correctly called error callback");
      start();
    },
    function(arg) {
      // Check state of argument
      equal(arg.tracker, tracker,
            "First argument passed to error callback is tracker");
      equal(arg.error.code, mockGeolocation.watchError,
            "Second argument passed to error callback is error object");

      // Check state of tracker
      equal(tracker.startTime, null, "Start time not set");
      equal(tracker.path.length, 0, "No path set");

      // Stopping in this state should not add points
      tracker.stop();
      equal(tracker.startTime, null, "Start time not set");
      equal(tracker.path.length, 0, "No path set");

      // Starting again should work fine
      mockGeolocation.watchError = 0;
      return tracker.start();
    }
  ).then(
    function() {
      // Check everything is in order
      ok(tracker.startTime > 0, "Tracker start time is set");
      equal(tracker.path[0].type, 'start', "Path begins with 'start'");

      // Finish test
      start();
    },
    errorHandler("starting tracker after error")
  );
});

asyncTest("timeout test", function() {
  var mockGeolocation = new MockGeolocation();
  var tracker = new Tracker(mockGeolocation);
  tracker.timeout = 3;
  mockGeolocation.timeout = 5;
  tracker.start().then(
    function() {
      ok(false, "Correctly called error callback");
      start();
    },
    function(arg) {
      // Check state of argument
      equal(arg.tracker, tracker,
            "First argument passed to error callback is tracker");
      equal(arg.error.code, 3,
            "Second argument passed to error callback is error code");

      // Check state of tracker
      equal(tracker.startTime, null, "Start time not set");
      equal(tracker.path.length, 0, "No path set");

      // Check stopping doesn't trigger any errors
      tracker.stop();

      // Finish test
      start();
    }
  );
});
