/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var HomeControls = function() {
  var tracker       = null;
  var audioControls = null;

  $('home').addEventListener('click', function(e) { performAction(e); } );

  this.start = function(parentAudioControls) {
    audioControls = parentAudioControls;
  };

  this.stop = function() {
  };

  function performAction(e) {
    var action = e.target,
        actionType = action.getAttribute('data-action-type');
    if (!actionType)
      return;

    switch(actionType) {
      case 'run':
        run();
        break;

      case 'pause':
        pause();
        break;

      case 'resume':
        resume();
        break;
    }
  }

  function run() {
    tracker = new Tracker();
    tracker.start().then(
      function() {
        if (audioControls)
          audioControls.run();
        $('progressContents').removeAttribute('aria-hidden');
        $('startContents').setAttribute('aria-hidden', 'true');
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
      $('currentDistance').textContent = formattedDistance;
    });
  }

  function pause() {
    tracker.stop();
    getPauseButton().textContent = "再開";
    getPauseButton().setAttribute('data-action-type', 'resume');
  }

  function resume() {
    tracker.start().then(
      function() {
        getPauseButton().textContent = "一時停止";
        getPauseButton().setAttribute('data-action-type', 'pause');
      }
    );
  }

  function getPauseButton() {
    if (!getPauseButton.result) {
      getPauseButton.result =
        document.querySelector("#home button[data-action-type=pause]");
    }
    return getPauseButton.result;
  }
}

