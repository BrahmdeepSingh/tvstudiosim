import { View, ViewProps } from 'react-native';
import { useRef, useEffect, useCallback, ReactNode } from 'react';
import { useTutorialStore, TutorialStep } from '../../src/store/tutorialStore';

interface Props extends ViewProps {
  stepID: TutorialStep;
  padding?: number;
  children?: ReactNode;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

/**
 * Wraps a UI element and registers its screen position with the tutorial store
 * when the matching tutorial step is active.
 *
 * Usage A — replace the container View:
 *   <TutorialTarget stepID="dashboard" style={s.advanceWrap}>{children}</TutorialTarget>
 *
 * Usage B — invisible overlay inside an element:
 *   <TouchableOpacity style={s.card}>
 *     <TutorialTarget stepID="create-show" style={StyleSheet.absoluteFill} pointerEvents="none" />
 *     ...content...
 *   </TouchableOpacity>
 */
export function TutorialTarget({ stepID, padding = 8, children, ...rest }: Props) {
  const ref = useRef<View>(null);
  const step            = useTutorialStore(s => s.step);
  const active          = useTutorialStore(s => s.active);
  const registerTarget  = useTutorialStore(s => s.registerTarget);

  const measure = useCallback(() => {
    if (!active || step !== stepID) return;
    ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
      if (width <= 0 || height <= 0) return;
      registerTarget({
        x: pageX - padding,
        y: pageY - padding,
        w: width + padding * 2,
        h: height + padding * 2,
      });
    });
  }, [step, active, stepID, padding, registerTarget]);

  useEffect(() => {
    const t = setTimeout(measure, 250);
    return () => clearTimeout(t);
  }, [measure]);

  return (
    <View ref={ref} onLayout={() => setTimeout(measure, 150)} {...rest}>
      {children}
    </View>
  );
}
