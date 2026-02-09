import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface UpdatedReservationEmailProps {
  listingNickname: string;
  summary: string;
  startDate: string;
  endDate: string;
}

export default function UpdatedReservationEmail({
  listingNickname,
  summary,
  startDate,
  endDate,
}: UpdatedReservationEmailProps) {
  const previewText = `Updated reservation at ${listingNickname}`;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Updated reservation
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              A reservation has been updated at{' '}
              <strong>{listingNickname}</strong>.
            </Text>
            <Section className="mt-[16px] mb-[32px]">
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Guest:</strong> {summary}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Check-in:</strong> {startDate}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Check-out:</strong> {endDate}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
