import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { google } from 'googleapis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app/app.module';
import { UsersRepository } from '../src/repositories/users.repository';
import { EncryptionService } from '../src/services/encryption.service';

interface MeetingResponseBody {
  id: string;
  title: string;
  googleCalendarEventId?: string;
  googleMeetLink?: string;
}

interface AttendeeResponseBody {
  id: string;
  name: string;
  email: string;
  roleInMeeting: string;
  attendanceStatus: string;
}

interface LoginResponseBody {
  accessToken: string;
}

interface AddAttendeesResponseBody {
  attendees: AttendeeResponseBody[];
}

describe('MeetingsController (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: UsersRepository;
  let encryptionService: EncryptionService;
  let accessToken: string;
  let ownerId: string;
  const createdMeetingIds: string[] = [];
  const createdCalendarEventIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    usersRepository = moduleFixture.get<UsersRepository>(UsersRepository);
    encryptionService = moduleFixture.get<EncryptionService>(EncryptionService);
    const email = `meetings.e2e.${Date.now()}@example.com`;
    const password = 'EndpointTest123!';
    const user = await usersRepository.create({
      firstName: 'Meetings',
      lastName: 'E2E',
      email,
      passwordHash: await bcrypt.hash(password, 10),
      isVerified: true,
      verificationToken: null,
      googleRefreshTokenEncrypted: encryptionService.encrypt(
        process.env.GOOGLE_REFRESH_TOKEN ?? '',
      ),
    });

    ownerId = user.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    accessToken = (loginResponse.body as LoginResponseBody).accessToken;
  });

  afterEach(async () => {
    while (createdCalendarEventIds.length > 0) {
      const eventId = createdCalendarEventIds.pop();

      await deleteCalendarEvent(eventId);
    }

    while (createdMeetingIds.length > 0) {
      const meetingId = createdMeetingIds.pop();

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${accessToken}`);
    }
  });

  afterAll(async () => {
    if (ownerId) {
      await usersRepository.remove(ownerId);
    }

    await app.close();
  });

  it('creates and updates a meeting without Google Calendar', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ownerId,
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
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        const meeting = body as MeetingResponseBody;
        expect(meeting.id).toBe(createdMeeting.id);
      });

    await request(app.getHttpServer())
      .patch(`/meetings/${createdMeeting.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'AutoMinutes Endpoint Test Updated' })
      .expect(200)
      .expect(({ body }) => {
        const meeting = body as MeetingResponseBody;
        expect(meeting.title).toBe('AutoMinutes Endpoint Test Updated');
      });
  });

  it('manages attendees for an existing meeting', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ownerId,
        title: 'AutoMinutes Endpoint Test Attendees',
        description: 'Endpoint test pentru participanti.',
        startDateTime: '2026-07-24T10:00:00.000Z',
        endDateTime: '2026-07-24T11:00:00.000Z',
        createGoogleCalendarEvent: false,
        participants: [
          {
            name: 'Ana Pop',
            email: 'ana.pop@example.com',
            roleInMeeting: 'QA',
          },
        ],
      })
      .expect(201);

    const createdMeeting = createResponse.body as MeetingResponseBody;
    createdMeetingIds.push(createdMeeting.id);

    const initialAttendeesResponse = await request(app.getHttpServer())
      .get(`/meetings/${createdMeeting.id}/attendees`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const initialAttendees = initialAttendeesResponse.body as AttendeeResponseBody[];
    expect(initialAttendees).toHaveLength(1);
    expect(initialAttendees[0].email).toBe('ana.pop@example.com');

    await request(app.getHttpServer())
      .post(`/meetings/${createdMeeting.id}/attendees`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        participants: [
          {
            name: 'Mihai Test',
            email: 'mihai.test@example.com',
            roleInMeeting: 'Backend',
          },
        ],
      })
      .expect(201)
      .expect(({ body }) => {
        const addAttendeesResponse = body as AddAttendeesResponseBody;
        expect(addAttendeesResponse.attendees).toHaveLength(1);
        expect(addAttendeesResponse.attendees[0].email).toBe('mihai.test@example.com');
      });

    const attendeesResponse = await request(app.getHttpServer())
      .get(`/meetings/${createdMeeting.id}/attendees`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const attendees = attendeesResponse.body as AttendeeResponseBody[];
    const attendeeToUpdate = attendees.find(
      (attendee) => attendee.email === 'mihai.test@example.com',
    );
    expect(attendeeToUpdate).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/meetings/${createdMeeting.id}/attendees/${attendeeToUpdate?.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Mihai Updated',
        roleInMeeting: 'Tech Lead',
        attendanceStatus: 'Acceptat',
      })
      .expect(200)
      .expect(({ body }) => {
        const attendee = body as AttendeeResponseBody;
        expect(attendee.name).toBe('Mihai Updated');
        expect(attendee.roleInMeeting).toBe('Tech Lead');
        expect(attendee.attendanceStatus).toBe('Acceptat');
      });

    await request(app.getHttpServer())
      .delete(`/meetings/${createdMeeting.id}/attendees/${attendeeToUpdate?.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/meetings/${createdMeeting.id}/attendees`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        const remainingAttendees = body as AttendeeResponseBody[];
        expect(remainingAttendees.some((attendee) => attendee.id === attendeeToUpdate?.id)).toBe(
          false,
        );
      });
  });

  it('creates a meeting with a Google Calendar event and Meet link', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ownerId,
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
