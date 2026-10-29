import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { colors, fonts } from '@/theme';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset' | '2fa';

const COPY: Record<Mode, { title: string; sub: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to order and track your food.' },
  signup: { title: 'Join Forky', sub: 'Local food and groceries, delivered fast.' },
  forgot: { title: 'Reset password', sub: 'We’ll send a code to your email or phone.' },
  reset: { title: 'New password', sub: 'Enter the code we sent you.' },
  '2fa': { title: 'Verify it’s you', sub: 'Enter the 6-digit code from your authenticator app.' },
};

export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { login, verify2fa, register } = useAuth();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'signin');
  const [f, setF] = useState({ identifier: '', password: '', firstName: '', lastName: '', email: '', phone: '', code: '', newPassword: '' });
  const [offers, setOffers] = useState(false);
  const [show, setShow] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const go = (m: Mode) => { setMode(m); setError(''); setInfo(''); };
  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  async function submit() {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'signin') {
        const r = await login(f.identifier.trim(), f.password);
        if (r.step === 'done') return done();
        if (r.step === '2fa') { setTempToken(r.tempToken); return go('2fa'); }
        setError('This account must finish two-factor setup on forky.ca first.');
      } else if (mode === '2fa') {
        await verify2fa(tempToken, f.code.trim());
        done();
      } else if (mode === 'signup') {
        const body: Record<string, unknown> = { firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), password: f.password, marketingEmailConsent: offers };
        if (f.phone.trim()) body.phone = f.phone.trim();
        if (await register(body)) return done();
        setMode('signin');
        setF((p) => ({ ...p, identifier: f.email.trim() }));
        setInfo('Account created! Sign in to continue.');
      } else if (mode === 'forgot') {
        await api.forgotPassword(f.identifier.trim());
        setMode('reset');
        setInfo(`If an account exists for ${f.identifier.trim()}, a code is on its way.`);
      } else {
        await api.resetPassword({ identifier: f.identifier.trim(), code: f.code.trim(), newPassword: f.newPassword });
        setMode('signin');
        setF((p) => ({ ...p, password: '' }));
        setInfo('Password updated. Sign in with your new password.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const tabs = mode === 'signin' || mode === 'signup';
  const cta = { signin: 'Sign in', signup: 'Create account', forgot: 'Send code', reset: 'Update password', '2fa': 'Verify' }[mode];

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand }}>
      <SafeAreaView edges={['top']} style={s.hero}>
        <Pressable scaleTo={0.78} onPress={done} style={s.close} accessibilityLabel="Close" hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
        <View style={s.heroBody}>
          <Image source={require('../../assets/images/logo-round.png')} style={s.logo} accessibilityLabel="Forky" />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{COPY[mode].title}</Text>
            <Text style={s.sub}>{COPY[mode].sub}</Text>
          </View>
        </View>
        <View style={s.blobA} pointerEvents="none" />
        <View style={s.blobB} pointerEvents="none" />
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {tabs && (
            <View style={s.tabs} accessibilityRole="tablist">
              {(['signin', 'signup'] as const).map((m) => (
                <Pressable key={m} onPress={() => go(m)} style={[s.tab, mode === m && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
                  <Text style={[s.tabText, mode === m && s.tabTextOn]}>{m === 'signin' ? 'Sign in' : 'Create account'}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {info ? <Banner tone="ok" text={info} /> : null}
          {error ? <Banner tone="err" text={error} /> : null}

          {mode === 'signup' && (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field style={{ flex: 1 }} icon="person-outline" placeholder="First name" value={f.firstName} onChangeText={set('firstName')} autoComplete="given-name" />
                <Field style={{ flex: 1 }} icon="person-outline" placeholder="Last name" value={f.lastName} onChangeText={set('lastName')} autoComplete="family-name" />
              </View>
              <Field icon="mail-outline" placeholder="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Field icon="call-outline" placeholder="Phone (optional)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" />
            </>
          )}

          {(mode === 'signin' || mode === 'forgot' || mode === 'reset') && (
            <Field icon="person-circle-outline" placeholder="Email or phone" value={f.identifier} onChangeText={set('identifier')} autoCapitalize="none" autoComplete="username" />
          )}

          {(mode === 'reset' || mode === '2fa') && (
            <Field icon="keypad-outline" placeholder={mode === '2fa' ? '6-digit code' : 'Code'} value={f.code} onChangeText={set('code')} keyboardType="number-pad" autoComplete="one-time-code" />
          )}

          {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
            <Field
              icon="lock-closed-outline"
              placeholder={mode === 'reset' ? 'New password (8+ characters)' : mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
              value={mode === 'reset' ? f.newPassword : f.password}
              onChangeText={set(mode === 'reset' ? 'newPassword' : 'password')}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              right={
                <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                  <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
                </Pressable>
              }
            />
          )}

          {mode === 'signin' && (
            <Pressable onPress={() => go('forgot')} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
              <Text style={s.link}>Forgot password?</Text>
            </Pressable>
          )}

          {mode === 'signup' && (
            <View style={s.offers}>
              <Switch value={offers} onValueChange={setOffers} trackColor={{ true: colors.brand, false: colors.line }} thumbColor="#FFFFFF" />
              <Text style={s.offersText}>Send me offers and updates by email</Text>
            </View>
          )}

          <Pressable onPress={submit} disabled={busy} style={[s.cta, busy && { opacity: 0.7 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={s.ctaText}>{cta}</Text>}
          </Pressable>

          {mode === 'signup' && <Text style={s.legal}>By creating an account you agree to Forky’s Terms of Service and Privacy Policy.</Text>}

          {!tabs && (
            <Pressable onPress={() => go('signin')} style={{ alignSelf: 'center' }} hitSlop={8}>
              <Text style={s.link}>← Back to sign in</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ icon, right, style, ...rest }: Omit<TextInputProps, 'style'> & { style?: ViewStyle; icon: keyof typeof Ionicons.glyphMap; right?: React.ReactNode }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.field, focus && s.fieldOn, style]}>
      <Ionicons name={icon} size={18} color={focus ? colors.brandDeep : colors.muted} />
      <TextInput
        {...rest}
        onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
        placeholderTextColor={colors.muted}
        style={s.input}
        accessibilityLabel={rest.placeholder}
      />
      {right}
    </View>
  );
}

function Banner({ tone, text }: { tone: 'ok' | 'err'; text: string }) {
  const ok = tone === 'ok';
  return (
    <View style={[s.banner, { backgroundColor: ok ? '#E3F1EA' : '#FDE8E6' }]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={ok ? colors.green : '#B3261E'} />
      <Text style={[s.bannerText, { color: ok ? '#1D5A3A' : '#8C1D18' }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.brand, paddingHorizontal: 20, paddingBottom: 34, overflow: 'hidden' },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
  logo: { width: 64, height: 64 },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink, opacity: 0.8, marginTop: 2 },
  blobA: { position: 'absolute', right: -40, top: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)' },
  blobB: { position: 'absolute', right: 70, bottom: -60, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.1)' },

  sheet: { flex: 1, marginTop: -22, backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  form: { padding: 20, paddingBottom: 40, gap: 12 },
  tabs: { flexDirection: 'row', backgroundColor: colors.sand, borderRadius: 14, padding: 3, marginBottom: 4 },
  tab: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.surface, shadowColor: '#1C1A17', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  tabTextOn: { fontFamily: fonts.bold, color: colors.ink },

  field: { height: 48, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  fieldOn: { borderColor: colors.brand },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink, minWidth: 0 },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandText },
  offers: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offersText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  cta: { height: 50, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  legal: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted, textAlign: 'center', lineHeight: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 13 },
});
