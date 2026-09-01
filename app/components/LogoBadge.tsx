import { View, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LogoConfig } from '../../src/types';
import { EMBLEMS, EmblemID } from '../../src/assets/emblems';

const PAGE_BG = '#0f1220';

export type IconID = EmblemID | 'trophy' | 'play' | 'film';

/** Renders a Figma-exported SVG emblem with the player's chosen text color applied. */
function EmblemIcon({ id, size, color }: { id: EmblemID; size: number; color: string }) {
  const raw = EMBLEMS[id];
  if (!raw) return null;
  const colored = raw
    .replace(/#[Ff][Ff][Ff][Ff][Ff][Ff]/g, color)
    .replace(/fill="white"/gi, `fill="${color}"`)
    .replace(/stroke="white"/gi, `stroke="${color}"`);
  return <SvgXml xml={colored} width={size} height={size} />;
}

/** Renders the kept View-based icons (trophy, play, film). */
function LegacyIcon({ id, size, color }: { id: string; size: number; color: string }) {
  const s = size;
  const c = color;
  switch (id) {
    case 'trophy': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: s * 0.08, left: s * 0.18, right: s * 0.18, height: s * 0.44,
            backgroundColor: c, borderBottomLeftRadius: s * 0.22, borderBottomRightRadius: s * 0.22 }} />
          <View style={{ position: 'absolute', top: s * 0.5, left: s * 0.41, right: s * 0.41, height: s * 0.2, backgroundColor: c }} />
          <View style={{ position: 'absolute', bottom: s * 0.1, left: s * 0.22, right: s * 0.22, height: s * 0.14, backgroundColor: c, borderRadius: 3 }} />
          <View style={{ position: 'absolute', top: s * 0.16, left: s * 0.06, width: s * 0.14, height: s * 0.26,
            borderWidth: s * 0.06, borderColor: c, borderRadius: s * 0.08, borderRightWidth: 0 }} />
          <View style={{ position: 'absolute', top: s * 0.16, right: s * 0.06, width: s * 0.14, height: s * 0.26,
            borderWidth: s * 0.06, borderColor: c, borderRadius: s * 0.08, borderLeftWidth: 0 }} />
        </View>
      );
    }
    case 'play': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 0, height: 0,
            borderTopWidth: s * 0.36, borderBottomWidth: s * 0.36, borderLeftWidth: s * 0.60,
            borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: c,
            marginLeft: s * 0.08 }} />
        </View>
      );
    }
    case 'film': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s * 0.8, height: s * 0.52, backgroundColor: c, borderRadius: 3,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3, paddingHorizontal: 5 }}>
            {[0,1,2,3].map(i => (
              <View key={i} style={{ width: s * 0.08, height: s * 0.12, backgroundColor: PAGE_BG, borderRadius: 1 }} />
            ))}
          </View>
          <View style={{ position: 'absolute', top: s * 0.14, left: s * 0.1, right: s * 0.1, height: s * 0.1, backgroundColor: c, borderRadius: 2 }} />
          <View style={{ position: 'absolute', bottom: s * 0.14, left: s * 0.1, right: s * 0.1, height: s * 0.1, backgroundColor: c, borderRadius: 2 }} />
        </View>
      );
    }
    default:
      return null;
  }
}

/** Public icon renderer — SVG emblems take priority; falls back to legacy View-based icons. */
export function LogoIcon({ id, size, color }: { id: string | null; size: number; color: string }) {
  if (!id) return null;
  if (id in EMBLEMS) return <EmblemIcon id={id as EmblemID} size={size} color={color} />;
  return <LegacyIcon id={id} size={size} color={color} />;
}

export function LogoBadge({ size, initials, config }: { size: number; initials: string; config: LogoConfig }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: config.bgColor,
      borderWidth: size * 0.04,
      borderColor: config.textColor + '55',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {config.iconID ? (
        <LogoIcon id={config.iconID} size={size * 0.62} color={config.textColor} />
      ) : (
        <Text style={{ fontFamily: 'BebasNeue_400Regular', color: config.textColor, fontSize: size * 0.33, letterSpacing: size * 0.015 }}>
          {initials || '??'}
        </Text>
      )}
    </View>
  );
}