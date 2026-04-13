import React, { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { authService } from "../services/authService";
import { getErrorMessage } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { LoadingButton } from "../components/LoadingButton";
import { OTPInput } from "../components/OTPInput";
import { buildDesktopOAuthUrl } from "../utils/google";

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1E293B_0,#0F172A_45%,#020617_100%)] px-6 py-16">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="hidden rounded-[32px] border border-brand-800 bg-brand-900/80 p-10 shadow-panel lg:block">
          <div className="max-w-lg">
            <p className="inline-flex rounded-full bg-brand-accent/15 px-3 py-1 text-sm text-brand-accent">Onnonn Desktop</p>
            <h1 className="mt-8 text-5xl font-semibold leading-tight text-brand-text">Native meetings, recordings, AI notes, and teamwork in one place.</h1>
            <p className="mt-6 text-lg text-brand-muted">Join secure meetings instantly, manage everything from your desktop, and keep your session available across app restarts.</p>
          </div>
        </div>
        <div className="panel mx-auto w-full max-w-xl p-8">
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-brand-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block space-y-2">
      <span className="field-label">{label}</span>
      {children}
      {error ? <p className="form-error">{error}</p> : null}
    </label>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuthStore();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [formError, setFormError] = useState("");
  const schema = useMemo(() => z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }), []);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  if (auth.status === "authenticated") {
    return <Navigate to="/app/home" replace />;
  }

  return (
    <AuthShell title="Sign in" subtitle="Use your Onnonn account to access meetings, recordings, and collaboration tools.">
      <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => {
        setFormError("");
        try {
          await auth.login(values);
          navigate("/app/home", { replace: true });
        } catch (error) {
          setFormError(getErrorMessage(error));
        }
      })}>
        <Field label="Email address" error={form.formState.errors.email?.message}>
          <input className="field" type="email" placeholder="you@example.com" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <input className="field" type="password" placeholder="Enter your password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        {formError ? <p className="form-error">{formError}</p> : null}
        <LoadingButton loading={form.formState.isSubmitting} type="submit" className="btn-primary w-full">Sign in</LoadingButton>
      </form>
      <button className="btn-secondary mt-4 w-full" disabled={loadingGoogle} onClick={async () => {
        setLoadingGoogle(true);
        try {
          const url = await authService.getGoogleUrl();
          await window.electronAPI.openExternal(buildDesktopOAuthUrl(url, "login"));
          toast.success("Google sign-in opened in your browser.");
        } catch (error) {
          setFormError(getErrorMessage(error));
        } finally {
          setLoadingGoogle(false);
        }
      }}>Sign in with Google</button>
      <div className="mt-6 flex justify-between text-sm text-brand-muted">
        <Link to="/forgot-password" className="text-brand-accent">Forgot password?</Link>
        <Link to="/register" className="text-brand-accent">Create account</Link>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const schema = useMemo(() => z.object({
    displayName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8)
  }), []);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { displayName: "", email: "", password: "" } });

  return (
    <AuthShell title="Create account" subtitle="Start with your Onnonn desktop workspace and verify your email to continue.">
      <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => {
        setFormError("");
        try {
          const user = await authService.register(values);
          navigate("/verify-email", { state: { email: user.email || values.email } });
        } catch (error) {
          setFormError(getErrorMessage(error));
        }
      })}>
        <Field label="Display name" error={form.formState.errors.displayName?.message}>
          <input className="field" placeholder="Jane Doe" autoComplete="name" {...form.register("displayName")} />
        </Field>
        <Field label="Email address" error={form.formState.errors.email?.message}>
          <input className="field" type="email" placeholder="you@example.com" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <input className="field" type="password" placeholder="Choose a strong password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        {formError ? <p className="form-error">{formError}</p> : null}
        <LoadingButton loading={form.formState.isSubmitting} type="submit" className="btn-primary w-full">Register</LoadingButton>
      </form>
      <p className="mt-6 text-sm text-brand-muted">Already registered? <Link to="/login" className="text-brand-accent">Sign in</Link></p>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthStore();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [formError, setFormError] = useState("");
  const email = location.state?.email || auth.user?.email || "";

  React.useEffect(() => {
    if (!cooldown) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return (
    <AuthShell title="Verify email" subtitle={`Enter the 6-digit code sent to ${email || "your inbox"}.`}>
      <div className="space-y-6">
        <OTPInput value={code} onChange={setCode} />
        {formError ? <p className="form-error">{formError}</p> : null}
        <LoadingButton className="btn-primary w-full" onClick={async () => {
          setFormError("");
          try {
            const user = await authService.verifyEmail({ email, code });
            await window.electronAPI.setSession({ ...(await window.electronAPI.getSession()), user });
            toast.success("Email verified.");
            navigate("/login", { replace: true });
          } catch (error) {
            setFormError(getErrorMessage(error));
          }
        }}>Verify</LoadingButton>
        <button className="btn-secondary w-full" disabled={cooldown > 0} onClick={async () => {
          setFormError("");
          try {
            await authService.resendVerification(email);
            setCooldown(60);
            toast.success("Verification code sent.");
          } catch (error) {
            setFormError(getErrorMessage(error));
          }
        }}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button>
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState("");
  const schema = useMemo(() => z.object({
    email: z.string().email(),
    newPassword: z.string().min(8).optional()
  }), []);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", newPassword: "" } });

  return (
    <AuthShell title="Reset password" subtitle="Request a one-time passcode and choose a new password.">
      <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => {
        setFormError("");
        try {
          if (!sent) {
            await authService.forgotPassword(values.email);
            setSent(true);
            toast.success("Password reset code sent.");
            return;
          }
          await authService.resetPassword({ email: values.email, code, newPassword: values.newPassword });
          toast.success("Password updated.");
          navigate("/login", { replace: true });
        } catch (error) {
          setFormError(getErrorMessage(error));
        }
      })}>
        <Field label="Email address" error={form.formState.errors.email?.message}>
          <input className="field" type="email" placeholder="you@example.com" autoComplete="email" {...form.register("email")} />
        </Field>
        {sent && (
          <>
            <Field label="Reset code">
              <OTPInput value={code} onChange={setCode} />
            </Field>
            <Field label="New password" error={form.formState.errors.newPassword?.message}>
              <input className="field" type="password" placeholder="Choose a new password" autoComplete="new-password" {...form.register("newPassword")} />
            </Field>
          </>
        )}
        {formError ? <p className="form-error">{formError}</p> : null}
        <LoadingButton loading={form.formState.isSubmitting} type="submit" className="btn-primary w-full">{sent ? "Reset password" : "Send OTP"}</LoadingButton>
      </form>
      <p className="mt-6 text-sm text-brand-muted">Remembered it? <Link to="/login" className="text-brand-accent">Back to sign in</Link></p>
    </AuthShell>
  );
}
