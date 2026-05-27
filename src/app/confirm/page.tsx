"use client";

/**
 * /confirm — 예약 확인 페이지
 *
 * 1단계: 전화번호 + 비밀번호 입력으로 본인 확인
 * 2단계: 매칭된 예약 목록을 카드로 표시
 *
 * 비밀번호는 SHA-256 으로 해시한 뒤, reservations.phone + password_hash
 * 조건으로 Supabase 에서 조회한다 (원본 비밀번호는 절대 전송하지 않음).
 */

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  supabase,
  type ReservationRow,
  type ReservationStatus,
} from "@/lib/supabaseClient";
import { formatPhone, sha256 } from "@/lib/format";
import Toast from "@/components/Toast";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS_META: Record<
  ReservationStatus,
  { label: string; badge: string }
> = {
  pending: {
    label: "확인 대기중",
    badge: "bg-gray-200 text-gray-700",
  },
  confirmed: {
    label: "예약 확정",
    badge: "bg-green-100 text-green-700",
  },
  cancelled: {
    label: "예약 취소",
    badge: "bg-red-100 text-red-700",
  },
};

function formatReservedAt(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}년 ${m}월 ${day}일 (${w}) ${hh}:${mm}`;
}

export default function ConfirmPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [results, setResults] = useState<ReservationRow[] | null>(null);

  const sortedResults = useMemo(() => {
    if (!results) return null;
    return [...results].sort(
      (a, b) =>
        new Date(a.reserved_at).getTime() - new Date(b.reserved_at).getTime()
    );
  }, [results]);

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value.replace(/\D/g, "").slice(0, 4));
  };

  const validate = (): string | null => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11)
      return "전화번호를 올바르게 입력해주세요.";
    if (!/^\d{4}$/.test(password))
      return "비밀번호는 숫자 4자리로 입력해주세요.";
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
      const password_hash = await sha256(password);
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("phone", phone)
        .eq("password_hash", password_hash)
        .order("reserved_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setToast(
          "일치하는 예약을 찾을 수 없습니다. 전화번호와 비밀번호를 다시 확인해주세요."
        );
        return;
      }

      setResults(data as ReservationRow[]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "예약 조회 중 오류가 발생했습니다.";
      setToast(`조회에 실패했습니다. ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setPassword("");
    // 전화번호는 그대로 두어 재조회를 편하게 한다
  };

  // ── 2단계: 결과 표시 ─────────────────────────────────────────────
  if (sortedResults) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">
            Hohak Restaurant
          </p>
          <h1 className="mt-1 text-2xl font-bold text-brand-800">
            예약 확인
          </h1>
          <p className="mt-1.5 text-sm text-brand-500">
            총 {sortedResults.length}건의 예약이 조회되었습니다.
          </p>
        </header>

        <ul className="space-y-3">
          {sortedResults.map((row) => {
            const meta = STATUS_META[row.status];
            return (
              <li
                key={row.id}
                className="rounded-2xl bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-bold text-brand-800">
                    {formatReservedAt(row.reserved_at)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="font-medium text-brand-500">예약자명</dt>
                    <dd className="text-right font-semibold text-brand-800">
                      {row.name}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="font-medium text-brand-500">인원수</dt>
                    <dd className="font-semibold text-brand-800">
                      {row.party_size}명
                    </dd>
                  </div>
                  {row.note ? (
                    <div className="flex items-start justify-between gap-4">
                      <dt className="shrink-0 font-medium text-brand-500">
                        비고
                      </dt>
                      <dd className="whitespace-pre-wrap text-right text-brand-700">
                        {row.note}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary mt-6"
        >
          다시 조회하기
        </button>

        <p className="mt-5 text-center text-xs text-brand-400">
          처음으로 돌아가기?{" "}
          <Link
            href="/"
            className="font-semibold text-brand-600 underline-offset-2 hover:underline"
          >
            홈으로
          </Link>
        </p>

        {toast ? (
          <Toast message={toast} onClose={() => setToast(null)} />
        ) : null}
      </main>
    );
  }

  // ── 1단계: 본인 확인 입력 ─────────────────────────────────────────
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-400">
          Hohak Restaurant
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-800">
          예약 확인
        </h1>
        <p className="mt-2 text-sm text-brand-500">
          예약 시 입력하신 전화번호와 비밀번호를 입력해주세요.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-card"
        noValidate
      >
        <div>
          <label htmlFor="phone" className="field-label field-required">
            전화번호
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-1234-5678"
            required
            className="field-input"
            autoComplete="tel"
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label field-required">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            inputMode="numeric"
            value={password}
            onChange={handlePasswordChange}
            placeholder="숫자 4자리"
            maxLength={4}
            required
            className="field-input tracking-[0.4em]"
            autoComplete="off"
          />
          <p className="field-helper">예약 시 설정하신 4자리 숫자</p>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "조회 중..." : "예약 조회하기"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-brand-400">
        아직 예약 전이신가요?{" "}
        <Link
          href="/reserve"
          className="font-semibold text-brand-600 underline-offset-2 hover:underline"
        >
          예약 접수 페이지로 가기
        </Link>
      </p>

      {toast ? (
        <Toast message={toast} onClose={() => setToast(null)} />
      ) : null}
    </main>
  );
}
