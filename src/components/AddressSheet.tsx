import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCatalog } from '@/catalog';
import { mapboxEnabled, searchAddress, type Place } from '@/mapbox';
import { colors, fonts } from '@/theme';

/** Bottom sheet to change the delivery address — e.g. when ordering for someone else. */
export function AddressSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { deliverTo, selectLocation, geo } = useCatalog();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ q: string; list: Place[] } | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<Place | null>(null);
  const [notes, setNotes] = useState('');

  const term = q.trim();
  const searching = term.length >= 3 && results?.q !== term && !error;

  // Debounced Mapbox autocomplete; state is only set from the timer callback.
  useEffect(() => {
    if (term.length < 3 || !mapboxEnabled) return;
    const id = setTimeout(async () => {
      try {
        const list = await searchAddress(term, geo ?? undefined);
        setResults({ q: term, list });
        setError('');
      } catch {
        setError('Could not search addresses. Check your connection.');
      }
    }, 300);
    return () => clearTimeout(id);
  }, [term, geo]);

  const close = () => {
    setQ('');
    setPicked(null);
    setNotes('');
    setError('');
    onClose();
  };
  const confirm = () => {
    if (picked) selectLocation({ ...picked, notes: notes.trim() || undefined });
    close();
  };
  const useCurrent = () => {
    selectLocation(null);
    close();
  };

  const list = term.length >= 3 && results?.q === term ? results.list : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={a.head}>
            <Text style={a.h1}>{picked ? 'Confirm address' : 'Deliver to'}</Text>
            <Pressable scaleTo={0.78} onPress={close} style={a.close} accessibilityLabel="Close" hitSlop={8}>
              <Ionicons name="close" size={19} color={colors.ink} />
            </Pressable>
          </View>

          {picked ? (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={a.card}>
                <Ionicons name="location" size={19} color={colors.brandDeep} />
                <View style={{ flex: 1 }}>
                  <Text style={a.name}>{picked.line1}</Text>
                  <Text style={a.sub}>{[picked.city, picked.province, picked.postalCode].filter(Boolean).join(', ')}</Text>
                </View>
                <Pressable onPress={() => setPicked(null)} hitSlop={8}><Text style={a.link}>Change</Text></Pressable>
              </View>
              <Text style={a.label}>Unit, buzzer or recipient <Text style={a.sub}>· optional</Text></Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="e.g. Apt 12, ring Sam's bell" placeholderTextColor={colors.muted} style={[a.input, { height: 45 }]} accessibilityLabel="Delivery notes" />
              <Pressable onPress={confirm} style={a.primary} accessibilityRole="button">
                <Text style={a.primaryText}>Deliver here</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <>
              <View style={{ paddingHorizontal: 16, gap: 12 }}>
                <View style={a.search}>
                  <Ionicons name="search" size={17} color={colors.muted} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search a street address"
                    placeholderTextColor={colors.muted}
                    style={a.searchInput}
                    autoFocus
                    autoCorrect={false}
                    returnKeyType="search"
                    accessibilityLabel="Search address"
                  />
                  {searching ? <ActivityIndicator color={colors.brand} /> : null}
                </View>
                <Pressable onPress={useCurrent} style={a.row} accessibilityRole="button">
                  <View style={a.icon}><Ionicons name="navigate" size={15} color={colors.brandText} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={a.name}>Use my current location</Text>
                    <Text style={a.sub} numberOfLines={1}>{deliverTo && !deliverTo.custom ? deliverTo.label : 'Detect with GPS'}</Text>
                  </View>
                  {deliverTo && !deliverTo.custom ? <Ionicons name="checkmark-circle" size={17} color={colors.green} /> : null}
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }} keyboardShouldPersistTaps="handled">
                {!mapboxEnabled && <Text style={a.warn}>Address search needs a Mapbox token (EXPO_PUBLIC_MAPBOX_TOKEN). You can still use your current location.</Text>}
                {error ? <Text style={a.warn}>{error}</Text> : null}
                {deliverTo?.custom && term.length < 3 ? (
                  <View style={a.row}>
                    <View style={a.icon}><Ionicons name="location" size={15} color={colors.brandText} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={a.name}>{deliverTo.label}</Text>
                      <Text style={a.sub}>{deliverTo.notes ?? 'Currently selected'}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={17} color={colors.green} />
                  </View>
                ) : null}
                {list.map((p) => (
                  <Pressable key={`${p.lat},${p.lng},${p.label}`} onPress={() => setPicked(p)} style={a.row} accessibilityRole="button">
                    <View style={a.icon}><Ionicons name="location-outline" size={15} color={colors.brandText} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={a.name} numberOfLines={1}>{p.line1}</Text>
                      <Text style={a.sub} numberOfLines={1}>{[p.city, p.province, p.postalCode].filter(Boolean).join(', ')}</Text>
                    </View>
                  </Pressable>
                ))}
                {term.length >= 3 && results?.q === term && list.length === 0 ? <Text style={a.sub}>No matches for “{term}”.</Text> : null}
              </ScrollView>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const a = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  h1: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  search: { height: 45, borderRadius: 22, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandTintSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandText },
  warn: { fontFamily: fonts.medium, fontSize: 12, color: '#8A3208', backgroundColor: '#FFE8DC', borderRadius: 10, padding: 12, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 15, padding: 14 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  input: { borderRadius: 14, backgroundColor: colors.surface, paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  primary: { height: 48, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
