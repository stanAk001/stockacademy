import { useState } from 'react';
import { Play, ExternalLink, AlertCircle } from 'lucide-react';

/* ============================================================
 * YouTube embed — uses youtube-nocookie.com for privacy.
 * Lazy-loads (shows thumbnail until clicked) for performance.
 *
 * Usage in lesson markdown: [[youtube:VIDEO_ID|Title]]
 * The renderer in Lesson.jsx parses this and inserts <YouTubeEmbed/>
 *
 * If videoId is empty or "PLACEHOLDER", shows a friendly placeholder
 * card so you (the platform owner) can spot which lessons still need
 * a video chosen.
 * ============================================================ */
export default function YouTubeEmbed({ videoId, title }) {
  const [activated, setActivated] = useState(false);

  // Placeholder mode — for lessons where you haven't picked a video yet
  if (!videoId || videoId === 'PLACEHOLDER') {
    return (
      <figure className="my-8 max-w-3xl mx-auto">
        <div className="aspect-video rounded-2xl border-2 border-dashed border-ink/20 bg-cream-warm grid place-items-center p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-3 text-ink/30" size={36} />
            <p className="font-display text-lg font-bold text-ink/60">Video coming soon</p>
            <p className="text-sm text-ink/50 mt-1 max-w-sm">
              {title || 'A curated explainer video for this lesson will be added here.'}
            </p>
          </div>
        </div>
      </figure>
    );
  }

  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <figure className="my-8 max-w-3xl mx-auto">
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-ink shadow-xl">
        {!activated ? (
          <button
            onClick={() => setActivated(true)}
            className="absolute inset-0 group"
            aria-label="Play video"
          >
            <img
              src={thumb}
              alt={title || 'YouTube video thumbnail'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-ink/40 group-hover:bg-ink/30 transition" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="w-20 h-20 rounded-full bg-coral-400 grid place-items-center group-hover:scale-110 transition shadow-2xl">
                <Play size={32} className="text-white ml-1.5" fill="white" />
              </div>
            </div>
            {title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/90 to-transparent p-4">
                <p className="text-cream font-semibold text-sm sm:text-base text-left">{title}</p>
              </div>
            )}
          </button>
        ) : (
          <iframe
            src={embedUrl}
            title={title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>
      <figcaption className="text-xs text-ink/55 text-center italic mt-2">
        {title && <>{title} · </>}
        <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
          Watch on YouTube <ExternalLink size={10} />
        </a>
      </figcaption>
    </figure>
  );
}
