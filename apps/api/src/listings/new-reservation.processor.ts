import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface NewReservationJobData {
  reservationId: string;
  listingId: string;
  calendarLinkId: string;
  icalUid: string;
  summary: string | null;
  startDate: string;
  endDate: string;
}

@Processor('new-reservation')
export class NewReservationProcessor extends WorkerHost {
  private readonly logger = new Logger(NewReservationProcessor.name);

  async process(job: Job<NewReservationJobData>): Promise<void> {
    this.logger.log(
      `Processing new reservation: ${JSON.stringify(job.data)}`,
    );
  }
}
