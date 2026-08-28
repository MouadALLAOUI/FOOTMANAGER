import type { ComponentType, ReactElement, ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  type FlatListProps,
  type ListRenderItem,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Loading } from './Loading';

interface Props<ItemT> extends Omit<FlatListProps<ItemT>, 'data' | 'renderItem' | 'ListEmptyComponent' | 'onRefresh' | 'refreshing' | 'ListFooterComponent'> {
  data: ItemT[] | null | undefined;
  renderItem?: ListRenderItem<ItemT>;
  keyExtractor?: (item: ItemT, index: number) => string;
  loading?: boolean;
  error?: unknown;
  errorTitle?: string;
  errorMessage?: string;
  errorFallback?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode | string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptySecondaryActionLabel?: string;
  onEmptySecondaryAction?: () => void;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  ListEmptyComponent?: ComponentType | ReactElement | null;
  ListHeaderComponent?: ComponentType | ReactElement | null;
}

export function List<ItemT>({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  error = null,
  errorTitle,
  errorMessage,
  errorFallback,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
  emptySecondaryActionLabel,
  onEmptySecondaryAction,
  onRetry,
  onRefresh,
  refreshing = false,
  ListEmptyComponent,
  ListHeaderComponent,
  contentContainerStyle,
  ItemSeparatorComponent,
  ...flatListProps
}: Props<ItemT>): React.JSX.Element {
  const { colors } = useTheme();

  const renderEmpty = (): ReactElement => {
    if (ListEmptyComponent) {
      if (typeof ListEmptyComponent === 'function') return <ListEmptyComponent />;
      return ListEmptyComponent;
    }
    return (
      <EmptyState
        title={emptyTitle ?? ''}
        description={emptyDescription}
        icon={emptyIcon}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        secondaryActionLabel={emptySecondaryActionLabel}
        onSecondaryAction={onEmptySecondaryAction}
      />
    );
  };

  const hasItems = (data?.length ?? 0) > 0;

  if (loading && !refreshing && !hasItems) {
    return <Loading variant="full" />;
  }

  if (error && !hasItems) {
    return (
      <ErrorState
        error={error}
        message={errorMessage}
        fallback={errorFallback}
        title={errorTitle}
        onRetry={onRetry}
      />
    );
  }

  return (
    <FlatList
      data={data ?? []}
      renderItem={renderItem ?? (() => null)}
      keyExtractor={keyExtractor ?? ((item: ItemT, index: number) => String(index))}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, !hasItems && styles.emptyContent, contentContainerStyle]}
      ListEmptyComponent={renderEmpty()}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={ItemSeparatorComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        ) : undefined
      }
      ListFooterComponent={loading && hasItems ? <Loading size="small" variant="inline" /> : null}
      {...flatListProps}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  emptyContent: { flexGrow: 1 },
});
