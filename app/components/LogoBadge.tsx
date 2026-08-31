import { View, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LogoConfig } from '../../src/types';
import { EMBLEMS, EmblemID } from '../../src/assets/emblems';

// The sentinel fill used in Figma exports to mark "follow text color"
const SVG_COLOR_SENTINEL = '#FFFFFF';

export type IconID = EmblemID;

/** Renders a Figma-exported SVG emblem with the player's chosen text color applied. */
function EmblemIcon({ id, size, color }: { id: EmblemID; size: number; color: string }) {
  const raw = EMBLEMS[id];
  if (!raw) return null;
  // Replace the sentinel color in both hex and CSS-name forms (Figma exports either)
  const colored = raw
    .replace(/#[Ff][Ff][Ff][Ff][Ff][Ff]/g, color)
    .replace(/fill="white"/gi, `fill="${color}"`)
    .replace(/stroke="white"/gi, `stroke="${color}"`);
  return <SvgXml xml={colored} width={size} height={size} />;
}

/** Public icon renderer — accepts any icon ID string; unknown IDs render nothing. */
export function LogoIcon({ id, size, color }: { id: string | null; size: number; color: string }) {
  if (!id) return null;
  if (id in EMBLEMS) return <EmblemIcon id={id as EmblemID} size={size} color={color} />;
  return null;
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
