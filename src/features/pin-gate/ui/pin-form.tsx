"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Delete, Loader2, LockKeyhole } from "lucide-react";

import { Button } from "@/shared/ui";
import { KEYPAD, PIN_LENGTH } from "../config";
import { unlock, type PinFormState } from "../api/actions";

const initialState: PinFormState = { attempt: 0 };

/**
 * PIN keypad shown on the app root. The typed digits never leave this component
 * except as the `pin` field of the Server Action call — verification happens
 * entirely on the server, which then issues the httpOnly unlock cookie.
 */
export function PinForm() {
  const [state, formAction, pending] = useActionState(unlock, initialState);

  // Remounting on every attempt clears the pad without a setState-in-effect:
  // a rejected PIN comes back with a new `attempt`, so the pad starts empty.
  return (
    <PinPad
      key={state.attempt}
      formAction={formAction}
      pending={pending}
      error={state.error}
    />
  );
}

function PinPad({
  formAction,
  pending,
  error,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
}) {
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Submit once the last digit lands — no confirm button needed. Done in an
  // effect so the hidden input already holds the final digit.
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [pin, pending]);

  const press = (digit: number) => {
    if (pending) return;
    setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
  };

  const backspace = () => {
    if (pending) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col items-center gap-8"
    >
      <input type="hidden" name="pin" value={pin} />

      <div className="flex flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-gray-200 text-gray-600">
          <LockKeyhole className="size-6" />
        </div>
        <p className="text-gray-600">กรอกรหัสเพื่อเข้าใช้งาน</p>

        <div
          className="flex gap-3"
          aria-live="polite"
          aria-label={`กรอกแล้ว ${pin.length} จาก ${PIN_LENGTH} หลัก`}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={`size-4 rounded-full transition-colors ${
                index < pin.length ? "bg-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <p className="flex h-5 items-center gap-2 text-sm" role="alert">
          {pending ? (
            <span className="flex items-center gap-2 text-gray-500">
              <Loader2 className="size-4 animate-spin" />
              กำลังตรวจสอบ
            </span>
          ) : (
            <span className="text-destructive">{error}</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {KEYPAD.map((key, index) =>
          key === null ? (
            <span key={`empty-${index}`} />
          ) : (
            <Button
              key={key}
              type="button"
              variant="secondary"
              size="icon-lg"
              disabled={pending}
              onClick={() => press(key)}
              className="size-18 rounded-full text-2xl"
            >
              {key}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          disabled={pending || pin.length === 0}
          onClick={backspace}
          aria-label="ลบตัวเลขล่าสุด"
          className="size-18 rounded-full"
        >
          <Delete className="size-6" />
        </Button>
      </div>
    </form>
  );
}
