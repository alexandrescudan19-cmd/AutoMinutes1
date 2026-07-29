import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 10;

@Injectable()
export class TranscriptAutoImportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TranscriptAutoImportService.name);
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly meetingsService: MeetingsService) {}

  onModuleInit() {
    // Porneste importul automat periodic. acum.
    const enabled = process.env.AUTO_IMPORT_MEET_TRANSCRIPTS !== 'false';
    if (!enabled) {
      this.logger.log('Automatic Meet transcript import is disabled.');
      return;
    }

    const intervalMs = this.getPositiveNumber(
      process.env.AUTO_IMPORT_MEET_TRANSCRIPTS_INTERVAL_MS,
      DEFAULT_INTERVAL_MS,
    );

    void this.runOnce();
    this.intervalId = setInterval(() => {
      void this.runOnce();
    }, intervalMs);

    this.logger.log(`Automatic Meet transcript import runs every ${intervalMs}ms.`);
  }

  onModuleDestroy() {
    // Opreste intervalul la inchidere. acum.
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async runOnce() {
    // Ruleaza o tura de import.
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const batchSize = this.getPositiveNumber(
        process.env.AUTO_IMPORT_MEET_TRANSCRIPTS_BATCH_SIZE,
        DEFAULT_BATCH_SIZE,
      );
      const results = await this.meetingsService.importMissingFinishedTranscripts(batchSize);
      const importedCount = results.filter((result) => result.imported).length;

      if (importedCount > 0) {
        this.logger.log(`Imported ${importedCount} Meet transcript(s).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown auto import error';
      this.logger.warn(`Automatic Meet transcript import failed: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private getPositiveNumber(raw: string | undefined, fallback: number) {
    // Citeste numere configurabile pozitive. acum.
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
