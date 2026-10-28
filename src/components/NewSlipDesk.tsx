"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkFile } from "@/lib/resize";
import { SAMPLE_SPOKEN } from "@/lib/sample-spoken";
import type { VendorRow } from "@/lib/types";

type SpeechCtor = new () => SpeechRecognition;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function NewSlipDesk() {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const wantListenRef = useRef(false);

  useEffect(() => {
    fetch("/api/vendors")
      .then((res) => res.json())
      .then((rows: VendorRow[]) => {
        setVendors(rows);
        const preferred = rows.find((row) => row.name === "Green Valley Produce") ?? rows[0];
        if (preferred) setVendorId(preferred.id);
      })
      .catch(() => setError("Could not load vendors. Did you run the database seed?"));
  }, []);

  useEffect(() => {
    const Ctor = getSpeechCtor();
    setSpeechReady(Boolean(Ctor));
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i += 1) {
        spoken += event.results[i][0].transcript;
      }
      setTranscript(spoken.trim());
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error;
      if (code === "aborted") return;
      const messages: Record<string, string> = {
        "not-allowed": "The microphone is blocked. Click the lock icon in the address bar and allow the mic, then try again.",
        "no-speech": "I did not catch any words. Click Start talking and speak a bit louder.",
        network: "Chrome needs the internet for speech. Check you are online, then try again.",
        "audio-capture": "No microphone was found. Plug one in or check Windows sound settings.",
        "service-not-allowed": "This window cannot use Chrome speech. Open http://localhost:3000 in Chrome or Edge.",
      };
      setError(messages[code] || `Speech stopped (${code}). Try Chrome, allow the mic, and click Start talking.`);
      wantListenRef.current = false;
      setListening(false);
      stopMic();
    };
    recognition.onend = () => {
      // Chrome often ends a "continuous" session after a pause. Keep going if the owner still wants it.
      if (wantListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through
        }
      }
      setListening(false);
      stopMic();
    };
    recognitionRef.current = recognition;
    return () => {
      wantListenRef.current = false;
      recognition.stop();
      stopMic();
    };
  }, []);

  function stopMic() {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
  }

  function useKitchenCounter() {
    const counter = vendors.find((row) => row.name === "Kitchen counter");
    if (counter) setVendorId(counter.id);
    return counter?.id ?? vendorId;
  }

  async function toggleListening() {
    if (listening || wantListenRef.current) {
      wantListenRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      stopMic();
      return;
    }

    setError("");
    useKitchenCounter();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot open a microphone. Use Chrome or Edge.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
    } catch {
      setError("The microphone was denied. Click the lock icon next to the URL, allow the mic, then click Start talking.");
      return;
    }

    try {
      wantListenRef.current = true;
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      wantListenRef.current = false;
      stopMic();
      setError("Could not start speech. Refresh the page and click Start talking once.");
    }
  }

  async function submitFile(useSample: boolean) {
    setError("");
    if (!vendorId) {
      setError("Choose who this slip is from.");
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set("vendorId", vendorId);
      if (useSample) {
        body.set("sample", "1");
      } else {
        if (!file) {
          setError("Drop a photo or PDF first.");
          setBusy(false);
          return;
        }
        body.set("file", await shrinkFile(file));
      }

      const res = await fetch("/api/bills", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the slip.");
      router.push(`/bills/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function submitSpoken(text = transcript) {
    setError("");
    const spoken = text.trim();
    if (!spoken) {
      setError("Say or type the order first.");
      return;
    }

    const nextVendor = useKitchenCounter();
    setBusy(true);
    wantListenRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    stopMic();
    try {
      const body = new FormData();
      body.set("vendorId", nextVendor);
      body.set("spoken", "1");
      body.set("transcript", spoken);
      const res = await fetch("/api/bills", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that order.");
      router.push(`/bills/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="paper-sheet rounded-[28px] p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--moss)]">This morning’s delivery</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight">
          Lay the paper slip on the desk. Or say the order.
        </h2>
        <p className="mt-3 max-w-md text-[var(--ink)]/70">
          KitchenSlip copies names and quantities into a draft you can fix.
          Confirming it writes a kitchen order.
        </p>

        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--moss)]">Vendor</span>
            <select
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--rule)] bg-white px-4 py-3 text-[var(--ink)] outline-none"
            >
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block cursor-pointer rounded-2xl border border-dashed border-[var(--rust)]/50 bg-[var(--rust)]/5 px-5 py-10 text-center">
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="font-[family-name:var(--font-display)] text-2xl italic">Photo or PDF</p>
            <p className="mt-2 text-sm text-[var(--ink)]/60">
              {file ? file.name : "Tap here or drop the slip on this tile"}
            </p>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => submitFile(false)}
              className="rounded-full bg-[var(--moss)] px-6 py-3 text-white disabled:opacity-60"
            >
              {busy ? "Reading the slip…" : "Read this slip"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submitFile(true)}
              className="rounded-full border border-[var(--moss)] px-6 py-3 text-[var(--moss)] disabled:opacity-60"
            >
              Try the sample produce slip
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--rule)] bg-white/60 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--moss)]">Or speak it</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl italic">
              “2 garlic naan and 1 paneer sabji”
            </p>

            {speechReady ? (
              <div className="mt-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleListening()}
                  className={`rounded-full px-6 py-3 text-white disabled:opacity-60 ${
                    listening ? "bg-[var(--rust)]" : "bg-[var(--ink)]"
                  }`}
                >
                  {listening ? "Listening… click to stop" : "Start talking"}
                </button>
                <p className="mt-2 text-sm text-[var(--ink)]/55">
                  {listening
                    ? "Speak now. Words should appear in the box below."
                    : "Use Chrome or Edge. Allow the microphone when asked."}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink)]/55">
                This browser has no speech box. Open Chrome or Edge, or type the sentence below.
              </p>
            )}

            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="create order for 2 garlic naan and 1 paneer sabji"
              className="mt-4 min-h-24 w-full rounded-2xl border border-[var(--rule)] bg-white px-4 py-3 text-[var(--ink)] outline-none"
            />

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => submitSpoken()}
                className="rounded-full bg-[var(--rust)] px-6 py-3 text-white disabled:opacity-60"
              >
                Turn this into a draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setTranscript(SAMPLE_SPOKEN);
                  void submitSpoken(SAMPLE_SPOKEN);
                }}
                className="rounded-full border border-[var(--rust)] px-6 py-3 text-[var(--rust)] disabled:opacity-60"
              >
                Try this sentence
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-[var(--rust)]">{error}</p> : null}
        </div>
      </div>

      <aside className="paper-sheet relative overflow-hidden rounded-[28px] p-8">
        <div className="stamp absolute top-8 right-8 px-3 py-1 text-xs text-[var(--rust)]">OPEN</div>
        <p className="font-[family-name:var(--font-display)] text-2xl italic">How the desk works</p>
        <ol className="mt-6 space-y-4 text-[var(--ink)]/80">
          <li>1. Drop a vendor slip, or say the dishes out loud.</li>
          <li>2. KitchenSlip fills a paper draft.</li>
          <li>3. Cross out a line, fix a quantity, or pick the kitchen item.</li>
          <li>4. Confirm. That is the moment an order is written.</li>
        </ol>
        <p className="mt-8 text-sm text-[var(--ink)]/55">
          Spoken tickets use Kitchen counter. A short name such as “Tmt” stays
          blank until you pick Tomato. Next time that vendor uses it, KitchenSlip remembers.
        </p>
      </aside>
    </section>
  );
}
