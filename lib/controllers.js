/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
 
var RunFirefox = RunFirefox || {};

RunFirefox.init = function() {
  RunFirefox.audioControls = new AudioControls("audio");
  RunFirefox.homeControls = new HomeControls();
  var menu = document.getElementById("menu");
  menu.addEventListener('click', RunFirefox.selectMenu);
  for (var i = 0, n = menu.children.length; i < n; i++) {
    var menu = menu.children[i];
    var actionType = menu.getAttribute('data-action-type');
    if (actionType == 'slideHome') {
      RunFirefox.transferControls(RunFirefox.homeControls, menu);
      break;
    }
  }
}

RunFirefox.transferControls = function(controller, element) {
  if (RunFirefox.currentControls) {
    RunFirefox.currentControls.stop();
    RunFirefox.currentTarget.classList.remove("selected");
  }
  RunFirefox.currentTarget = element;
  RunFirefox.currentControls = controller;
  RunFirefox.currentTarget.classList.add("selected");
  RunFirefox.currentControls.start(RunFirefox.audioControls);
}

RunFirefox.selectMenu = function(e) {
  var action = e.target,
    actionType = action.getAttribute('data-action-type');
  if (actionType) {
    var mainContainer = document.getElementById('contents');
    switch(actionType) {
      case 'slideHome':
        RunFirefox.transferControls(RunFirefox.homeControls, action);
        mainContainer.slideTo(0);
        break;
      case 'slideActivity':
        RunFirefox.transferControls({"start":function(){}, "stop":function(){}}, action);
        mainContainer.slideTo(1);
        break;
      case 'slideSetting':
        RunFirefox.transferControls({"start":function(){}, "stop":function(){}}, action);
        mainContainer.slideTo(2);
        break;
    }
  }
}

window.addEventListener("load", function(e) {
  RunFirefox.init();
}, false);
