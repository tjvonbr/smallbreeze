import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface TeamInviteEmailProps {
  invitedByFirstName: string;
  invitedByLastName: string;
  invitedByEmail: string;
  teamName: string;
  inviteLink: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
}

export default function TeamInviteEmail({
  invitedByFirstName,
  invitedByLastName,
  teamName,
  inviteLink,
  appStoreUrl,
  playStoreUrl,
}: TeamInviteEmailProps) {
  const invitedByFullName = `${invitedByFirstName} ${invitedByLastName}`;
  const previewText = `Join ${invitedByFullName} on smallbreeze!`;
  const hasAppLinks = appStoreUrl || playStoreUrl;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Join <strong>{teamName}</strong> on <strong>smallbreeze</strong>
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              Hey there!
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              <strong>{invitedByFullName}</strong> has invited you to the{' '}
              <strong>{teamName}</strong> team on <strong>smallbreeze</strong>!
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={inviteLink}
              >
                Join the team
              </Button>
            </Section>
            <Text className="text-[14px] text-black leading-[24px]">
              or copy and paste this URL into your browser:{' '}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>

            {hasAppLinks && (
              <>
                <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
                <Text className="text-[14px] text-black leading-[24px]">
                  <strong>Get the mobile app</strong>
                </Text>
                <Text className="text-[14px] text-[#666666] leading-[24px]">
                  For the best experience, download the smallbreeze app on your phone.
                  Manage your properties, view calendars, and stay connected with your team on the go.
                </Text>
                <Section className="mt-[16px] text-center">
                  {appStoreUrl && (
                    <Link
                      href={appStoreUrl}
                      className="mr-[12px] text-[14px] text-blue-600 no-underline"
                    >
                      Download on the App Store
                    </Link>
                  )}
                  {appStoreUrl && playStoreUrl && (
                    <span className="text-[14px] text-[#666666]"> | </span>
                  )}
                  {playStoreUrl && (
                    <Link
                      href={playStoreUrl}
                      className="text-[14px] text-blue-600 no-underline"
                    >
                      Get it on Google Play
                    </Link>
                  )}
                </Section>
              </>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
