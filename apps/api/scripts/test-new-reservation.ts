import 'dotenv/config';
import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error('REDIS_URL is not set');
  process.exit(1);
}

const LISTING_ID = process.argv[2];
if (!LISTING_ID) {
  console.error('Usage: npx tsx scripts/test-new-reservation.ts <listingId>');
  process.exit(1);
}

const queue = new Queue('new-reservation', {
  connection: { url: REDIS_URL },
});

await queue.add('test', {
  reservationId: 'test-reservation-id',
  listingId: LISTING_ID,
  calendarLinkId: 'test-calendar-link-id',
  icalUid: 'test-ical-uid',
  summary: 'John Smith',
  startDate: '2026-03-15T00:00:00.000Z',
  endDate: '2026-03-20T00:00:00.000Z',
});

console.log(`Job enqueued for listing ${LISTING_ID}`);
await queue.close();
