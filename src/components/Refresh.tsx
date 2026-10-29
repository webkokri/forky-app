import { RefreshControl, type RefreshControlProps } from 'react-native';
import { colors } from '@/theme';

/**
 * Orange pull-to-refresh control used by every scrolling screen.
 * It must forward ALL props, including `children` and `style`: React Native clones the control element and puts the
 * scroll view inside it, so a wrapper that drops them makes the whole list disappear.
 */
export function Refresh(props: RefreshControlProps) {
  return <RefreshControl tintColor={colors.brand} colors={[colors.brand]} progressBackgroundColor="#FFFFFF" {...props} />;
}
