import type { Translate } from '@/lib/i18n';
import { type ShootStat, UNKNOWN_PARTNER } from './aggregate';

/** A shoot's name for display; «No shoot» is translated. */
export const shootTitle = (shoot: ShootStat, t: Translate) =>
  shoot.kind === 'unmatched' ? t('shoot.unmatched') : shoot.title;

/** A partner's name for display; sales without a partner show as «Other». */
export const partnerLabel = (partner: string, t: Translate) =>
  partner === UNKNOWN_PARTNER ? t('partner.other') : partner;
