/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var Runkeeper = Runkeeper || {};
Runkeeper.Setting = (function(){

    var Setting = function(account, password){
	this.accout = account;
	this.password = password;

	this.workout_reminder = new WorkoutReminder();
    };

    var WorkoutReminder = function(day, hour){
	this.setDay(day);
	this.setHour(hour);
	this.updateTimeStamp();
    };
    WorkoutReminder.Day = {
	DONT_REMIND_ME: -1,
	TOMORROW: 1,
	IN_2DAYS: 2,
	IN_3DAYS: 3,
	IN_5DAYS: 5
    };
    WorkoutReminder.Hour = {
	AM_6: 6,
	AM_9: 9,
	NOON: 12,
	PM_2: 14,
	PM_5: 17,
	PM_8: 20
    };
    WorkoutReminder.prototype = (function(){
	var DAY_IN_MILLISEC = 86400000;
	var isValidDay = function(day){
	    return values(WorkoutReminder.Day).indexOf(day) > -1;
	};

	var isValidHour = function(hour){
	    return values(WorkoutReminder.Hour).indexOf(hour) > -1;
	};

	var getHourString = function(hour){
	    var ret = hour - 12;
	    if(ret == 0){
		return "正午";
	    }else if(ret < 0){
		return "午前" + hour + "時";
	    }else{
		return "午後" + ret + "時";
	    }
	};
	
	return {
	    updateTimeStamp: function(){
		this.timestamp = new Date();
	    },
	    setDay: function(day){
		if(isValidDay(day)){
		    this.day = day;
		}else{
		    this.day = WorkoutReminder.Day.DONT_REMIND_ME;
		}
	    },
	    setHour: function(hour){
		if(isValidHour(hour)){
		    this.hour = hour;
		}else{
		    this.hour = WorkoutReminder.Hour.AM_6;
		}
	    },
	    getReminedDate: function(){
		if(this.day == WorkoutReminder.Day.DONT_REMIND_ME){
		    return this.timestamp;
		}else{
		    var ret = new Date(this.timestamp.getTime() + this.day * DAY_IN_MILLISEC);
		    ret.setHours(this.hour);
		    return ret;
		}
	    },
	    toString: function(){
		if(this.day == WorkoutReminder.Day.DONT_REMIND_ME){
		    return "Don't remind me.";
		}else{
		    var date = this.getRemindDate();		    
		    return date.getFullYear() + "年" + (date.getMonth + 1) + "月" + date.getDate() + "日" + getHourString();
		}
	    }
	};
    })();

    var AudioCue = function(){
    };

    AudioCue.prototype = (function(){
	var isBoolean = function(val){
	    return val === true || val === false;
	};

	var set = function(tbl, attr, value){
	    if(tbl != null && tbl[attr] != null && isBoolean(value)){
		tbl[attr] = value;
	    }
	};
	
	return {
	    time: false,
	    distance: false,
	    averagePace: false,
	    averageSpeed: false,
	    currentPace: false,
	    currentSpeed: false,
	    splitPace: false,
	    splitSpeed: false,
	    averageHeartrate: false,
	    currentHeartrate: false,
	    heartrateZone: false,
	    setTime: function(flag){
		set(self, "time", flag);
	    },
	    setDistance: function(flag){
		set(self, "distance", flag);
	    },
	    setAveragePace: function(flag){
		set(self, "averagePace", flag);
	    },
	    setAverageSpeed: function(flag){
		set(self, "averageSpeed", flag);
	    },
	    setCurrentPace: function(flag){
		set(self, "currentPace", flag);
	    },
	    setSplitPace: function(flag){
		set(self, "splitPace", flag);
	    },
	    setSplitSpeed: function(flag){
		set(self, "splitSpeed", flag);
	    },
	    setAverageHeartrate: function(flag){
		set(self, "averageHeartrate", flag);
	    },
	    setCurrentHeartrate: function(flag){
		set(self, "currentHeartrate", flag);
	    },
	    setHeartrateZone: function(flag){
		set(self, "heartrateZone", flag);
	    }
	};
    })();

    

    return {
    };

})();