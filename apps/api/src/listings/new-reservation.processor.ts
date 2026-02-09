import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { getResend } from '../lib/resend.js';
import NewReservationEmail from '../lib/emails/new-reservation.js';

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

    const { listingId, summary, startDate, endDate } = job.data;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        team: {
          include: {
            memberships: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!listing) {
      this.logger.warn(`Listing ${listingId} not found, skipping email`);
      return;
    }

    const resend = getResend();
    if (!resend) {
      this.logger.warn('Resend not configured, skipping email');
      return;
    }

    const formattedStart = new Date(startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedEnd = new Date(endDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emails = listing.team.memberships.map((m) => m.user.email);

    for (const email of emails) {
      try {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: email,
          subject: `New reservation at ${listing.nickname}`,
          react: NewReservationEmail({
            listingNickname: listing.nickname,
            summary: summary || 'Guest',
            startDate: formattedStart,
            endDate: formattedEnd,
          }),
        });
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}`, error);
      }
    }
  }
}
