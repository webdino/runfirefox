/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var HomeControls = function() {
  var tracker = null;
  var self = this;
  var listener = function(e) {
    self.selectMenu(e);
  };
  document.getElementById("home").addEventListener('click', listener);
}

HomeControls.prototype.start = function(audioControls) {
  this.audioControls = audioControls;
}

HomeControls.prototype.stop = function() {
}

HomeControls.prototype.run = function() {
  tracker = new Tracker();
  var self = this;
  tracker.start().then(
    function() {
      self.audioControls.run();
      document.getElementById('progressContents').removeAttribute(
        'aria-hidden');
      document.getElementById('startContents').setAttribute('aria-hidden',
        'true');
    },
    function(result) {
      // TODO fail
      console.log(result.error);
    }
  );
  tracker.on("progress", function(position) {
    var formattedDistance = (function(dist) {
      return dist < 1000
             ? dist.toFixed(0) + "m"
             : (dist / 1000).toFixed(2) + "km";
    })(position.distance);
    document.getElementById('currentDistance').textContent = formattedDistance;
  });
}

HomeControls.prototype.selectMenu = function(e) {
  var action = e.target,
    actionType = action.getAttribute('data-action-type');
  if (actionType) {
    switch(actionType) {
      case 'run':
        this.run();
        break;
    }
  }
}
