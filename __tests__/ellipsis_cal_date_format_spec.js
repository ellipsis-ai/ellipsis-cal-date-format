"use strict";

jest.unmock('../index');
jest.unmock('moment-timezone');

const moment = require('moment-timezone');
const Formatter = require('../index');

function format(event, format_type) {
  return moment(event).format(Formatter.formats[format_type]);
}

function formatTz(event, format_type, tz) {
  return moment(event).tz(tz || 'UTC').format(Formatter.formats[format_type]);
}

describe("Formatter", () => {

  describe("formatEventWithoutDetails", () => {
    it("Displays non-time parts of the event without details", () => {
      const event = {
        summary: "Some made-up event",
        htmlLink: "https://calendar.google.com/calendar",
        hangoutLink: "https://hangout.google.com/",
        start: {
          date: '2017-01-01'
        },
        end: {
          date: '2017-01-03'
        },
        attendees: [{
          email: 'luke@ellipsis.ai',
          self: true,
          responseStatus: 'accepted'
        }],
      };
      expect(Formatter.formatEventWithoutDetails(event)).toBe([
        format(event.start.date, 'ALL_DAY'),
        Formatter.verbiage.DASH,
        format('2017-01-02', 'ALL_DAY') + ":",
        `**[${event.summary}](${event.htmlLink})** ✔︎ · [Join hangout](${event.hangoutLink})`
      ].join(" "));
    });

  });

  describe("formatEventWithDetails", () => {

    it("Displays non-time parts of the event with details", () => {
      const event = {
        summary: "Some made-up event",
        description: "Some made-up description",
        location: "Toronto",
        htmlLink: "https://calendar.google.com/calendar",
        hangoutLink: "https://hangout.google.com/",
        start: {
          date: '2017-01-01'
        },
        end: {
          date: '2017-01-03'
        },
        attendees: [
          { self: true, email: "andrew@ellipsis.ai", responseStatus: 'accepted' },
          { email: "luke@ellipsis.ai" },
          { email: "matteo@ellipsis.ai" }
        ]
      };
      expect(Formatter.formatEventWithDetails(event, null, null, {details: true})).toBe([
        format(event.start.date, 'ALL_DAY') + " ",
        Formatter.verbiage.DASH + " ",
        format('2017-01-02', 'ALL_DAY') + " ✔︎  \n",
        `**[${event.summary} - luke@ellipsis.ai, matteo@ellipsis.ai](${event.htmlLink})**  \n${event.description}  \n_Where: ${event.location}_  \n[Join hangout](${event.hangoutLink})`
      ].join(""));
    });
  });

  describe("formatEvent", () => {

    it("Calls the appropriate formatting method given details=true", () => {
      const MyFormatter = require('../index');
      MyFormatter.formatEventWithDetails = jest.fn();
      MyFormatter.formatEvent({}, null, null, {details: true});
      expect(MyFormatter.formatEventWithDetails.mock.calls.length).toBe(1);
    });

    it("Calls the appropriate formatting method given details=false", () => {
      const MyFormatter = require('../index');
      MyFormatter.formatEventWithoutDetails = jest.fn();
      MyFormatter.formatEvent({}, null, null, {details: false});
      expect(MyFormatter.formatEventWithoutDetails.mock.calls.length).toBe(1);
    });

  });

  // The end date for all-day events is always one more than the last day of the event
  describe("formatAllDayEvent", () => {
    it("subtracts the last day from all day events", () => {
      const event = {
        start: {
          date: '2017-01-01'
        },
        end: {
          date: '2017-01-03'
        }
      };
      expect(Formatter.formatAllDayEvent(event)).toBe([
        format(event.start.date, 'ALL_DAY'),
        Formatter.verbiage.DASH, format('2017-01-02', 'ALL_DAY')
      ].join(" "));
    });

    it("includes “all day” for single day events", () => {
      const event1 = {
        start: {
          date: '2017-01-01'
        },
        end: {
          date: '2017-01-02'
        }
      };
      expect(Formatter.formatAllDayEvent(event1)).toBe([
        format(event1.start.date, 'ALL_DAY'),
        Formatter.verbiage.ALL_DAY_SUFFIX
      ].join(" "));
    });


    it('says Today for all-day event that is the same day as specified date', () => {
      const event1 = {
        start: {
          date: '2017-01-01'
        },
        end: {
          date: '2017-01-02'
        }
      };
      expect(Formatter.formatAllDayEvent(event1, '2017-01-01')).toBe([
        Formatter.verbiage.TODAY,
        Formatter.verbiage.ALL_DAY_SUFFIX
      ].join(" "));
    });
  });

  describe("formatRegularEvent", () => {
    it("includes the end time and end date if different", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00Z'
        },
        end: {
          dateTime: '2017-01-02T17:00:00.00Z'
        }
      };
      expect(Formatter.formatRegularEvent(event)).toBe([
        formatTz(event.start.dateTime, 'DATE'),
        formatTz(event.start.dateTime, 'TIME'),
        Formatter.verbiage.DASH,
        formatTz(event.end.dateTime, 'DATE'),
        formatTz(event.end.dateTime, 'TIME'),
        formatTz(event.start.dateTime, 'TZ')
      ].join(" "));
    });

    it("omits the end date if the same", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00Z'
        },
        end: {
          dateTime: '2017-01-01T17:00:00.00Z'
        }
      };
      expect(Formatter.formatRegularEvent(event)).toBe([
        formatTz(event.start.dateTime, 'DATE'),
        formatTz(event.start.dateTime, 'TIME'),
        Formatter.verbiage.DASH,
        formatTz(event.end.dateTime, 'TIME'),
        formatTz(event.start.dateTime, 'TZ')
      ].join(" "));
    });

    it("omits the end if unspecified", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00Z'
        },
        endTimeUnspecified: true
      };
      expect(Formatter.formatRegularEvent(event)).toBe([
        formatTz(event.start.dateTime, 'DATE'),
        formatTz(event.start.dateTime, 'TIME'),
        formatTz(event.start.dateTime, 'TZ')
      ].join(" "));
    });

    it("defaults to UTC with no time zone specified", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00-05:00'
        },
        end: {
          dateTime: '2017-01-02T17:00:00.00-05:00'
        }
      };
      expect(Formatter.formatRegularEvent(event)).toBe([
        formatTz(event.start.dateTime, 'DATE', 'UTC'),
        formatTz(event.start.dateTime, 'TIME', 'UTC'),
        Formatter.verbiage.DASH,
        formatTz(event.end.dateTime, 'DATE', 'UTC'),
        formatTz(event.end.dateTime, 'TIME', 'UTC'),
        formatTz(event.start.dateTime, 'TZ', 'UTC')
      ].join(" "));
    });

    it("uses the time zone of the event if specified", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00-05:00',
          timeZone: 'America/Toronto'
        },
        end: {
          dateTime: '2017-01-02T17:00:00.00-05:00',
          timeZone: 'America/Toronto'
        }
      };
      expect(Formatter.formatRegularEvent(event)).toBe([
        formatTz(event.start.dateTime, 'DATE', 'America/Toronto'),
        formatTz(event.start.dateTime, 'TIME', 'America/Toronto'),
        Formatter.verbiage.DASH,
        formatTz(event.end.dateTime, 'DATE', 'America/Toronto'),
        formatTz(event.end.dateTime, 'TIME', 'America/Toronto'),
        formatTz(event.start.dateTime, 'TZ', 'America/Toronto')
      ].join(" "));
    });

    it("uses a specified time zone if the event has none", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00Z'
        },
        end: {
          dateTime: '2017-01-02T17:00:00.00Z'
        }
      };
      expect(Formatter.formatRegularEvent(event, 'America/Toronto')).toBe([
        formatTz(event.start.dateTime, 'DATE', 'America/Toronto'),
        formatTz(event.start.dateTime, 'TIME', 'America/Toronto'),
        Formatter.verbiage.DASH,
        formatTz(event.end.dateTime, 'DATE', 'America/Toronto'),
        formatTz(event.end.dateTime, 'TIME', 'America/Toronto'),
        formatTz(event.start.dateTime, 'TZ', 'America/Toronto')
      ].join(" "));
    });

    it("prefers the event’s time zone", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00-05:00',
          timeZone: 'America/Toronto'
        },
        end: {
          dateTime: '2017-01-02T17:00:00.00-05:00',
          timeZone: 'America/Toronto'
        }
      };
      expect(Formatter.formatRegularEvent(event, 'America/Los_Angeles')).toBe([
        formatTz(event.start.dateTime, 'DATE', 'America/Toronto'),
        formatTz(event.start.dateTime, 'TIME', 'America/Toronto'),
        Formatter.verbiage.DASH,
        formatTz(event.end.dateTime, 'DATE', 'America/Toronto'),
        formatTz(event.end.dateTime, 'TIME', 'America/Toronto'),
        formatTz(event.start.dateTime, 'TZ', 'America/Toronto')
      ].join(" "));
    });

    it("excludes the date if start and end are same as specified date", () => {
      const event = {
        start: {
          dateTime: '2017-01-01T12:00:00.00-05:00',
          timeZone: 'America/Toronto'
        },
        end: {
          dateTime: '2017-01-01T17:00:00.00-05:00',
          timeZone: 'America/Toronto'
        }
      };
      expect(Formatter.formatRegularEvent(event, 'America/Toronto', '2017-01-01')).toBe([
        formatTz(event.start.dateTime, 'TIME', 'America/Toronto'),
        Formatter.verbiage.DASH,
        formatTz(event.end.dateTime, 'TIME', 'America/Toronto'),
        formatTz(event.start.dateTime, 'TZ', 'America/Toronto')
      ].join(" "));
    });
  });

  describe("summaryLink", () => {
    it("creates an escaped link with the summary text and attendees", () => {
      const event = {
        summary: '[Meeting <> Time]',
        htmlLink: 'https://www.google.com/calendar/event',
        attendees: [{
          email: "joe@whitehouse.gov"
        }, {
          email: "barack@whitehouse.gov",
          displayName: "Obama"
        }, {
          email: "valerie@whitehouse.gov",
          self: true
        }]
      };
      expect(Formatter.summaryLink(event)).toBe("[\\[Meeting \\<\\> Time\\] - joe@whitehouse.gov, Obama](https://www.google.com/calendar/event)");
    });
  });

  describe("attendance", () => {
    it("indicates the user’s attendance", () => {
      const events = [{
        kind: 'calendar#event',
        etag: '"3046635149448000"',
        id: '_6t136c1n6ko3gba574rkcb9k8gp44b9o6ks3ab9j8gq32h1k8gq4cea174',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=XzZ0MTM2YzFuNmtvM2diYTU3NHJrY2I5azhncDQ0YjlvNmtzM2FiOWo4Z3EzMmgxazhncTRjZWExNzQgbHVrZUBlbGxpcHNpcy5haQ',
        created: '2018-04-09T23:46:14.000Z',
        updated: '2018-04-09T23:46:14.724Z',
        summary: 'Test event',
        creator: {email: 'luke@ellipsis.ai', self: true},
        organizer: {email: 'luke@ellipsis.ai', self: true},
        start: {dateTime: '2018-04-09T20:00:00-04:00'},
        end: {dateTime: '2018-04-09T20:30:00-04:00'},
        iCalUID: '7B307508-E97F-4D2B-8585-3D41D4D4F9A9',
        sequence: 0,
        reminders: {useDefault: true}
      }, {
        kind: 'calendar#event',
        etag: '"3046636546970000"',
        id: '_68pk4hhg70o3ib9i8cp3ib9k70ojaba28h2k8b9g6grj8g9k6t1jag9p6g',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=XzY4cGs0aGhnNzBvM2liOWk4Y3AzaWI5azcwb2phYmEyOGgyazhiOWc2Z3JqOGc5azZ0MWphZzlwNmcgbHVrZUBlbGxpcHNpcy5haQ',
        created: '2018-04-09T23:46:21.000Z',
        updated: '2018-04-10T00:09:18.295Z',
        summary: 'Test event 2',
        creator: {email: 'luke@ellipsis.ai', self: true},
        organizer: {
          email: 'ellipsis.ai_5168nrfm7m0snbfk05g92mmuqo@group.calendar.google.com',
          displayName: 'Vacations'
        },
        start: {dateTime: '2018-04-09T20:30:00-04:00'},
        end: {dateTime: '2018-04-09T21:00:00-04:00'},
        iCalUID: '23BF0809-2C29-4815-BDED-0474A47C5A94',
        sequence: 6,
        attendees: [{
          email: 'luke@attaboy.ca', responseStatus: 'needsAction'
        }, {
          email: 'luke@ellipsis.ai',
          self: true,
          responseStatus: 'accepted'
        }],
        reminders: {useDefault: true}
      }, {
        kind: 'calendar#event',
        etag: '"3046637531674000"',
        id: '3ksi1rc17fceacuk4gjld4vasn',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=M2tzaTFyYzE3ZmNlYWN1azRnamxkNHZhc24gbHVrZUBlbGxpcHNpcy5haQ',
        created: '2018-04-09T23:48:26.000Z',
        updated: '2018-04-10T00:06:05.837Z',
        summary: 'Test event 3',
        creator: {email: 'luke@ellipsis.ai', self: true},
        organizer: {
          email: 'ellipsis.ai_5168nrfm7m0snbfk05g92mmuqo@group.calendar.google.com',
          displayName: 'Vacations'
        },
        start: {dateTime: '2018-04-09T21:00:00-04:00'},
        end: {dateTime: '2018-04-09T21:30:00-04:00'},
        iCalUID: '3ksi1rc17fceacuk4gjld4vasn@google.com',
        sequence: 0,
        attendees: [{
          email: 'luke@ellipsis.ai',
          self: true,
          responseStatus: 'tentative'
        }],
        reminders: {useDefault: true}
      }, {
        kind: 'calendar#event',
        etag: '"3046637538112000"',
        id: '1tl2c1f0kno23ngp3gs2jbrobg',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=MXRsMmMxZjBrbm8yM25ncDNnczJqYnJvYmcgbHVrZUBlbGxpcHNpcy5haQ',
        created: '2018-04-09T23:48:33.000Z',
        updated: '2018-04-10T00:06:09.056Z',
        summary: 'Test event 4',
        creator: {email: 'luke@ellipsis.ai', self: true},
        organizer: {
          email: 'ellipsis.ai_5168nrfm7m0snbfk05g92mmuqo@group.calendar.google.com',
          displayName: 'Vacations'
        },
        start: {dateTime: '2018-04-09T21:30:00-04:00'},
        end: {dateTime: '2018-04-09T22:00:00-04:00'},
        iCalUID: '1tl2c1f0kno23ngp3gs2jbrobg@google.com',
        sequence: 0,
        attendees: [{
          email: 'luke@ellipsis.ai',
          self: true,
          responseStatus: 'declined'
        }],
        reminders: {useDefault: true}
      }, {
        kind: 'calendar#event',
        etag: '"3046637652888000"',
        id: '0csrupq3gqqof983o7spnd2ppn',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=MGNzcnVwcTNncXFvZjk4M283c3BuZDJwcG4gbHVrZUBlbGxpcHNpcy5haQ',
        created: '2018-04-10T00:06:20.000Z',
        updated: '2018-04-10T00:07:06.444Z',
        summary: 'Test event 5',
        creator: {email: 'luke@ellipsis.ai', self: true},
        organizer: {
          email: 'ellipsis.ai_5168nrfm7m0snbfk05g92mmuqo@group.calendar.google.com',
          displayName: 'Vacations'
        },
        start: {dateTime: '2018-04-09T22:00:00-04:00'},
        end: {dateTime: '2018-04-09T22:30:00-04:00'},
        iCalUID: '0csrupq3gqqof983o7spnd2ppn@google.com',
        sequence: 0,
        attendees: [{
          email: 'luke@ellipsis.ai',
          self: true,
          responseStatus: 'needsAction'
        }],
        reminders: {useDefault: true}
      }];
      expect(events.map(Formatter.formatSelfAttendanceFor)).toEqual([
        "",
        " ✔︎",
        " _(tentative)_",
        " _(declined)_",
        ""
      ]);
    });
  });
});
