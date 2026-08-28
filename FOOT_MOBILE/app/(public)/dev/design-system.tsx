import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { List } from '@/components/ui/List';
import { Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { DevOnlyGate } from '@/system/DevOnlyGate';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, spacing } from '@/theme/spacing';

export default function DesignSystem(): React.JSX.Element {
  return (
    <DevOnlyGate>
      <DesignSystemContent />
    </DevOnlyGate>
  );
}

function DesignSystemContent(): React.JSX.Element {
  const { colors, mode } = useTheme();
  const { t, locale, direction, isRTL, formatDate, formatRelativeTime, formatNumber } = useI18n();
  const toast = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const now = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => new Date(now.getTime() - 86400000), [now]);

  return (
    <Screen scroll>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="h1">{t('design.title')}</AppText>
        <AppText muted>
          {t('design.subtitle')} · {mode} · {direction} · {t(`language.${locale}`)}
        </AppText>
        <AppText variant="caption" muted>
          RTL: {isRTL ? 'yes' : 'no'} · maxWidth {layout.maxContentWidth} · {formatDate(now)} ·{' '}
          {formatNumber(12345.67)}
        </AppText>
        <Divider />

        <Section title="Screen Header">
          <View style={[styles.headerWrap, { borderColor: colors.border }]}>
            <ScreenHeader title={t('match.detail')} showBack />
          </View>
          <View style={[styles.headerWrap, { borderColor: colors.border }]}>
            <ScreenHeader title={t('bookings.title')} subtitle={t('common.comingSoon')} />
          </View>
        </Section>

        <Section title={t('language.select')}>
          <LanguageSwitcher />
          <View style={styles.row}>
            <Badge label={`dir: ${direction}`} variant={isRTL ? 'info' : 'neutral'} />
            <Badge label={t(`language.${locale}`)} variant="success" />
          </View>
          <AppText variant="caption" muted>
            Switch en → fr → ar live · persisted via {String('prefs.locale')} · no restart
          </AppText>
        </Section>

        <Section title="Typography">
          <AppText variant="h1">{t('home.title')}</AppText>
          <AppText variant="h2">{t('home.subtitle')}</AppText>
          <AppText variant="body">{t('app.tagline')}</AppText>
          <AppText variant="caption" muted>
            {formatDate(now)} · {formatRelativeTime(yesterday)} · {formatNumber(9876)}
          </AppText>
          <AppText variant="label">{t('language.select').toUpperCase()}</AppText>
        </Section>

        <Section title="Buttons">
          <View style={styles.row}>
            <Button title={t('common.save')} onPress={() => toast.show(t('common.save'), 'success')} />
            <Button title={t('common.cancel')} variant="secondary" onPress={() => {}} />
            <Button title={t('common.close')} variant="outline" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Danger" variant="danger" onPress={() => toast.show(t('common.error'), 'error')} />
            <Button title="Ghost" variant="ghost" onPress={() => {}} />
            <Button title={t('common.loading')} loading onPress={() => {}} />
          </View>
        </Section>

        <Section title="IconButton">
          <View style={styles.row}>
            <IconButton icon={<Text>✕</Text>} accessibilityLabel={t('common.close')} onPress={() => toast.show('Icon')} />
            <IconButton icon={<Text>✓</Text>} accessibilityLabel={t('common.confirm')} variant="primary" onPress={() => {}} />
            <IconButton icon={<Text>⋯</Text>} accessibilityLabel="More" variant="outline" onPress={() => {}} />
          </View>
        </Section>

        <Section title="Input">
          <Input
            label={t('common.search')}
            placeholder={t('common.search')}
            value={inputValue}
            onChangeText={setInputValue}
          />
          <Input label={t('common.search')} placeholder={t('common.search')} error={t('common.error')} />
          <Input label={t('common.search')} placeholder={t('common.search')} editable={false} value="Read only" />
        </Section>

        <Section title="Badges">
          <View style={styles.row}>
            <Badge label={t('common.empty')} variant="neutral" />
            <Badge label={t('common.online')} variant="success" />
            <Badge label={t('common.offline')} variant="warning" />
            <Badge label={t('common.error')} variant="danger" />
            <Badge label={t('common.loading')} variant="info" />
          </View>
        </Section>

        <Section title="Card & Divider">
          <Card>
            <AppText variant="bodyBold">{t('infra.title')}</AppText>
            <AppText muted>UI text via t() · backend content via formatBackendContent()</AppText>
          </Card>
          <Card elevated>
            <AppText variant="bodyBold">{t('common.comingSoon')}</AppText>
            <AppText muted>Elevated + RTL-aware logical props</AppText>
          </Card>
          <Divider />
          <AppText muted>Divider — border uses theme</AppText>
        </Section>

        <Section title="Avatar">
          <View style={styles.row}>
            <Avatar name="Ahmed Ali" size="sm" />
            <Avatar name="Ahmed Ali" size="md" />
            <Avatar name="Ahmed Ali" size="lg" />
            <Avatar uri="https://picsum.photos/200" name="Photo" size="lg" />
          </View>
        </Section>

        <Section title="States">
          <Card>
            <Loading message={t('common.loading')} />
          </Card>
          <Card>
            <EmptyState
              title={t('common.empty')}
              description={t('common.comingSoon')}
              actionLabel={t('common.retry')}
              onAction={() => toast.show(t('common.retry'))}
            />
          </Card>
          <Card>
            <ErrorState
              title={t('common.error')}
              message={t('common.error')}
              retryLabel={t('common.retry')}
              onRetry={() => toast.show(t('common.retry'), 'info')}
            />
          </Card>
        </Section>

        <Section title="List (states)">
          <Card>
            <List
              data={[1, 2, 3]}
              renderItem={({ item }) => (
                <Card title={`Item ${item}`} subtitle={t('common.comingSoon')} />
              )}
              keyExtractor={(item) => String(item)}
            />
          </Card>
          <Card>
            <List
              data={[]}
              emptyTitle={t('common.empty')}
              emptyDescription={t('common.comingSoon')}
              emptyIcon="⚽"
            />
          </Card>
        </Section>

        <Section title="Confirmation Dialog">
          <Button title="Open destructive" variant="danger" onPress={() => setConfirmVisible(true)} />
          <ConfirmationDialog
            visible={confirmVisible}
            title={t('common.confirm')}
            description={t('settings.logoutConfirm')}
            confirmLabel={t('auth.logout')}
            cancelLabel={t('common.cancel')}
            destructive
            onConfirm={() => {
              setConfirmVisible(false);
              toast.show(t('common.confirm'), 'success');
            }}
            onCancel={() => setConfirmVisible(false)}
          />
        </Section>

        <Section title="Modal & Toast">
          <Button title={t('common.confirm')} onPress={() => setModalVisible(true)} />
          <View style={styles.row}>
            <Button title="Success" variant="secondary" onPress={() => toast.show(t('common.save'), 'success')} />
            <Button title="Error" variant="secondary" onPress={() => toast.show(t('common.error'), 'error')} />
          </View>
          <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title={t('common.confirm')}>
            <AppText>{t('common.comingSoon')}</AppText>
            <View style={{ marginTop: spacing.lg }}>
              <Button title={t('common.close')} onPress={() => setModalVisible(false)} />
            </View>
          </Modal>
        </Section>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <AppText variant="caption" muted align="center">
            UI translations: t() + I18nProvider · Backend content: formatBackendContent() — never translated · Dates via
            Intl + locale
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  sectionBody: { gap: spacing.md },
  headerWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: 'hidden', marginVertical: spacing.xs },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg, marginTop: spacing.md },
});
