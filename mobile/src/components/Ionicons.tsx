import React from 'react';
import { Ionicons as VectorIonicons } from '@expo/vector-icons';
import type { BBIconName } from '@shared/design/icons';
import { Icon } from './Icon';

type IoniconsProps = React.ComponentProps<typeof VectorIonicons>;
type IoniconName = IoniconsProps['name'];

/**
 * Drop-in for `@expo/vector-icons` Ionicons that draws the Book Buddy duotone glyph when
 * one exists for the requested name, and the original Ionicon otherwise. Screens keep
 * their `keyof typeof Ionicons.glyphMap` types; replace call sites with <Icon> over time.
 */
const MAP: Record<string, BBIconName> = {
  home: 'home',
  library: 'library',
  albums: 'library',
  book: 'read',
  'book-open': 'read',
  reader: 'read',
  'document-text': 'pdf',
  document: 'pdf',
  headset: 'audiobook',
  'chatbubble-ellipses': 'varta',
  chatbubbles: 'chat',
  chatbubble: 'chat',
  search: 'search',
  bookmark: 'bookmark',
  'bookmarks': 'bookmark',
  'color-wand': 'sparkles',
  sparkles: 'sparkles',
  flame: 'streak',
  calendar: 'calendar',
  time: 'overdue',
  person: 'profile',
  'person-circle': 'profile',
  'person-add': 'user-plus',
  school: 'class',
  'bar-chart': 'analytics',
  stats: 'analytics',
  notifications: 'bell',
  settings: 'settings',
  'shield-checkmark': 'shield-check',
  business: 'institution',
  play: 'play',
  pause: 'pause',
  'play-back': 'skip-back',
  'play-forward': 'skip-forward',
  'volume-high': 'volume',
  'volume-mute': 'volume-x',
  mic: 'mic',
  'chevron-back': 'chevron-left',
  'chevron-forward': 'chevron-right',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  'arrow-back': 'arrow-left',
  'arrow-forward': 'arrow-right',
  close: 'close',
  'close-circle': 'x-circle',
  checkmark: 'check',
  'checkmark-circle': 'check-circle',
  add: 'plus',
  remove: 'minus',
  trash: 'trash',
  create: 'edit',
  pencil: 'edit',
  eye: 'eye',
  'eye-off': 'eye-off',
  'lock-closed': 'lock',
  key: 'key',
  mail: 'mail',
  'mail-unread': 'mail',
  filter: 'filter',
  share: 'share',
  'share-social': 'share',
  download: 'download',
  'cloud-download': 'download',
  'cloud-upload': 'upload',
  menu: 'menu',
  'ellipsis-horizontal': 'more-h',
  'ellipsis-vertical': 'more-v',
  refresh: 'rotate-cw',
  'information-circle': 'info',
  'help-circle': 'help',
  warning: 'alert',
  'alert-circle': 'alert-circle',
  star: 'star',
  heart: 'heart',
  globe: 'globe',
  language: 'globe',
  'log-out': 'logout',
  'log-in': 'login',
  call: 'phone',
  location: 'map-pin',
  layers: 'layers',
  flash: 'zap',
  send: 'send',
  'pricetag': 'tag',
  'trending-up': 'trending-up',
  copy: 'copy',
  save: 'save',
  moon: 'theme',
  sunny: 'sun',
};

/** 'mail-unread-outline' → 'mail-unread'; sharp/outline variants share a duotone glyph. */
const baseName = (name: string) => name.replace(/-(outline|sharp)$/, '');

function IoniconsCompat(props: IoniconsProps) {
  const bb = MAP[baseName(String(props.name))];
  if (!bb) return <VectorIonicons {...props} />;
  const { size = 24, color, style } = props;
  return (
    <Icon
      name={bb}
      size={size}
      color={typeof color === 'string' ? color : undefined}
      style={style as any}
      accessibilityLabel={props.accessibilityLabel}
    />
  );
}

export const Ionicons = Object.assign(IoniconsCompat, { glyphMap: VectorIonicons.glyphMap });
export type { IoniconName };
