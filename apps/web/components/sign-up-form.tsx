"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Icons } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Form } from "./ui/form";
import { toast } from "sonner";
import { signUpSchema } from "@/lib/validations";
import authClient from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

type FormData = z.infer<typeof signUpSchema>;

export default function SignUpForm({ className, ...props }: UserAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("inviteId");
  const invitedEmail = searchParams.get("email");
  const isInvite = Boolean(inviteId);
  const form = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
  });

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [step, setStep] = React.useState<number>(1);

  React.useEffect(() => {
    if (invitedEmail) {
      form.setValue("email", invitedEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitedEmail]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const teamNameForCallback = data.teamName && data.teamName.trim().length > 0
        ? data.teamName
        : `${data.firstName} ${data.lastName}'s Team`;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const callbackURL = isInvite && inviteId
        ? `${origin}/api/accept-invite?inviteId=${encodeURIComponent(inviteId)}`
        : `${origin}/api/bootstrap-team?teamName=${encodeURIComponent(teamNameForCallback)}`;

      const { error } = await authClient.signUp.email({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        callbackURL,
        firstName: data.firstName,
        lastName: data.lastName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, {
        onSuccess: () => router.push("/verify-email")
      })

      setIsLoading(false);

      if (error) {
        return toast.error("Something went wrong.", {
          description: error.message || "Your sign up request failed. Please try again.",
        });
      }

      return toast.success("Account created!", {
        description: "Welcome! You can now sign in.",
      });
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      return toast.error("Something went wrong.", {
        description: error instanceof Error ? error.message : "Your sign up request failed. Please try again.",
      });
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {step === 1 ? (
            <div className="grid gap-2">
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="" htmlFor="firstName">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      autoCapitalize="none"
                      autoComplete="given-name"
                      autoCorrect="off"
                      disabled={isLoading}
                      {...form.register("firstName")}
                    />
                    {form.formState.errors?.firstName && (
                      <p className="px-1 text-xs text-red-600">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label className="" htmlFor="lastName">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      autoCapitalize="none"
                      autoComplete="family-name"
                      autoCorrect="off"
                      disabled={isLoading}
                      {...form.register("lastName")}
                    />
                    {form.formState.errors?.lastName && (
                      <p className="px-1 text-xs text-red-600">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading || !!invitedEmail}
                    {...form.register("email")}
                  />
                  {form.formState.errors?.email && (
                    <p className="px-1 text-xs text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect="off"
                    disabled={isLoading}
                    {...form.register("password")}
                  />
                  {form.formState.errors?.password && (
                    <p className="px-1 text-xs text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>
              {isInvite ? (
                <button
                  type="submit"
                  className={cn(buttonVariants(), "hover:cursor-pointer")}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create account
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(buttonVariants(), "hover:cursor-pointer")}
                  disabled={isLoading}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const ok = await form.trigger(["firstName", "lastName", "email", "password"])
                    if (ok) setStep(2)
                  }}
                >
                  Continue
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label htmlFor="teamName">Team name</Label>
                <Input
                  id="teamName"
                  defaultValue={`${form.watch("firstName")} ${form.watch("lastName")}'s Team`}
                  type="text"
                  autoCapitalize="none"
                  autoComplete="organization"
                  autoCorrect="off"
                  disabled={isLoading}
                  {...form.register("teamName")}
                />
                {form.formState.errors?.teamName && (
                  <p className="px-1 text-xs text-red-600">
                    {form.formState.errors.teamName.message}
                  </p>
                )}
              </div>
              
              <button type="submit" className={cn(buttonVariants(), "hover:cursor-pointer")} disabled={isLoading}>
                {isLoading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create account
              </button>
              <div className="grid gap-1 mt-4">
                <p className="px-8 text-center text-sm text-muted-foreground">
                  By clicking continue, you agree to our{" "}
                  <Link
                    href="/terms"
                    className="hover:text-brand underline underline-offset-4"
                  >
                    Terms of Service
                  </Link>{" "}
                    and{" "}
                  <Link
                    href="/privacy"
                    className="hover:text-brand underline underline-offset-4"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
