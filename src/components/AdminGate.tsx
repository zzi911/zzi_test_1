"use client";

/**
 * AdminGate
 * ----------------------------------------------------------------------------
 * /admin 페이지에 접근할 때 비밀번호를 한 번 묻고, 세션 동안 유지하는 게이트.
 *
 * ⚠️ 보안 한계 (반드시 숙지)
 *  - 이 컴포넌트는 **학습/프로토타입용 단순 보호** 장치입니다.
 *    실제 운영 환경의 인증으로는 절대 사용하지 마세요.
 *  - 비밀번호를 `NEXT_PUBLIC_ADMIN_PASSWORD` 로 노출합니다. 이 값은 클라이언트
 *    번들(JS)에 그대로 포함되어 누구나 DevTools에서 확인할 수 있습니다.
 *  - 통과 여부는 sessionStorage 플래그로만 판단합니다. 서버 검증이 없으므로
 *    이 게이트를 우회한 채로도 Supabase 쿼리는 그대로 동작합니다.
 *    (실제 데이터 보호는 Supabase RLS 정책 또는 서버 사이드 인증이 담당해야 합니다.)
 *  - 운영용으로는 Supabase Auth, NextAuth, Clerk 등 정식 인증 시스템과
 *    서버 라우트 가드/RLS 조합을 사용해야 합니다.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

const SESSION_KEY = "hohak-admin-unlocked";

interface AdminGateProps {
  /**
   * 인증 통과 후 보여줄 콘텐츠. logout 콜백을 받아 헤더 등에 연결할 수 있다.
   */
  children: (logout: () => void) => ReactNode;
}

export default function AdminGate({ children }: AdminGateProps) {
  // 첫 렌더 시 sessionStorage 접근으로 인한 hydration 불일치를 막기 위해
  // 마운트 이후에만 실제 상태를 결정한다.
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (!expected) {
      setError(
        "관리자 비밀번호가 설정되어 있지 않습니다. .env.local 파일의 NEXT_PUBLIC_ADMIN_PASSWORD 를 확인해주세요."
      );
      return;
    }

    if (input === expected) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      setError(null);
      setInput("");
    } else {
      setError("비밀번호가 일치하지 않습니다.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setInput("");
    setError(null);
  };

  // hydration 전에는 아무 것도 그리지 않음 (깜빡임 방지)
  if (!hydrated) return null;

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10">
        <div className="w-full rounded-2xl bg-white p-7 shadow-card">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-brand-400">
            Hohak Admin
          </p>
          <h1 className="mt-1 text-center text-2xl font-bold text-brand-800">
            관리자 인증
          </h1>
          <p className="mt-2 text-center text-sm text-brand-500">
            예약 관리 페이지에 접근하려면 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="admin-password" className="field-label">
                비밀번호
              </label>
              <input
                id="admin-password"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="field-input"
                autoFocus
                autoComplete="current-password"
              />
              {error ? <p className="field-error">{error}</p> : null}
            </div>

            <button type="submit" className="btn-primary">
              입장하기
            </button>
          </form>

          <p className="mt-5 rounded-xl border border-dashed border-brand-200 bg-cream-50/60 p-3 text-[11px] leading-relaxed text-brand-500">
            ⓘ 이 보호 장치는 학습용 단순 게이트입니다. 운영 환경에서는
            서버 사이드 인증과 Supabase RLS 정책을 사용해야 합니다.
          </p>
        </div>
      </main>
    );
  }

  return <>{children(handleLogout)}</>;
}
