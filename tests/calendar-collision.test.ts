import { describe, it, expect } from 'vitest';
import { CalendarCollisionDetector } from '../src/core/bookingEngine';
import { CalendarEvent } from '../src/types';

describe('Google Calendar Race Condition & Collision Detection Suite', () => {
  const profCalendarEmail = 'maria.gonzalez.kine@gmail.com';
  const targetIsoStart = '2026-11-25T10:30:00';
  const targetIsoEnd = '2026-11-25T11:00:00';

  it('detects no collision when calendar is free of overlapping events', () => {
    const existingEvents: CalendarEvent[] = [
      {
        id: 'ev-1',
        calendarId: profCalendarEmail,
        title: 'Turno Mañana',
        start: '2026-11-25T09:00:00',
        end: '2026-11-25T09:30:00',
        createdVia: 'booking'
      },
      {
        id: 'ev-2',
        calendarId: profCalendarEmail,
        title: 'Turno Tarde',
        start: '2026-11-25T11:30:00',
        end: '2026-11-25T12:00:00',
        createdVia: 'booking'
      }
    ];

    const result = CalendarCollisionDetector.checkCollision(
      existingEvents,
      profCalendarEmail,
      targetIsoStart,
      targetIsoEnd
    );

    expect(result.hasCollision).toBe(false);
    expect(result.conflictingEvent).toBeUndefined();
  });

  it('detects external event created directly in Google Calendar and prevents hold creation', () => {
    const externalEvent: CalendarEvent = {
      id: 'ev-external-gcal-999',
      calendarId: profCalendarEmail,
      title: 'Reunión Médica Externa en Google Calendar',
      start: '2026-11-25T10:15:00', // Overlaps with 10:30 - 11:00
      end: '2026-11-25T10:45:00',
      createdVia: 'external'
    };

    const existingEvents: CalendarEvent[] = [externalEvent];

    const result = CalendarCollisionDetector.checkCollision(
      existingEvents,
      profCalendarEmail,
      targetIsoStart,
      targetIsoEnd
    );

    expect(result.hasCollision).toBe(true);
    expect(result.conflictingEvent?.id).toBe('ev-external-gcal-999');
  });

  it('ignores events from other professional calendars without causing false collisions', () => {
    const otherProfEvent: CalendarEvent = {
      id: 'ev-other-prof',
      calendarId: 'lucas.benitez.neuro@gmail.com', // Different calendar
      title: 'Turno Lic. Benítez',
      start: targetIsoStart,
      end: targetIsoEnd,
      createdVia: 'booking'
    };

    const result = CalendarCollisionDetector.checkCollision(
      [otherProfEvent],
      profCalendarEmail,
      targetIsoStart,
      targetIsoEnd
    );

    expect(result.hasCollision).toBe(false);
  });
});
