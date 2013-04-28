/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
var AudioControls = function(dir) {
  this.dir = dir;
}

AudioControls.prototype.run = function() {
  this.playAudio(this.dir+"/hashire.wav");
}

AudioControls.prototype.playAudio = function(source) {
  var audio = new Audio(source);
  audio.play();
}