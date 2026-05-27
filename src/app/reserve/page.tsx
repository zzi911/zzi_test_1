"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatPhone, sha256, todayISO } from "@/lib/format";
import { generateTimeSlots } from "@/lib/timeSlots";
import Toast from "@/components/Toast";

interface FormState {
  date: string;
  time: string;
  name: string;
  phone: string;
  password: string;
  partySize: string;
  note: string;
}

interface CompletedInfo {
  reservedAt: Date;
  name: string;
  partySize: number;
}

const INITIAL_FORM: FormState = {
  date: "",
  time: "",
  name: "",
  phone: "",
  password: "",
  partySize: "2",
  note: "",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatReservedAt(d: Date): string {
  const yyyy = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}년 ${m}월 ${day}일 (${w}) ${hh}:${mm}`;
}

export default function ReservePage() {
  const today = useMemo(() => todayISO(), []);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedInfo | null>(null);

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }));
      return;
    }
    if (name === "password") {
      const digits = value.replace(/\D/g, "").slice(0, 4);
      setForm((prev) => ({ ...prev, password: digits }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): string | null => {
    if (!form.date) return "예약 날짜를 선택해주세요.";
    if (form.date < today) return "오늘 이전 날짜는 선택할 수 없습니다.";
    if (!form.time) return "예약 시간을 선택해주세요.";
    if (!form.name.trim()) return "예약자명을 입력해주세요.";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11)
      return "전화번호를 올바르게 입력해주세요.";
    if (!/^\d{4}$/.test(form.password))
      return "비밀번호는 숫자 4자리로 입력해주세요.";
    const size = Number(form.partySize);
    if (!Number.isFinite(size) || size < 1 || size > 10)
      return "인원수는 1~10명 사이로 입력해주세요.";
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const message = validate();
    if (message) {
      setToast(message);
      return;
    }

    setSubmitting(true);
    try {
      const reservedAt = new Date(`${form.date}T${form.time}:00`);
      const password_hash = await sha256(form.password);

      const { error } = await supabase.from("reservations").insert({
        reserved_at: reservedAt.toISOString(),
        name: form.name.trim(),
        phone: form.phone,
        password_hash,
        party_size: Number(form.partySize),
        note: form.note.trim() ? form.note.trim() : null,
      });

      if (error) throw error;

      setCompleted({
        reservedAt,
        name: form.name.trim(),
        partySize: Number(form.partySize),
      });
      setForm(INITIAL_FORM);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "예약 처리 중 오류가 발생했습니다.";
      setToast(`예약에 실패했습니다. ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
        <div className="rounded-2xl bg-white p-7 shadow-card">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-center text-2xl font-bold text-brand-800">
            예약이 접수되었습니다
          </h1>
          <p className="mt-2 text-center text-sm text-brand-500">
            호학식당에서 따뜻한 한 끼를 준비해두겠습니다.
          </p>

          <dl className="mt-6 space-y-3 rounded-xl bg-cream-50 p-5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-medium text-brand-500">예약 일시</dt>
              <dd className="text-right font-semibold text-brand-800">
                {formatReservedAt(completed.reservedAt)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-medium text-brand-500">예약자명</dt>
              <dd className="font-semibold text-brand-800">
                {completed.name}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-medium text-brand-500">인원수</dt>
              <dd className="font-semibold text-brand-800">
                {completed.partySize}명
              </dd>
            </div>
          </dl>

          <p className="mt-5 rounded-xl border border-dashed border-brand-200 bg-cream-50/60 p-4 text-xs leading-relaxed text-brand-600">
            예약 확인은{" "}
            <span className="font-semibold text-brand-700">
              &lsquo;/confirm&rsquo;
            </span>{" "}
            페이지에서 전화번호와 비밀번호로 조회할 수 있습니다.
          </p>

          <Link href="/confirm" className="btn-primary mt-6">
            예약 확인하러 가기
          </Link>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => setCompleted(null)}
          >
            새 예약 접수하기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-400">
          Hohak Restaurant
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-800">
          호학식당 예약하기
        </h1>
        <p className="mt-1.5 text-sm text-brand-500">
          따뜻한 한 끼, 미리 자리를 마련해드릴게요.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-card"
        noValidate
      >
        <div>
          <label htmlFor="date" className="field-label field-required">
            예약 날짜
          </label>
          <input
            id="date"
            name="date"
            type="date"
            min={today}
            value={form.date}
            onChange={handleChange}
            required
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="time" className="field-label field-required">
            예약 시간
          </label>
          <select
            id="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            className="field-input"
          >
            <option value="" disabled>
              시간을 선택해주세요
            </option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="field-label field-required">
            예약자명
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="예) 김호학"
            required
            className="field-input"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="phone" className="field-label field-required">
            전화번호
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={handleChange}
            placeholder="010-1234-5678"
            required
            className="field-input"
            autoComplete="tel"
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label field-required">
            본인 확인용 비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            inputMode="numeric"
            value={form.password}
            onChange={handleChange}
            placeholder="숫자 4자리"
            maxLength={4}
            required
            className="field-input tracking-[0.4em]"
            autoComplete="off"
          />
          <p className="field-helper">
            예약 확인 시 사용됩니다. 잊지 않도록 메모해주세요.
          </p>
        </div>

        <div>
          <label htmlFor="partySize" className="field-label field-required">
            인원수
          </label>
          <input
            id="partySize"
            name="partySize"
            type="number"
            min={1}
            max={10}
            value={form.partySize}
            onChange={handleChange}
            required
            className="field-input"
          />
          <p className="field-helper">최소 1명 ~ 최대 10명</p>
        </div>

        <div>
          <label htmlFor="note" className="field-label">
            비고
          </label>
          <textarea
            id="note"
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="알레르기, 기념일 등 미리 알려주실 내용이 있다면 적어주세요."
            rows={3}
            className="field-input resize-none"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "접수 중..." : "예약하기"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-brand-400">
        이미 예약하셨나요?{" "}
        <Link
          href="/confirm"
          className="font-semibold text-brand-600 underline-offset-2 hover:underline"
        >
          예약 확인 페이지로 가기
        </Link>
      </p>

      {toast ? (
        <Toast message={toast} onClose={() => setToast(null)} />
      ) : null}
    </main>
  );
}
