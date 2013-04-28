/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
var AudioControls = function(dir) {
  this.loadAll(dir);
}

AudioControls.prototype.loadAll = function(dir) {
  this.sound_table = {};
  this.sound_table["1"] = new Audio(dir+"/1.wav");
  this.sound_table["2"] = new Audio(dir+"/2.wav");
  this.sound_table["3"] = new Audio(dir+"/3.wav");
  this.sound_table["4"] = new Audio(dir+"/4.wav");
  this.sound_table["5"] = new Audio(dir+"/5.wav");
  this.sound_table["6"] = new Audio(dir+"/6.wav");
  this.sound_table["7"] = new Audio(dir+"/7.wav");
  this.sound_table["8"] = new Audio(dir+"/8.wav");
  this.sound_table["9"] = new Audio(dir+"/9.wav");
  this.sound_table["10"] = new Audio(dir+"/10.wav");
  this.sound_table["100"] = new Audio(dir+"/100.wav");
  this.sound_table["kilo"] = new Audio(dir+"/kilo.wav");
  this.sound_table["hashire"] = new Audio(dir+"/hashire.wav");
}

AudioControls.prototype.run = function() {
  this.playAudio("hashire");
}

AudioControls.prototype.passKilo = function(number) {
  var sources = [];
  this.pushNumber(sources, number);
  this.pushAudio(sources, "kilo");
  this.playPluralAudios(sources, 0);
}

AudioControls.prototype.pushAudio = function(sources, name) {
  sources.push(this.sound_table[name]);
}

AudioControls.prototype.pushNumber = function(sources, number) {
  var handled = Math.floor(number/100);
  number -= 100 * handled;
  var ten = Math.floor(number/10);
  number -= 10 * ten;
  if (handled >= 2) {
    this.pushANumber(sources, handled);
    this.pushAudio(sources, "100");
  } else if (handled == 1) {
    this.pushAudio(sources, "100");
  }
  if (ten >= 2) {
    this.pushANumber(sources, ten);
    this.pushAudio(sources, "10");
  } else if (ten == 1) {
    this.pushAudio(sources, "10");
  }
  this.pushANumber(sources, number);
}

AudioControls.prototype.pushANumber = function(sources, number) {
  switch (number) {
    case 1 : {
      this.pushAudio(sources, "1");
      break;
    }
    case 2 : {
      this.pushAudio(sources, "2");
      break;
    }
    case 3 : {
      this.pushAudio(sources, "3");
      break;
    }
    case 4 : {
      this.pushAudio(sources, "4");
      break;
    }
    case 5 : {
      this.pushAudio(sources, "5");
      break;
    }
    case 6 : {
      this.pushAudio(sources, "6");
      break;
    }
    case 7 : {
      this.pushAudio(sources, "7");
      break;
    }
    case 8 : {
      this.pushAudio(sources, "8");
      break;
    }
    case 9 : {
      this.pushAudio(sources, "9");
      break;
    }
  }
}

AudioControls.prototype.playPluralAudios = function(sources, index) {
  var self = this;
  var audio = sources[index];
  audio.play();
  
  var listener = function(e) {
    audio.removeEventListener("ended", listener);
    index += 1;
    if (sources.length != index) {
      self.playPluralAudios(sources, index);
    }
  }
  
  audio.addEventListener("ended", listener);
}

AudioControls.prototype.playAudio = function(source) {
  var audio = this.sound_table[source];
  audio.play();
}