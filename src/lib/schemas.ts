import { z } from 'zod';

export const OnboardingSchema = z.object({
  displayName: z.string().min(3, { message: "Display name must be at least 3 characters." }).max(20, { message: "Display name must be at most 20 characters." }),
  phoneNumber: z.string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .max(15, { message: "Phone number must not exceed 15 digits." })
    .regex(/^\+?[0-9]+$/, { message: "Phone number can only contain numbers and an optional leading + symbol." })
});

export type OnboardingFormData = z.infer<typeof OnboardingSchema>;

const uuidV4Regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export const AcceptInviteSchema = z.object({
  inviteLink: z.string().superRefine((val, ctx) => {
    const prefix = "peerlink://invite/";
    if (!val.startsWith(prefix)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid invite link format. Must start with peerlink://invite/",
      });
      return z.NEVER;
    }
    const potentialUuid = val.substring(prefix.length);
    if (!uuidV4Regex.test(potentialUuid)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid invite link format. Contains an invalid user ID.",
      });
      return z.NEVER;
    }
  }),
});

export type AcceptInviteFormData = z.infer<typeof AcceptInviteSchema>;

export const MessageSchema = z.object({
  text: z.string().min(1, { message: "Message or file attachment cannot be empty." }).max(1000, { message: "Message too long."})
});

export type MessageFormData = z.infer<typeof MessageSchema>;

export const RenamePairedUserSchema = z.object({
  localDisplayName: z.string().min(1, "Name cannot be empty.").max(30, "Name must be at most 30 characters."),
});
export type RenamePairedUserFormData = z.infer<typeof RenamePairedUserSchema>;
