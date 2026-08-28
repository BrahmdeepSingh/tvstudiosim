import { View, Text } from 'react-native';
import { LogoConfig } from '../../src/types';

const PAGE_BG = '#0f1220';

export type IconID =
  | 'star' | 'crown' | 'bolt' | 'flame' | 'eye'
  | 'shield' | 'trophy' | 'diamond' | 'play' | 'film';

export function LogoIcon({ id, size, color }: { id: IconID | null; size: number; color: string }) {
  if (!id) return null;
  const s = size;
  const c = color;

  switch (id) {
    case 'star': {
      const half = s * 0.44;
      const h1 = s * 0.82;
      const h2 = s * 0.32;
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 0, height: 0,
            borderLeftWidth: half, borderRightWidth: half, borderBottomWidth: h1,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c,
            top: s * 0.05 }} />
          <View style={{ position: 'absolute', width: 0, height: 0,
            borderLeftWidth: half * 0.95, borderRightWidth: half * 0.95, borderTopWidth: h2,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c,
            top: s * 0.34 }} />
        </View>
      );
    }
    case 'crown': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', bottom: s * 0.12, left: s * 0.1, right: s * 0.1, height: s * 0.22, backgroundColor: c, borderRadius: 2 }} />
          <View style={{ position: 'absolute', bottom: s * 0.32, left: s * 0.1, width: 0, height: 0,
            borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.36,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
          <View style={{ position: 'absolute', bottom: s * 0.32, left: s * 0.5 - s * 0.14, width: 0, height: 0,
            borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.48,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
          <View style={{ position: 'absolute', bottom: s * 0.32, right: s * 0.1, width: 0, height: 0,
            borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.36,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
        </View>
      );
    }
    case 'bolt': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: s * 0.04, left: s * 0.34, width: s * 0.36, height: s * 0.46, backgroundColor: c, borderTopLeftRadius: 2,
            transform: [{ skewX: '-14deg' }] }} />
          <View style={{ position: 'absolute', bottom: s * 0.04, right: s * 0.22, width: s * 0.38, height: s * 0.46, backgroundColor: c, borderBottomRightRadius: 2,
            transform: [{ skewX: '-14deg' }] }} />
        </View>
      );
    }
    case 'flame': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', bottom: s * 0.06, width: s * 0.54, height: s * 0.72,
            backgroundColor: c, borderTopLeftRadius: s * 0.28, borderTopRightRadius: s * 0.28,
            borderBottomLeftRadius: s * 0.16, borderBottomRightRadius: s * 0.16 }} />
          <View style={{ position: 'absolute', bottom: s * 0.22, width: s * 0.26, height: s * 0.36,
            backgroundColor: PAGE_BG, borderRadius: s * 0.13 }} />
        </View>
      );
    }
    case 'eye': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s * 0.82, height: s * 0.42, borderRadius: s * 0.21,
            backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.28, height: s * 0.28, borderRadius: s * 0.14, backgroundColor: PAGE_BG }} />
          </View>
        </View>
      );
    }
    case 'shield': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: s * 0.1, left: s * 0.14, right: s * 0.14, height: s * 0.55, backgroundColor: c, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          <View style={{ position: 'absolute', bottom: s * 0.06, width: 0, height: 0,
            borderLeftWidth: s * 0.36, borderRightWidth: s * 0.36, borderTopWidth: s * 0.34,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c }} />
        </View>
      );
    }
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
    case 'diamond': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s * 0.62, height: s * 0.62, backgroundColor: c, transform: [{ rotate: '45deg' }], borderRadius: 3 }} />
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
        <LogoIcon id={config.iconID as IconID} size={size * 0.52} color={config.textColor} />
      ) : (
        <Text style={{ fontFamily: 'BebasNeue_400Regular', color: config.textColor, fontSize: size * 0.33, letterSpacing: size * 0.015 }}>
          {initials || '??'}
        </Text>
      )}
    </View>
  );
}
