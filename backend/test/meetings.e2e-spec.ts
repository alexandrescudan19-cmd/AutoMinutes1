import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { google } from 'googleapis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app/app.module';

interface MeetingResponseBody {
  id: string;
  title: string;
  googleCalendarEventId?: string;
  googleMeetLink?: string;
}

describe('MeetingsController (e2e)', () => {
  let app: INestApplication<App>;
  const createdMeetingIds: string[] = [];
  const createdCalendarEventIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    while (createdCalendarEventIds.length > 0) {
      const eventId = createdCalendarEventIds.pop();

      await deleteCalendarEvent(eventId);
    }

    while (createdMeetingIds.length > 0) {
      const meetingId = createdMeetingIds.pop();

      await request(app.getHttpServer()).delete(`/meetings/${meetingId}`);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and updates a meeting without Google Calendar', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/meetings')
      .send({
        ownerId: '65f1a6a6f2c2a7b4f0e7a111',
        title: 'AutoMinutes Endpoint Test No Google',
        description: 'Endpoint test fara Google Calendar.',
        startDateTime: '2026-07-22T10:00:00.000Z',
        endDateTime: '2026-07-22T11:00:00.000Z',
        createGoogleCalendarEvent: false,
      })
      .expect(201);

    const createdMeeting = createResponse.body as MeetingResponseBody;

    createdMeetingIds.push(createdMeeting.id);

    expect(createdMeeting.googleCalendarEventId).toBeUndefined();
    expect(createdMeeting.googleMeetLink).toBeUndefined();

    await request(app.getHttpServer())
      .get(`/meetings/${createdMeeting.id}`)
      .expect(200)
      .expect(({ body }) => {
        const meeting = body as MeetingResponseBody;
        expect(meeting.id).toBe(createdMeeting.id);
      });

    await request(app.getHttpServer())
      .patch(`/meetings/${createdMeeting.id}`)
      .send({ title: 'AutoMinutes Endpoint Test Updated' })
      .expect(200)
      .expect(({ body }) => {
        const meeting = body as MeetingResponseBody;
        expect(meeting.title).toBe('AutoMinutes Endpoint Test Updated');
      });
  });

  it('creates a meeting with a Google Calendar event and Meet link', async () => {
    const createResponse = await request(app.getHttpServer()).post('/meetings').send({
      ownerId: '65f1a6a6f2c2a7b4f0e7a111',
      title: 'AutoMinutes Endpoint Test Google Meet',
      description: 'Endpoint test cu Google Calendar si Meet link.',
      startDateTime: '2026-07-23T10:00:00.000Z',
      endDateTime: '2026-07-23T11:00:00.000Z',
      createGoogleCalendarEvent: true,
    });

    if (createResponse.status !== 201) {
      throw new Error(JSON.stringify(createResponse.body));
    }

    const createdMeeting = createResponse.body as MeetingResponseBody;

    createdMeetingIds.push(createdMeeting.id);
    createdCalendarEventIds.push(createdMeeting.googleCalendarEventId);

    expect(createdMeeting.googleCalendarEventId).toEqual(expect.any(String));
    expect(createdMeeting.googleMeetLink).toEqual(
      expect.stringMatching(/^https:\/\/meet\.google\.com\//),
    );
  });
});

async function deleteCalendarEvent(eventId?: string): Promise<void> {
  if (!eventId) {
    return;
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL,
  );

  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
    eventId,
  });
}
