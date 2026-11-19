"use client";
import { useState } from "react";
import { cn } from "./cn";

/**
 * A photo that shows its tiny blurred preview straight away, then fades the
 * real photo in over it once it has loaded. Without a preview it behaves
 * like a plain image.
 */
export function BlurImg({
  src,
  placeholder,
  alt,
  className,
  imgClassName,
  loading = "lazy",
}: {
  src: string;
  placeholder?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span
      className={cn("relative block h-full w-full overflow-hidden", className)}
      style={
        placeholder && !loaded
          ? {
              backgroundImage: `url(${placeholder})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {placeholder && !loaded && (
        // The preview is 16px wide: blur it so it reads as a soft wash, not pixels.
        <span aria-hidden className="absolute inset-0 backdrop-blur-xl" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        // Already in the browser cache: no fade needed.
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
        }}
        className={cn(
          "relative h-full w-full object-cover transition-opacity duration-300",
          placeholder && !loaded ? "opacity-0" : "opacity-100",
          imgClassName,
        )}
      />
    </span>
  );
}
