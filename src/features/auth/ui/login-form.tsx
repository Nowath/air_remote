"use client";

import { signIn } from "../api/actions";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";

type LoginFormProps = {
  error?: string;
  message?: string;
};

export function LoginForm({ error, message }: LoginFormProps) {
  return (
    <form className="w-full max-w-sm">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
          />
        </Field>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}

        <Button type="submit" formAction={signIn} className="w-full">
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}
