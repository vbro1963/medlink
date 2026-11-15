import { useState } from 'react';
import { getDoctorAvatarSrc } from '../lib/doctorAvatars';
import type { AvatarKey } from '../types/telehealth';

interface DoctorAvatarProps {
  name: string;
  avatarKey: AvatarKey;
  sizeClass?: string;
}

export function DoctorAvatar({ name, avatarKey, sizeClass = 'w-14 h-14' }: DoctorAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = getDoctorAvatarSrc(avatarKey);

  const initials = name
    .replace(/^Dr\.\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} rounded-xl border border-teal-200 bg-teal-50 text-teal-800 font-display font-semibold flex items-center justify-center shrink-0 text-sm`}
    >
      {initials || 'MD'}
    </div>
  );
}
