"use client";

import { Camera, MapPin, MapPinOff, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type CapturePayload = {
  photo: Blob;
  latitude: number | null;
  longitude: number | null;
};

type Coords = { latitude: number; longitude: number } | null;

const MAX_WIDTH = 720;
const JPEG_QUALITY = 0.75;

/**
 * Mengambil selfie lewat kamera depan dan koordinat GPS.
 * Foto dikompres di perangkat agar unggahan tetap ringan di jaringan seluler.
 * Lokasi bersifat opsional — absen tetap bisa dikirim bila izin lokasi ditolak.
 */
export function CameraCapture({
  open,
  title,
  description,
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (payload: CapturePayload) => Promise<{ error?: string } | void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords>(null);
  const [snapshot, setSnapshot] = useState<{ blob: Blob; url: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError("Kamera tidak bisa diakses. Izinkan akses kamera di browser, lalu coba lagi.");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    void startCamera();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          setLocationError(null);
        },
        () => setLocationError("Lokasi tidak tersedia. Absen tetap bisa dikirim tanpa lokasi."),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      );
    } else {
      setLocationError("Perangkat ini tidak mendukung deteksi lokasi.");
    }

    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      if (snapshot) URL.revokeObjectURL(snapshot.url);
    };
  }, [snapshot]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setSnapshot({ blob, url: URL.createObjectURL(blob) });
        stopCamera();
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  };

  const retake = () => {
    if (snapshot) URL.revokeObjectURL(snapshot.url);
    setSnapshot(null);
    setError(null);
    void startCamera();
  };

  const submit = async () => {
    if (!snapshot) return;
    setSubmitting(true);
    setError(null);

    const result = await onSubmit({
      photo: snapshot.blob,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });

    setSubmitting(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }

    if (snapshot) URL.revokeObjectURL(snapshot.url);
    setSnapshot(null);
    onClose();
  };

  const close = () => {
    stopCamera();
    if (snapshot) URL.revokeObjectURL(snapshot.url);
    setSnapshot(null);
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={title} description={description}>
      <div className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {cameraError ? <Alert tone="error">{cameraError}</Alert> : null}

        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/90 sm:aspect-video">
          {snapshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snapshot.url} alt="Pratinjau foto absensi" className="size-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="size-full -scale-x-100 object-cover"
              aria-label="Pratinjau kamera"
            />
          )}
        </div>

        <div
          className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[12px] font-medium ${
            coords ? "bg-emerald-soft text-[#1f8a51]" : "bg-amber-soft text-[#9a6a12]"
          }`}
        >
          {coords ? <MapPin className="size-4" aria-hidden /> : <MapPinOff className="size-4" aria-hidden />}
          {coords
            ? `Lokasi terdeteksi (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`
            : (locationError ?? "Mendeteksi lokasi…")}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={close} className={buttonClass({ variant: "ghost" })}>
            Batal
          </button>

          {snapshot ? (
            <>
              <button type="button" onClick={retake} className={buttonClass({ variant: "outline" })}>
                <RefreshCw className="size-4" aria-hidden />
                Ambil ulang
              </button>
              <Button type="button" onClick={submit} disabled={submitting}>
                {submitting ? "Mengirim…" : submitLabel}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={capture} disabled={Boolean(cameraError)}>
              <Camera className="size-4" aria-hidden />
              Ambil foto
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
