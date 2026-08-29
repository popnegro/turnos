/**
 * Client-Side Google Calendar API Service
 * Interacts directly with https://www.googleapis.com/calendar/v3/
 */

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  timeZone?: string;
}

export interface GoogleEventResource {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string; // ISO 8601 string
    timeZone?: string;
  };
  end: {
    dateTime: string; // ISO 8601 string
    timeZone?: string;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
  htmlLink?: string;
}

export const listUserCalendars = async (accessToken: string): Promise<GoogleCalendarItem[]> => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al obtener calendarios: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
};

export const listGoogleEvents = async (
  accessToken: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string
): Promise<GoogleEventResource[]> => {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });

  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al listar eventos de Google Calendar: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
};

export const createGoogleEvent = async (
  accessToken: string,
  calendarId: string = 'primary',
  event: {
    summary: string;
    description?: string;
    location?: string;
    startIso: string;
    endIso: string;
    patientEmail?: string;
    patientName?: string;
    timeZone?: string;
  }
): Promise<GoogleEventResource> => {
  const eventPayload: any = {
    summary: event.summary,
    description: event.description,
    location: event.location || 'AkiNeuro - Av. Santa Fe 3200, Piso 4, CABA',
    start: {
      dateTime: event.startIso,
      timeZone: event.timeZone || 'America/Argentina/Buenos_Aires'
    },
    end: {
      dateTime: event.endIso,
      timeZone: event.timeZone || 'America/Argentina/Buenos_Aires'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 24 * 60 }
      ]
    }
  };

  if (event.patientEmail) {
    eventPayload.attendees = [
      { email: event.patientEmail, displayName: event.patientName }
    ];
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(eventPayload)
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al crear evento en Google Calendar: ${response.statusText}`);
  }

  return await response.json();
};

export const deleteGoogleEvent = async (
  accessToken: string,
  calendarId: string = 'primary',
  eventId: string
): Promise<void> => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al eliminar evento en Google Calendar: ${response.statusText}`);
  }
};

/**
 * Syncs real events loaded from Google Calendar with backend availability store
 */
export const syncLiveGoogleEventsToBackend = async (
  professionalId: string,
  calendarEmail: string,
  events: any[]
) => {
  const formattedEvents = events.map((ev) => ({
    id: ev.id || `gcal-ev-${Math.random().toString(36).substring(2, 8)}`,
    calendarEmail,
    title: ev.summary || ev.title || 'Evento Google Calendar',
    start: ev.start?.dateTime || ev.start?.date || ev.start,
    end: ev.end?.dateTime || ev.end?.date || ev.end
  }));

  const response = await fetch('/api/google-calendar/sync-live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professionalId, calendarEmail, events: formattedEvents })
  });

  return await response.json();
};
