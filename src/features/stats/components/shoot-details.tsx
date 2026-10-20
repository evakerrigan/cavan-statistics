import { type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/hooks/use-i18n';
import { CAVAN_ORIGIN } from '@/lib/cavan-client';
import type { ManualShoot, ShootPhoto } from '@/types/cavan';
import { formatDate, formatMoney } from '@/utils/format';
import type { ManualShootsUpdate } from '../hooks/use-manual-shoots';
import {
  isMergeable,
  type PhotoStat,
  type ShootStat,
} from '../utils/aggregate';
import {
  addToManualShoot,
  createManualShoot,
  deleteManualShoot,
  removeFromManualShoot,
  renameManualShoot,
} from '../utils/manual-shoots';
import styles from './shoot-details.module.scss';

type ShootDetailsProps = {
  shoot: ShootStat;
  manualShoots: ManualShoot[];
  onManualShootsChange: (update: ManualShootsUpdate) => void;
  /** Names an older Cavan shoot; an empty title restores its code. */
  onRenameShoot: (key: string, title: string) => void;
  /** Every shoot in the table, to pick one to join into this one. */
  shoots: ShootStat[];
  onMergeShoot: (source: string, target: string) => void;
  onUnmergeShoot: (source: string) => void;
};

const productUrl = (id: number) =>
  `${CAVAN_ORIGIN}/account/reporting/sales/product/${id}`;

const byFileName = (a: PhotoStat, b: PhotoStat) =>
  a.product.fileName.localeCompare(b.product.fileName, undefined, {
    numeric: true,
  });

const SoldCard = ({ photo }: { photo: PhotoStat }) => {
  const { t } = useI18n();
  return (
    <a
      href={productUrl(photo.product.id)}
      target="_blank"
      rel="noreferrer"
      className={styles.card}
    >
      <img
        src={photo.product.thumbUrl}
        alt={photo.product.headline}
        loading="lazy"
        className={styles.card__image}
      />
      <div className={styles.card__info}>
        <span>{photo.product.id}</span>
        <strong>{formatMoney(photo.revenue)}</strong>
      </div>
      <div className={styles.card__meta}>
        {t('details.soldMeta', {
          n: photo.sales.length,
          date: formatDate(photo.lastSale),
        })}
      </div>
    </a>
  );
};

const UnsoldCard = ({ photo }: { photo: ShootPhoto }) => {
  const { t } = useI18n();
  return (
    <div className={`${styles.card} ${styles.cardUnsold}`}>
      {photo.thumbUrl ? (
        <img
          src={photo.thumbUrl}
          alt={photo.headline ?? ''}
          loading="lazy"
          className={styles.card__image}
        />
      ) : (
        <div className={styles.card__image} />
      )}
      <div className={styles.card__info}>
        <span className={styles.card__file} title={photo.fileName}>
          {photo.fileName}
        </span>
      </div>
      <div className={styles.card__meta}>{t('details.notSold')}</div>
    </div>
  );
};

type RenameFormProps = {
  title: string;
  onRename: (title: string) => void;
  /** Allow saving an empty name (to restore the default one). */
  allowEmpty?: boolean;
  children?: ReactNode;
};

const RenameForm = ({
  title,
  onRename,
  allowEmpty = false,
  children,
}: RenameFormProps) => {
  const { t } = useI18n();
  const [value, setValue] = useState(title);
  const trimmed = value.trim();
  return (
    <div className={styles.toolbar}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t('details.shootName')}
        placeholder={t('details.shootName')}
        className={styles.input}
      />
      <Button
        variant="secondary"
        onClick={() => onRename(trimmed)}
        disabled={trimmed === title || (!trimmed && !allowEmpty)}
      >
        {t('details.rename')}
      </Button>
      {children}
    </div>
  );
};

const dateOf = (shoot: ShootStat) =>
  new Date(
    (shoot.publishedAt ?? shoot.createdAt ?? '1970-01-01').slice(0, 10)
  ).getTime();

/**
 * Joins another Cavan shoot into this one — for a photo session that was
 * uploaded in several parts. Shoots closest in date are offered first.
 */
const MergeForm = ({
  shoot,
  shoots,
  onMergeShoot,
  onUnmergeShoot,
}: Pick<
  ShootDetailsProps,
  'shoot' | 'shoots' | 'onMergeShoot' | 'onUnmergeShoot'
>) => {
  const { t } = useI18n();
  const [sourceKey, setSourceKey] = useState('');
  const candidates = shoots
    .filter((s) => isMergeable(s) && s.key !== shoot.key)
    .sort(
      (a, b) =>
        Math.abs(dateOf(a) - dateOf(shoot)) -
        Math.abs(dateOf(b) - dateOf(shoot))
    );

  return (
    <>
      <div className={styles.toolbar}>
        <select
          value={sourceKey}
          onChange={(e) => setSourceKey(e.target.value)}
          aria-label={t('details.joinLabel')}
          className={styles.input}
        >
          <option value="">{t('details.joinPlaceholder')}</option>
          {candidates.map((s) => (
            <option key={s.key} value={s.key}>
              {s.title} · {formatDate(s.publishedAt ?? s.createdAt)} ·{' '}
              {t('details.photosCount', { n: s.publishedCount ?? '?' })}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={() => {
            onMergeShoot(sourceKey, shoot.key);
            setSourceKey('');
          }}
          disabled={!sourceKey}
        >
          {t('details.join')}
        </Button>
      </div>
      {shoot.mergedFrom.length > 0 && (
        <div className={styles.merged}>
          <span className={styles.merged__label}>{t('details.joined')}</span>
          {shoot.mergedFrom.map((m) => (
            <span key={m.key} className={styles.merged__chip}>
              {m.title}
              <button
                type="button"
                className={styles.merged__remove}
                onClick={() => onUnmergeShoot(m.key)}
              >
                {t('details.unjoin')}
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
};

/** A Cavan shoot: sold images first, then unsold in grey. */
const CavanShootPhotos = ({
  shoot,
  onRenameShoot,
  shoots,
  onMergeShoot,
  onUnmergeShoot,
}: Pick<
  ShootDetailsProps,
  'shoot' | 'onRenameShoot' | 'shoots' | 'onMergeShoot' | 'onUnmergeShoot'
>) => {
  const { t } = useI18n();
  return (
    <div>
      <MergeForm
        shoot={shoot}
        shoots={shoots}
        onMergeShoot={onMergeShoot}
        onUnmergeShoot={onUnmergeShoot}
      />
      {shoot.kind === 'legacy' && (
        <>
          <p className={styles.hint}>{t('details.legacyHint')}</p>
          <RenameForm
            title={shoot.title === shoot.code ? '' : shoot.title}
            onRename={(title) => onRenameShoot(shoot.key, title)}
            allowEmpty
          />
        </>
      )}
      {!shoot.photos.length && !shoot.unsoldPhotos.length ? (
        <p className={styles.empty}>{t('details.noPhotos')}</p>
      ) : (
        <div className={styles.grid}>
          {shoot.photos.map((photo) => (
            <SoldCard key={photo.product.id} photo={photo} />
          ))}
          {shoot.unsoldPhotos.map((photo) => (
            <UnsoldCard key={photo.itemId} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * «No shoot» and the user's own shoots: images can be ticked and moved into
 * a new or existing hand-made shoot, or taken out of one.
 */
const EditableShootPhotos = ({
  shoot,
  manualShoots,
  onManualShootsChange,
}: ShootDetailsProps) => {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [targetId, setTargetId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? shoot.photos.filter((p) =>
          [String(p.product.id), p.product.fileName, p.product.headline].some(
            (field) => field.toLowerCase().includes(q)
          )
        )
      : shoot.photos;
    return [...list].sort(byFileName);
  }, [shoot.photos, query]);

  const selectedIds = shoot.photos
    .map((p) => p.product.id)
    .filter((id) => selected.has(id));
  const otherManualShoots = manualShoots.filter((s) => s.id !== shoot.manualId);
  const target = otherManualShoots.find((s) => s.id === targetId);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectVisible = () =>
    setSelected(new Set([...selected, ...visible.map((p) => p.product.id)]));

  const apply = (update: ManualShootsUpdate) => {
    onManualShootsChange(update);
    setSelected(new Set());
  };

  const handleCreate = () => {
    apply((s) => createManualShoot(s, newTitle, selectedIds));
    setNewTitle('');
  };

  const handleMove = () => {
    if (target) apply((s) => addToManualShoot(s, target.id, selectedIds));
  };

  const handleRemove = () =>
    apply((s) => removeFromManualShoot(s, selectedIds));

  const handleRename = (title: string) => {
    const id = shoot.manualId;
    if (id) onManualShootsChange((s) => renameManualShoot(s, id, title));
  };

  const handleDelete = () => {
    const id = shoot.manualId;
    if (id) onManualShootsChange((s) => deleteManualShoot(s, id));
    setConfirmDelete(false);
  };

  return (
    <div>
      {shoot.kind === 'unmatched' && (
        <p className={styles.hint}>{t('details.unmatchedHint')}</p>
      )}

      {shoot.kind === 'manual' && (
        <RenameForm title={shoot.title} onRename={handleRename}>
          <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
            {t('details.deleteShoot')}
          </Button>
        </RenameForm>
      )}

      <div className={styles.toolbar}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('details.filter')}
          className={styles.input}
        />
        <Button variant="secondary" onClick={selectVisible}>
          {t(query ? 'details.selectFound' : 'details.selectAll', {
            n: visible.length,
          })}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setSelected(new Set())}
          disabled={!selectedIds.length}
        >
          {t('details.clear')}
        </Button>
        <span className={styles.count}>
          {t('details.selected', { n: selectedIds.length })}
        </span>
      </div>

      {shoot.kind === 'unmatched' && (
        <div className={styles.toolbar}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('details.newShootName')}
            className={styles.input}
          />
          <Button
            onClick={handleCreate}
            disabled={!selectedIds.length || !newTitle.trim()}
          >
            {t('details.create')}
          </Button>
        </div>
      )}

      {(shoot.kind === 'unmatched' || shoot.kind === 'manual') &&
        otherManualShoots.length > 0 && (
          <div className={styles.toolbar}>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              aria-label={t('details.ownShoot')}
              className={styles.input}
            >
              <option value="">{t('details.ownPlaceholder')}</option>
              {otherManualShoots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={handleMove}
              disabled={!selectedIds.length || !target}
            >
              {shoot.kind === 'manual'
                ? t('details.moveThere')
                : t('details.addToShoot')}
            </Button>
          </div>
        )}

      {shoot.kind === 'manual' && (
        <div className={styles.toolbar}>
          <Button
            variant="secondary"
            onClick={handleRemove}
            disabled={!selectedIds.length}
          >
            {t('details.removeSelected')}
          </Button>
        </div>
      )}

      <div className={styles.grid}>
        {visible.map((photo) => {
          const isSelected = selected.has(photo.product.id);
          return (
            <label
              key={photo.product.id}
              className={`${styles.card} ${styles.cardSelectable} ${isSelected ? styles.cardSelected : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(photo.product.id)}
                className={styles.card__check}
              />
              <img
                src={photo.product.thumbUrl}
                alt={photo.product.headline}
                loading="lazy"
                className={styles.card__image}
              />
              <div className={styles.card__info}>
                <a
                  href={productUrl(photo.product.id)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.card__link}
                >
                  {photo.product.id}
                </a>
                <strong>{formatMoney(photo.revenue)}</strong>
              </div>
              <div className={styles.card__meta} title={photo.product.fileName}>
                {photo.product.fileName}
              </div>
            </label>
          );
        })}
        {!visible.length && (
          <p className={styles.empty}>{t('details.nothingFound')}</p>
        )}
      </div>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('details.deleteTitle', { title: shoot.title })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleDelete}>{t('details.delete')}</Button>
          </>
        }
      >
        {t('details.deleteBody')}
      </Modal>
    </div>
  );
};

export const ShootDetails = (props: ShootDetailsProps) =>
  props.shoot.kind === 'cavan' || props.shoot.kind === 'legacy' ? (
    <CavanShootPhotos
      shoot={props.shoot}
      onRenameShoot={props.onRenameShoot}
      shoots={props.shoots}
      onMergeShoot={props.onMergeShoot}
      onUnmergeShoot={props.onUnmergeShoot}
    />
  ) : (
    <EditableShootPhotos {...props} />
  );
