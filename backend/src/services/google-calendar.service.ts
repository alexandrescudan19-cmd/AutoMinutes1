import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';

interface CreateCalendarEventInput {
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
}

interface CalendarEventResult {
  eventId: string;
  meetLink?: string;
}

@Injectable()
export class GoogleCalendarService {
  async createEvent(
    input: CreateCalendarEventInput,
    refreshToken: string,
  ): Promise<CalendarEventResult> {
    const calendar = this.createCalendarClient(refreshToken);
    const requestId = `autominutes-${Date.now()}`;

    let data;

    try {
      const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: input.title,
          description: input.description,
          start: {
            dateTime: input.startDateTime.toISOString(),
          },
          end: {
            dateTime: input.endDateTime.toISOString(),
          },
          attendees: input.attendees?.map((attendee) => ({
            email: attendee.email,
            displayName: attendee.name,
          })),
          conferenceData: {
            createRequest: {
              requestId,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        },
      });

      data = response.data;
    } catch (error) {
      const message = this.getGoogleErrorMessage(error) ?? 'Google Calendar request failed.';

      throw new BadGatewayException(message);
    }

    if (!data.id) {
      throw new InternalServerErrorException('Google Calendar did not return an event ID.');
    }

    return {
      eventId: data.id,
      meetLink: data.hangoutLink ?? undefined,
    };
  }

  async addAttendees(
    eventId: string,
    attendees: CreateCalendarEventInput['attendees'],
    refreshToken: string,
  ) {
    if (!attendees?.length) {
      return;
    }

    const calendar = this.createCalendarClient(refreshToken);

    try {
      const currentEvent = await calendar.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
        eventId,
      });
      const existingAttendees = currentEvent.data.attendees ?? [];
      const existingEmails = new Set(
        existingAttendees.map((attendee) => attendee.email?.toLowerCase().trim()).filter(Boolean),
      );
      const newAttendees = attendees
        .filter((attendee) => !existingEmails.has(attendee.email.toLowerCase().trim()))
        .map((attendee) => ({
          email: attendee.email,
          displayName: attendee.name,
        }));

      if (newAttendees.length === 0) {
        return;
      }

      await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
        eventId,
        sendUpdates: 'all',
        requestBody: {
          attendees: [...existingAttendees, ...newAttendees],
        },
      });
    } catch (error) {
      const message = this.getGoogleErrorMessage(error) ?? 'Google Calendar request failed.';

      throw new BadGatewayException(message);
    }
  }

  private createCalendarClient(refreshToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
      throw new InternalServerErrorException('Google Calendar credentials are not configured.');
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });

    return google.calendar({ version: 'v3', auth });
  }

  private getGoogleErrorMessage(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const maybeError = error as {
      message?: string;
      response?: { data?: { error?: { message?: string } } };
      cause?: { message?: string };
    };

    return (
      maybeError.response?.data?.error?.message ?? maybeError.cause?.message ?? maybeError.message
    );
  }
}
