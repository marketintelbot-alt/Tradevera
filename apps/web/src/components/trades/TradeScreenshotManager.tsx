import { useEffect, useState } from "react";
import type { TradeScreenshot } from "@tradevera/shared";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, api } from "@/lib/api";

interface TradeScreenshotManagerProps {
  tradeId: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read image"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Invalid image file"));
    img.src = raw;
  });

  const maxWidth = 1600;
  const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return raw;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.84);
}

export function TradeScreenshotManager({ tradeId }: TradeScreenshotManagerProps) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [screenshots, setScreenshots] = useState<TradeScreenshot[]>([]);
  const { toast } = useToast();

  const loadScreenshots = async () => {
    setLoading(true);
    try {
      const response = await api.listTradeScreenshots(tradeId);
      setScreenshots(response.screenshots);
    } catch (error) {
      toast({
        title: "Unable to load screenshots",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScreenshots().catch((error) => console.error(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const imageData = await compressImage(file);
      const response = await api.createTradeScreenshot(tradeId, {
        image_data: imageData,
        caption: caption.trim() || null
      });
      setScreenshots((current) => [response.screenshot, ...current]);
      setCaption("");
      toast({ title: "Screenshot attached", tone: "success" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 413) {
        toast({
          title: "Image too large",
          description: "Try a smaller screenshot or crop the image before upload.",
          tone: "error"
        });
      } else {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Unexpected error",
          tone: "error"
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (screenshot: TradeScreenshot) => {
    const confirmed = window.confirm("Delete this screenshot?");
    if (!confirmed) {
      return;
    }
    try {
      await api.deleteTradeScreenshot(tradeId, screenshot.id);
      setScreenshots((current) => current.filter((item) => item.id !== screenshot.id));
      toast({ title: "Screenshot deleted", tone: "success" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-200 bg-ink-100/40 p-4">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-ink-800" />
          <p className="text-sm font-semibold text-ink-900">Attach chart screenshots</p>
        </div>
        <p className="mt-1 text-xs text-ink-700">Store before/after chart context for better review quality.</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,auto]">
          <Input
            label="Caption (optional)"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Example: Entry at breakout with VWAP reclaim."
          />
          <label className="flex items-end">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                handleUpload(event.target.files?.[0] ?? null).catch((error) => console.error(error));
                event.target.value = "";
              }}
              disabled={uploading}
              id={`trade-screenshot-upload-${tradeId}`}
            />
            <Button
              loading={uploading}
              onClick={() => document.getElementById(`trade-screenshot-upload-${tradeId}`)?.click()}
              className="w-full gap-2 sm:w-auto"
            >
              <ImagePlus className="h-4 w-4" />
              Upload screenshot
            </Button>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : screenshots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 p-4 text-sm text-ink-700">No screenshots yet for this trade.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {screenshots.map((screenshot) => (
            <div key={screenshot.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              <img src={screenshot.image_data} alt={screenshot.caption ?? "Trade screenshot"} className="h-44 w-full object-cover" />
              <div className="flex items-start justify-between gap-2 p-3">
                <div>
                  <p className="text-xs text-ink-700">{new Date(screenshot.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-ink-900">{screenshot.caption ?? "No caption"}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-100"
                  onClick={() => handleDelete(screenshot)}
                  aria-label="Delete screenshot"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
