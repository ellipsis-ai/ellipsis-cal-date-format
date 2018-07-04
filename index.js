"use strict";

const moment = require('moment-timezone');

const EventFormatter = {
  formats: {
    DAY_OF_WEEK: 'dddd',
    ALL_DAY: 'll',
    DATE: 'ddd, MMM D',
    YMD: 'Y-MM-DD',
    TIME: 'LT',
    TZ: 'z'
  },

  verbiage: {
    DASH: '—',
    ALL_DAY_SUFFIX: '(all day)',
    TODAY: 'Today'
  },

  defaultTimeZone: 'UTC',

  formatHangoutLinkFor(event, options) {
    const separator = options && options.details ? "" : " · ";
    return event.hangoutLink ? `${separator}[Join hangout](${event.hangoutLink})` : "";
  },

  formatAttendeesFor(event) {
    const attendees = event.attendees || [];
    const attendeesWithoutSelf = attendees.filter(ea => !ea.self);
    return attendeesWithoutSelf.length ? (" - " + attendeesWithoutSelf.map(ea => ea.displayName || ea.email).join(", ")) : "";
  },

  formatEvent: function(event, tz, optionalTodayYMD, options) {
    if (options && options.details) {
      return this.formatEventWithDetails(event, tz, optionalTodayYMD, options);
    } else {
      return this.formatEventWithoutDetails(event, tz, optionalTodayYMD, options);
    }
  },

  summaryLink: function(event) {
    const summary = event.summary || "(untitled event)";
    const linkText = `${summary}${this.formatAttendeesFor(event)}`;
    const escaped = linkText.replace(/([\[\]<>])/g, "\\$1");
    return `[${escaped}](${event.htmlLink})`;
  },

  formatEventWithDetails: function(event, tz, optionalTodayYMD, options) {
    const time = this.formatEventDateTime(event, tz, optionalTodayYMD);
    const attendance = this.formatSelfAttendanceFor(event);
    let optionalData = "";
    if (event.description) {
      optionalData += `${event.description}  \n`;
    }
    if (event.location) {
      optionalData += `_Where: ${event.location}_  \n`;
    }
    return `${time}${attendance}  \n**${this.summaryLink(event)}**  \n${optionalData}${this.formatHangoutLinkFor(event, options)}`;
  },

  formatEventWithoutDetails: function(event, tz, optionalTodayYMD, options) {
    const time = this.formatEventDateTime(event, tz, optionalTodayYMD);
    return `${time}: **${this.summaryLink(event)}**${this.formatSelfAttendanceFor(event)}${this.formatHangoutLinkFor(event, options)}`;
  },

  formatEventDateTimeWithDay: function(event, tz, optionalTodayYMD) {
    return this.formatEventDateTime(event, tz, optionalTodayYMD, true);
  },

  formatEventDateTime: function(event, tz, optionalTodayYMD, includeDay) {
    if (!event) {
      return "";
    } else if (event.start.date) {
      return this.formatAllDayEvent(event, optionalTodayYMD, includeDay);
    } else {
      return this.formatRegularEvent(event, tz, optionalTodayYMD, includeDay);
    }
  },

  formatAllDayEvent: function(event, optionalTodayYMD, includeDay) {
    const start = moment(event.start.date);
    const startDay = includeDay ? `${start.format(this.formats.DAY_OF_WEEK)}, ` : "";
    const formattedStartDate = startDay + start.format(this.formats.ALL_DAY);
    const sameAsToday = optionalTodayYMD && start.format(this.formats.YMD) === optionalTodayYMD;
    let formattedEventTime = sameAsToday ? this.verbiage.TODAY : formattedStartDate;
    if (!event.endTimeUnspecified && event.end.date) {
      const end = moment(event.end.date).subtract(1, 'days');
      const endDay = includeDay ? `${end.format(this.formats.DAY_OF_WEEK)}, ` : "";
      let formattedEndDate = endDay + end.format(this.formats.ALL_DAY);
      if (formattedEndDate !== formattedStartDate) {
        formattedEventTime += ` ${this.verbiage.DASH} ${formattedEndDate}`;
      }
    }
    if (formattedEventTime === formattedStartDate || formattedEventTime === this.verbiage.TODAY) {
      formattedEventTime += ` ${this.verbiage.ALL_DAY_SUFFIX}`;
    }
    return formattedEventTime;
  },

  formatRegularEvent: function(event, tz, optionalTodayYMD, includeDay) {
    const eventTz = event.start.timeZone || tz || this.defaultTimeZone;
    let start = moment(event.start.dateTime).tz(eventTz);
    let startDay = includeDay ? `${start.format(this.formats.DAY_OF_WEEK)}, ` : "";
    let startDate = start.format(this.formats.DATE);
    let startTime = start.format(this.formats.TIME);
    let end;
    let endDay = '';
    let endDate = '';
    let endTime = '';
    if (!event.endTimeUnspecified) {
      end = moment(event.end.dateTime).tz(eventTz);
      endDay = includeDay ? `${end.format(this.formats.DAY_OF_WEEK)}, ` : "";
      endDate = end.format(this.formats.DATE);
      endTime = end.format(this.formats.TIME);
    }

    let excludeDate = false;
    if (optionalTodayYMD) {
      const sameStartDate = start.format(this.formats.YMD) === optionalTodayYMD;
      excludeDate = sameStartDate && (!endDate || endDate === startDate);
    }

    let formattedEventTime = excludeDate ? startTime : `${startDay}${startDate} ${startTime}`;
    if (endDate && endDate !== startDate) {
      formattedEventTime += ` ${this.verbiage.DASH} ${endDay}${endDate} ${endTime}`;
    } else if (endTime) {
      formattedEventTime += ` ${this.verbiage.DASH} ${endTime}`;
    }

    formattedEventTime += ` ${start.format(this.formats.TZ)}`;
    return formattedEventTime;
  },

  formatSelfAttendanceFor: function(event) {
    const selfAttendee = (event.attendees || []).find((ea) => ea.self);
    const response = selfAttendee ? selfAttendee.responseStatus : null;
    if (response === "accepted") {
      return " ✔︎";
    } else if (response === "declined" || response === "tentative") {
      return ` _(${response})_`;
    } else {
      return "";
    }
  }
};

module.exports = EventFormatter;
