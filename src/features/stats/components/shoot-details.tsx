import { type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
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

const SoldCard = ({ photo }: { photo: PhotoStat }) => (
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
      {photo.sales.length} прод. · посл. {formatDate(photo.lastSale)}
    </div>
  </a>
);

const UnsoldCard = ({ photo }: { photo: ShootPhoto }) => (
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
    <div className={styles.card__meta}>Не продавалось</div>
  </div>
);

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
  const [value, setValue] = useState(title);
  const trimmed = value.trim();
  return (
    <div className={styles.toolbar}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Название съёмки"
        placeholder="Название съёмки"
        className={styles.input}
      />
      <Button
        variant="secondary"
        onClick={() => onRename(trimmed)}
        disabled={trimmed === title || (!trimmed && !allowEmpty)}
      >
        Переименовать
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
          aria-label="Съёмка, которую присоединить"
          className={styles.input}
        >
          <option value="">Присоединить к этой съёмке…</option>
          {candidates.map((s) => (
            <option key={s.key} value={s.key}>
              {s.title} · {formatDate(s.publishedAt ?? s.createdAt)} ·{' '}
              {s.publishedCount ?? '?'} фото
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
          Присоединить
        </Button>
      </div>
      {shoot.mergedFrom.length > 0 && (
        <div className={styles.merged}>
          <span className={styles.merged__label}>Присоединены:</span>
          {shoot.mergedFrom.map((m) => (
            <span key={m.key} className={styles.merged__chip}>
              {m.title}
              <button
                type="button"
                className={styles.merged__remove}
                onClick={() => onUnmergeShoot(m.key)}
              >
                Отсоединить
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
>) => (
  <div>
    <MergeForm
      shoot={shoot}
      shoots={shoots}
      onMergeShoot={onMergeShoot}
      onUnmergeShoot={onUnmergeShoot}
    />
    {shoot.kind === 'legacy' && (
      <>
        <p className={styles.hint}>
          Старая съёмка: в Submit Content её нет, плагин собрал её по данным
          портфолио. Дайте ей понятное название — пустое вернёт код съёмки.
        </p>
        <RenameForm
          title={shoot.title === shoot.code ? '' : shoot.title}
          onRename={(title) => onRenameShoot(shoot.key, title)}
          allowEmpty
        />
      </>
    )}
    {!shoot.photos.length && !shoot.unsoldPhotos.length ? (
      <p className={styles.empty}>В этой съёмке нет опубликованных фото.</p>
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

/**
 * «Без съёмки» and the user's own shoots: images can be ticked and moved into
 * a new or existing hand-made shoot, or taken out of one.
 */
const EditableShootPhotos = ({
  shoot,
  manualShoots,
  onManualShootsChange,
}: ShootDetailsProps) => {
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
        <p className={styles.hint}>
          Отметьте фото одной съёмки и соберите их в свою съёмку. Фото
          отсортированы по имени файла, так кадры одной съёмки обычно идут
          подряд.
        </p>
      )}

      {shoot.kind === 'manual' && (
        <RenameForm title={shoot.title} onRename={handleRename}>
          <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
            Удалить съёмку
          </Button>
        </RenameForm>
      )}

      <div className={styles.toolbar}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Фильтр по ID, имени файла или описанию"
          className={styles.input}
        />
        <Button variant="secondary" onClick={selectVisible}>
          Выбрать все{query ? ' найденные' : ''} ({visible.length})
        </Button>
        <Button
          variant="secondary"
          onClick={() => setSelected(new Set())}
          disabled={!selectedIds.length}
        >
          Снять выбор
        </Button>
        <span className={styles.count}>Выбрано: {selectedIds.length}</span>
      </div>

      {shoot.kind === 'unmatched' && (
        <div className={styles.toolbar}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Название новой съёмки"
            className={styles.input}
          />
          <Button
            onClick={handleCreate}
            disabled={!selectedIds.length || !newTitle.trim()}
          >
            Создать съёмку
          </Button>
        </div>
      )}

      {(shoot.kind === 'unmatched' || shoot.kind === 'manual') &&
        otherManualShoots.length > 0 && (
          <div className={styles.toolbar}>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              aria-label="Своя съёмка"
              className={styles.input}
            >
              <option value="">Выберите свою съёмку…</option>
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
              {shoot.kind === 'manual' ? 'Перенести туда' : 'Добавить в съёмку'}
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
            Убрать выбранные из съёмки
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
        {!visible.length && <p className={styles.empty}>Ничего не найдено.</p>}
      </div>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Удалить съёмку «${shoot.title}»?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            <Button onClick={handleDelete}>Удалить</Button>
          </>
        }
      >
        Фото из неё вернутся в «Без съёмки». Продажи не пропадут.
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
