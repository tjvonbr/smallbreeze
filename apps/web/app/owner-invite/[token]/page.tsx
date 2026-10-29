import { Metadata } from "next";
import { Icons } from "@/components/icons";
import { OwnerInviteForm } from "@/components/owner-invite-form";

export const metadata: Metadata = {
  title: "Property updates",
  description: "Choose how you'd like to receive property updates",
};

export default async function OwnerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center py-10">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 px-4 sm:w-[380px]">
        <Icons.logo className="mx-auto h-6 w-6" />
        <OwnerInviteForm token={token} />
      </div>
    </div>
  );
}
