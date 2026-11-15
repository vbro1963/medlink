import cardiologyImg from '../assets/images/doctor_cardiology_1794774912719.jpg';
import dermatologyImg from '../assets/images/doctor_dermatology_1794774913752.jpg';
import pediatricsImg from '../assets/images/doctor_pediatrics_1794774913327.jpg';
import neurologyImg from '../assets/images/doctor_neurology_1794774913734.jpg';
import type { AvatarKey } from '../types/telehealth';

export const DOCTOR_AVATAR_MAP: Record<Exclude<AvatarKey, 'default'>, string> = {
  cardiology: cardiologyImg,
  dermatology: dermatologyImg,
  pediatrics: pediatricsImg,
  neurology: neurologyImg,
};

export function getDoctorAvatarSrc(key: AvatarKey): string | null {
  if (key === 'default') return null;
  return DOCTOR_AVATAR_MAP[key] ?? null;
}
