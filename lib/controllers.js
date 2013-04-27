/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
 
var RunFirefox = RunFirefox || {};

RunFirefox.init = function() {
  document.addEventListener('click', RunFirefox.onClickInMenu);
}

RunFirefox.onClickInMenu = function(e) {
  var action = e.target,
    parent = action.parentNode,
    actionType = action.getAttribute('data-action-type');
  if (actionType) {
    var mainContainer = document.getElementById('contents');
    switch(actionType) {
      case 'slideHome':
        mainContainer.slideTo(0);
        break;
      case 'slideActivity':
        mainContainer.slideTo(1);
        break;
      case 'slideSetting':
        mainContainer.slideTo(2);
        break;
    }
  }
}
RunFirefox.init();