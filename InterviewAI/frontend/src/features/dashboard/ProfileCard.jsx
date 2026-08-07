import { useEffect, useState } from 'react';

const invalidPlaceholderUrls = new Set([
  'https://res.cloudinary.com/demo/image/upload/profile.jpg',
  'http://res.cloudinary.com/demo/image/upload/profile.jpg',
]);

function getProfileImageUrl(value) {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url || invalidPlaceholderUrls.has(url.replace(/\/$/, ''))) return '';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export default function ProfileCard({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const profileImageUrl = getProfileImageUrl(user.profilePicture);
  useEffect(() => setImageFailed(false), [profileImageUrl]);
  const joinedDate = user.createdAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.createdAt))
    : 'Unavailable';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        {profileImageUrl && !imageFailed ? (
          <img src={profileImageUrl} onError={() => setImageFailed(true)} alt={`${user.name}'s profile`} className="size-16 rounded-full object-cover" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-700" aria-hidden="true">
            {getInitials(user.name)}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-slate-900">{user.name}</h2>
          <p className="truncate text-slate-600">{user.email}</p>
        </div>
      </div>
      <dl className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-slate-500">Member since</dt>
          <dd className="font-medium text-slate-700">{joinedDate}</dd>
        </div>
      </dl>
    </article>
  );
}
