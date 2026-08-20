# Mail — Queued by Default

Two ways out of the process, and the default is the queue.

## Location

- Inline sender: `src/libs/mailer/services/mail.service.ts` — `EmailService.sendEmail(options)`
- Domain producer: `src/libs/mailer/services/auth-mail.service.ts` — `AuthMailService`
- Transport: `src/libs/mailer/transport.ts` (nodemailer, built from `MailConfig`)
- Templates: `src/libs/mailer/templates/<area>/<name>.html`
- Queue: `sendEmailQueue` from `@bull` (`src/bull/queue/send-mail-queue.ts`), consumed by `src/bull/worker/send-mail-worker.ts`
- Payload type: `EmailOptions` in `src/libs/types/libs/mailer.ts`

Enqueueing and sending inline take the **same** `EmailOptions` object, so the two paths differ only in who calls `sendEmail`.

## Rules

1. **Enqueue by default.**
   ```ts
   await sendEmailQueue.add("send-email", {
   	subject: t("mail.subject.verification"),
   	to: user.email,
   	template: "auth/email-verification",
   	lang,
   	variables: {
   		user_name: user.name,
   		verification_url: `${AppConfig.CLIENT_URL}/auth/verify-email?token=${token}`,
   	},
   });
   ```
   The request returns immediately; the worker calls `EmailService.sendEmail`. Every producer in the tree does this.
2. **`EmailService.sendEmail` inline only when the mail must land inside the request.** It opens the SMTP connection and blocks. If you use it, say why in a comment above the call.
3. **`AuthMailService` is a plain object, like every other service** (see [services.md](./services.md)) — `AuthMailService.sendVerificationEmail(userId)`, no `new`. Note this differs from the sibling `clean-elysia`, where the same service is a class; do not copy a `new AuthMailService()` call in from there.
4. **Its two methods are `sendVerificationEmail(userId)` and `sendResetPasswordEmail(userId)`.** Neither takes a `tx`. Each one: looks the user up through `UserRepository().findOne(id)` and throws `NotFoundError` if absent, deletes any prior token for that user, creates a fresh one with a `TOKEN_TTL_MS` (one hour) expiry, enqueues, then logs. A new mail flow belongs in a sibling `<area>-mail.service.ts` — not inline in a module service.
5. **`template` is the extensionless path under the templates directory** — `"auth/email-verification"`, `"auth/forgot-password"`.
6. **This is not Handlebars.** `sendEmail` reads the file and does a literal regex replace of `{{key}}` for each entry of `options.variables`, which is a flat `Record<string, string>`. No helpers, no conditionals, no loops, no nested paths. Logic belongs in the producer; format dates and numbers to strings before putting them in.
7. **Localisation is by filename.** `resolveTemplatePath` looks for `<name>.<locale>.html` and falls back to `<name>.html`, and it only looks when `options.lang` differs from `DEFAULT_LOCALE`. So `auth/email-verification.html` **is** the English template and there is no `.en.html`. Add a template, add its `.id.html` in the same change (`auth/email-verification.id.html` and `auth/forgot-password.id.html` are the models) with an identical `{{...}}` placeholder set.
8. **Producers pass `lang: getCurrentLocale()`.** The worker runs outside the request's async context, so the locale must travel in the payload — see [i18n.md](./i18n.md). Subjects come from the `mail.subject.*` catalog keys.
9. **Don't prefix the subject yourself.** `sendEmail` prepends `[<APP_ENV>]` when `AppConfig.APP_ENV !== "production"`. Doing it again ships `[STAGING] [STAGING] ...`.
10. **Front-end links come from `AppConfig.CLIENT_URL`.** There is no `FRONTEND_URL` in this codebase — that is the NestJS sibling's name. Read config only through `@config`, never `process.env`.
11. **Never log a token, a verification URL, or a reset URL.** The existing calls log `{ userId, email, lang }` and nothing more. Keep it that way — mail logs end up in aggregation systems that are not as private as the inbox.
12. **The worker re-throws on failure** so BullMQ retries. Don't swallow the error to make a red job disappear; see [queue.md](./queue.md).
