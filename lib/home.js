/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
var HomeControls = function() {
  var self = this;
  var listener = function(e) {
    self.selectMenu(e);
  };
  document.getElementById("homeContents").addEventListener('click', listener);
}

HomeControls.prototype.start = function(audioControls) {
  this.audioControls = audioControls;
}

HomeControls.prototype.stop = function() {
}

HomeControls.prototype.run = function() {
  this.audioControls.run();
//  this.audioControls.passKilo(512);
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
