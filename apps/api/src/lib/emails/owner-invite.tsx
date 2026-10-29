import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface OwnerInviteEmailProps {
  ownerFirstName: string;
  invitedByName: string;
  teamName: string;
  listingNickname: string;
  inviteLink: string;
}

export default function OwnerInviteEmail({
  ownerFirstName,
  invitedByName,
  teamName,
  listingNickname,
  inviteLink,
}: OwnerInviteEmailProps) {
  const previewText = `${teamName} will keep you updated on ${listingNickname}`;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Stay up to date on <strong>{listingNickname}</strong>
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              Hi {ownerFirstName},
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              <strong>{invitedByName}</strong> from <strong>{teamName}</strong> would like to
              send you updates when <strong>{listingNickname}</strong> is being cleaned, including
              when the cleaner is on their way and photos once the clean is finished.
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              Choose how you'd like to be notified:
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={inviteLink}
              >
                Set up notifications
              </Button>
            </Section>
            <Text className="text-[14px] text-black leading-[24px]">
              or copy and paste this URL into your browser:{' '}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Text className="text-[12px] text-[#666666] leading-[20px]">
              This link expires in 7 days. If you weren't expecting this, you can ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
