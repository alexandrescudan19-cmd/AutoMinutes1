import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { google } from 'googleapis';

interface ConferenceRecordsResponse {
  conferenceRecords?: Array<{
    name: string;
    startTime?: string;
    endTime?: string;
  }>;
}

interface TranscriptsResponse {
  transcripts?: Array<{
    name: string;
  }>;
  nextPageToken?: string;
}

interface TranscriptEntriesResponse {
  transcriptEntries?: TranscriptEntry[];
  nextPageToken?: string;
}

interface TranscriptEntry {
  participant?: string;
  text?: string;
  languageCode?: string;
  startTime?: string;
  endTime?: string;
}

interface ImportedMeetTranscript {
  conferenceRecordName: string;
  transcriptName: string;
  content: string;
  entriesCount: number;
  languageCode?: string;
}

@Injectable()
export class GoogleMeetTranscriptService {
  private readonly baseUrl = 'https://meet.googleapis.com/v2';

  async importTranscriptByMeetLink(
    meetLink: string,
    refreshToken: string,
  ): Promise<ImportedMeetTranscript> {
    const meetingCode = this.extractMeetingCode(meetLink);
    if (!meetingCode) {
      throw new NotFoundException('Nu am putut identifica meeting code din Google Meet link.');
    }

    const accessToken = await this.getAccessToken(refreshToken);
    const conferenceRecord = await this.findConferenceRecord(accessToken, meetingCode);
    const transcriptName = await this.findLatestTranscriptName(accessToken, conferenceRecord.name);
    const entries = await this.listTranscriptEntries(accessToken, transcriptName);
    const content = this.formatTranscript(entries);

    if (!content.trim()) {
      throw new NotFoundException('Transcriptul exista, dar nu are intrari disponibile inca.');
    }

    return {
      conferenceRecordName: conferenceRecord.name,
      transcriptName,
      content,
      entriesCount: entries.length,
      languageCode: entries.find((entry) => entry.languageCode)?.languageCode,
    };
  }

  private extractMeetingCode(meetLink: string): string | undefined {
    const match = meetLink.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return match?.[1].toLowerCase();
  }

  private async getAccessToken(refreshToken: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
      throw new InternalServerErrorException('Google credentials are not configured.');
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });

    const token = await auth.getAccessToken();
    if (!token.token) {
      throw new InternalServerErrorException('Google did not return an access token.');
    }

    return token.token;
  }

  private async findConferenceRecord(accessToken: string, meetingCode: string) {
    const response = await this.get<ConferenceRecordsResponse>('/conferenceRecords', accessToken, {
      pageSize: 1,
      filter: `space.meeting_code = "${meetingCode}"`,
    });

    const conferenceRecord = response.conferenceRecords?.[0];
    if (!conferenceRecord) {
      throw new NotFoundException(
        'Nu am gasit conference record pentru acest Meet. Incearca dupa ce meeting-ul s-a terminat.',
      );
    }

    return conferenceRecord;
  }

  private async findLatestTranscriptName(
    accessToken: string,
    conferenceRecordName: string,
  ): Promise<string> {
    const transcripts = await this.listAllPages<TranscriptsResponse, { name: string }>(
      `/${conferenceRecordName}/transcripts`,
      accessToken,
      'transcripts',
    );

    const latestTranscript = transcripts.at(-1);
    if (!latestTranscript) {
      throw new NotFoundException(
        'Nu am gasit transcript pentru acest Meet. Verifica daca transcription a fost pornit.',
      );
    }

    return latestTranscript.name;
  }

  private async listTranscriptEntries(
    accessToken: string,
    transcriptName: string,
  ): Promise<TranscriptEntry[]> {
    return this.listAllPages<TranscriptEntriesResponse, TranscriptEntry>(
      `/${transcriptName}/entries`,
      accessToken,
      'transcriptEntries',
    );
  }

  private async listAllPages<TResponse extends { nextPageToken?: string }, TItem>(
    path: string,
    accessToken: string,
    collectionKey: keyof TResponse,
  ): Promise<TItem[]> {
    const items: TItem[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.get<TResponse>(path, accessToken, {
        pageSize: 100,
        pageToken,
      });
      const pageItems = response[collectionKey];
      if (Array.isArray(pageItems)) {
        items.push(...(pageItems as TItem[]));
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    return items;
  }

  private formatTranscript(entries: TranscriptEntry[]): string {
    return entries
      .filter((entry) => entry.text?.trim())
      .map((entry) => {
        const time = entry.startTime
          ? new Date(entry.startTime).toLocaleTimeString('ro-RO', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '--:--';
        const speaker = entry.participant?.split('/').at(-1) ?? 'Participant';
        return `[${time}] ${speaker}: ${entry.text?.trim()}`;
      })
      .join('\n');
  }

  private async get<T>(
    path: string,
    accessToken: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    try {
      const response = await axios.get<T>(`${this.baseUrl}${path}`, {
        params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const message =
        axiosError.response?.data?.error?.message ??
        axiosError.message ??
        'Google Meet API request failed.';
      throw new BadGatewayException(message);
    }
  }
}
