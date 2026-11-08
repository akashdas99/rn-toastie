import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Toaster, toast } from 'rn-toastie';
import type {
  ToastAnimationPreset, ToastOffset, ToastPeekSide, ToastPosition, ToastStyles,
} from 'rn-toastie';

type PeekSideChoice = ToastPeekSide | 'default';
const PEEK_SIDES: PeekSideChoice[] = ['default', 'top', 'bottom'];

const TOP_POSITIONS: ToastPosition[] = ['top', 'top-left', 'top-center', 'top-right'];
const BOTTOM_POSITIONS: ToastPosition[] = ['bottom', 'bottom-left', 'bottom-center', 'bottom-right'];

const PRESETS: ToastAnimationPreset[] = ['slide', 'fade', 'scale', 'none'];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const OFFSET_CHOICES: { label: string; value: number }[] = [
  { label: 'default', value: 0 },
  { label: '56px inset', value: 56 },
];

function TypeIcon({ glyph, color }: { glyph: string; color: string }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: `${color}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontWeight: '700', fontSize: 14 }}>{glyph}</Text>
    </View>
  );
}

function brandedToastStyles(dark: boolean): ToastStyles {
  return {
    toast: { borderRadius: 12, paddingVertical: 14 },
    title: { fontSize: 15, fontWeight: '700' },
    progressTrack: {
      start: 16,
      end: 16,
      bottom: 6,
      height: 3,
      backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    },
    progress: { height: 3, borderRadius: 2, opacity: 1 },
    success: {
      toast: {
        backgroundColor: dark ? '#052E16' : '#ECFDF5',
        borderColor: dark ? '#166534' : '#86EFAC',
      },
      title: { color: dark ? '#86EFAC' : '#14532D' },
    },
    error: {
      toast: {
        backgroundColor: dark ? '#450A0A' : '#FEF2F2',
        borderColor: dark ? '#991B1B' : '#FCA5A5',
      },
      title: { color: dark ? '#FCA5A5' : '#7F1D1D' },
      progress: { backgroundColor: dark ? '#F87171' : '#DC2626' },
    },
    info: {
      toast: {
        backgroundColor: dark ? '#172554' : '#EFF6FF',
        borderColor: dark ? '#1D4ED8' : '#93C5FD',
      },
      title: { color: dark ? '#93C5FD' : '#1E3A8A' },
    },
  };
}

type Palette = {
  bg: string;
  text: string;
  button: string;
  buttonText: string;
  chip: string;
  cardBg: string;
  cardBorder: string;
};

function AppBody() {
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [preset, setPreset] = useState<ToastAnimationPreset>('slide');
  const [position, setPosition] = useState<ToastPosition>('top');
  const [newestOnTop, setNewestOnTop] = useState(true);
  const [stacked, setStacked] = useState(true);
  const [peekSide, setPeekSide] = useState<PeekSideChoice>('default');
  const [globalStyles, setGlobalStyles] = useState(false);
  const [edgeInset, setEdgeInset] = useState(0);
  const [keyboardNote, setKeyboardNote] = useState('');

  const palette: Palette = useMemo(
    () =>
      dark
        ? {
            bg: '#09090B',
            text: '#FAFAFA',
            button: '#FAFAFA',
            buttonText: '#18181B',
            chip: '#27272A',
            cardBg: '#18181B',
            cardBorder: '#3F3F46',
          }
        : {
            bg: '#FFFFFF',
            text: '#18181B',
            button: '#18181B',
            buttonText: '#FFFFFF',
            chip: '#F4F4F5',
            cardBg: '#FAFAFA',
            cardBorder: '#E4E4E7',
          },
    [dark],
  );

  const coreDemos: { label: string; run: () => void }[] = useMemo(
    () => [
      { label: 'Default', run: () => toast('Saved') },
      {
        label: 'Success',
        run: () => toast.success('Payment complete', { description: 'Ref #12345' }),
      },
      {
        label: 'Error',
        run: () => toast.error('Upload failed', { description: 'Check your connection' }),
      },
      { label: 'Info', run: () => toast.info('New version available') },
      {
        label: 'Loading, then success',
        run: () => {
          const id = toast.loading('Uploading...');
          setTimeout(
            () => toast.update(id, { type: 'success', title: 'Uploaded', duration: 3000 }),
            2000,
          );
        },
      },
      {
        label: 'Promise',
        run: () => {
          toast.promise(wait(2000), { loading: 'Saving...', success: 'Saved', error: 'Failed' });
        },
      },
      {
        label: 'With action',
        run: () =>
          toast('Message deleted', {
            action: { label: 'Undo', onPress: () => toast.success('Restored') },
            duration: 6000,
          }),
      },
      {
        label: 'Styled variants',
        run: () => {
          toast.success('Payment received');
          setTimeout(() => toast.error('Card expired', { description: 'Update billing' }), 400);
          setTimeout(() => toast.info('Receipt emailed'), 900);
        },
      },
    ],
    [],
  );

  const customDemos: { label: string; run: () => void }[] = useMemo(
    () => [
      {
        label: 'Custom: feedback',
        run: () =>
          toast.custom(
            ({ dismiss, theme }) => (
              <View
                style={[
                  styles.feedbackCard,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.feedbackContext, { color: theme.description }]}>
                  You tried the rn-toastie demos (types, layout, position).
                </Text>
                <Text style={[styles.feedbackTitle, { color: theme.title }]}>
                  Was this example helpful?
                </Text>
                <Text style={[styles.feedbackHint, { color: theme.description }]}>
                  Quick feedback helps shape the library.
                </Text>
                <View style={styles.feedbackRow}>
                  <Pressable
                    style={[styles.feedbackBtn, { backgroundColor: theme.actionBackground }]}
                    onPress={() => {
                      dismiss();
                      toast.success('Thanks for the thumbs up');
                    }}
                  >
                    <Text style={{ color: theme.actionText, fontWeight: '600' }}>Yes</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.feedbackBtn, { backgroundColor: theme.actionBackground }]}
                    onPress={() => {
                      dismiss();
                      toast.info("Thanks, we'll use that to improve the example");
                    }}
                  >
                    <Text style={{ color: theme.actionText, fontWeight: '600' }}>No</Text>
                  </Pressable>
                </View>
              </View>
            ),
            {
              duration: Infinity,
              accessibilityLabel: 'Feedback after trying the demos: was this example helpful, yes or no',
            },
          ),
      },
      {
        label: 'Custom: banner',
        run: () =>
          toast.custom(
            ({ dismiss }) => (
              <View style={styles.banner}>
                <Text style={styles.bannerTitle}>50% off Pro</Text>
                <Text style={styles.bannerText}>Upgrade before Sunday to keep the discount.</Text>
                <Pressable style={styles.bannerButton} onPress={dismiss}>
                  <Text style={styles.bannerButtonText}>Got it</Text>
                </Pressable>
              </View>
            ),
            { duration: 6000, accessibilityLabel: '50% off Pro until Sunday' },
          ),
      },
    ],
    [],
  );

  const scrollContentStyle = useMemo(
    () => [
      styles.screen,
      {
        paddingTop: Math.max(insets.top, 16) + 8,
        paddingBottom: 16,
      },
    ],
    [insets.bottom, insets.top],
  );

  const keyboardFooterStyle = useMemo(
    () => [
      styles.keyboardFooter,
      {
        borderTopColor: palette.cardBorder,
        backgroundColor: palette.bg,
        paddingBottom: Math.max(insets.bottom, 12),
      },
    ],
    [insets.bottom, palette.bg, palette.cardBorder],
  );

  const cardStyle = useMemo(
    () => [
      styles.card,
      { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
    ],
    [palette.cardBg, palette.cardBorder],
  );

  const chipStyle = useCallback(
    (selected: boolean) => [
      styles.chip,
      {
        backgroundColor: selected ? palette.button : palette.chip,
        borderColor: selected ? palette.button : palette.cardBorder,
        minHeight: 34,
      },
    ],
    [palette],
  );

  const positionChip = useCallback(
    (p: ToastPosition) => (
      <Pressable
        key={p}
        android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
        onPress={() => {
          setPosition(p);
          toast.info(`Position: ${p}`);
        }}
        style={({ pressed }) => [
          chipStyle(p === position),
          pressed && Platform.OS !== 'android' && { opacity: 0.85 },
        ]}
      >
        <Text style={{ color: p === position ? palette.buttonText : palette.text }}>{p}</Text>
      </Pressable>
    ),
    [chipStyle, palette.buttonText, palette.text, position],
  );

  const presetChip = useCallback(
    (p: ToastAnimationPreset) => (
      <Pressable
        key={p}
        android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
        onPress={() => setPreset(p)}
        style={({ pressed }) => [
          chipStyle(p === preset),
          pressed && Platform.OS !== 'android' && { opacity: 0.85 },
        ]}
      >
        <Text style={{ color: p === preset ? palette.buttonText : palette.text }}>{p}</Text>
      </Pressable>
    ),
    [chipStyle, palette.buttonText, palette.text, preset],
  );

  const primaryBtn = useCallback(
    (label: string, onPress: () => void, key: string) => (
      <Pressable
        key={key}
        android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false, foreground: true }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.button },
          pressed && Platform.OS !== 'android' && { opacity: 0.92 },
        ]}
      >
        <Text style={[styles.buttonText, { color: palette.buttonText }]}>{label}</Text>
      </Pressable>
    ),
    [palette],
  );

  const toasterOffset = useMemo((): ToastOffset | undefined => {
    if (!edgeInset) return undefined;
    if (position.startsWith('top')) return { top: edgeInset };
    if (position.startsWith('bottom')) return { bottom: edgeInset };
    return undefined;
  }, [edgeInset, position]);

  const toasterStyles = useMemo(
    () => (globalStyles ? brandedToastStyles(dark) : undefined),
    [dark, globalStyles],
  );

  const toasterIcons = useMemo(
    () =>
      globalStyles
        ? {
            success: <TypeIcon glyph="✓" color="#16A34A" />,
            error: <TypeIcon glyph="!" color="#DC2626" />,
            info: <TypeIcon glyph="i" color="#2563EB" />,
          }
        : undefined,
    [globalStyles],
  );

  return (
    <>
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.title, { color: palette.text }]}>rn-toastie</Text>
          <Text style={[styles.subtitle, { color: palette.text }]}>
            Built-in and custom toasts. Toggle global styles, offset, peek side, and layout on the
            main Toaster; the keyboard footer uses a second toaster with avoidKeyboard.
          </Text>

          <Text style={[styles.sectionHeading, { color: palette.text }]}>Toaster</Text>
          <View style={cardStyle}>
            <Text style={[styles.label, { color: palette.text }]}>Position</Text>
            <Text style={[styles.subLabel, { color: palette.text }]}>Top row</Text>
            <View style={styles.chips}>{TOP_POSITIONS.map(positionChip)}</View>
            <Text style={[styles.subLabel, { color: palette.text }]}>Bottom row</Text>
            <View style={styles.chips}>{BOTTOM_POSITIONS.map(positionChip)}</View>
  
            <Text style={[styles.label, { color: palette.text }]}>Animation</Text>
            <View style={styles.chips}>{PRESETS.map(presetChip)}</View>
  
            <Text style={[styles.label, { color: palette.text }]}>Layout</Text>
            <View style={styles.chips}>
              {[true, false].map((v) => (
                <Pressable
                  key={String(v)}
                  android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
                  onPress={() => setStacked(v)}
                  style={({ pressed }) => [
                    chipStyle(v === stacked),
                    pressed && Platform.OS !== 'android' && { opacity: 0.85 },
                  ]}
                >
                  <Text style={{ color: v === stacked ? palette.buttonText : palette.text }}>
                    {v ? 'stacked' : 'list'}
                  </Text>
                </Pressable>
              ))}
            </View>
  
            <Text style={[styles.label, { color: palette.text }]}>Stack order</Text>
            <View style={styles.chips}>
              {[true, false].map((v) => (
                <Pressable
                  key={String(v)}
                  android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
                  onPress={() => setNewestOnTop(v)}
                  style={({ pressed }) => [
                    chipStyle(v === newestOnTop),
                    pressed && Platform.OS !== 'android' && { opacity: 0.85 },
                  ]}
                >
                  <Text style={{ color: v === newestOnTop ? palette.buttonText : palette.text }}>
                    {v ? 'newest on top' : 'newest below'}
                  </Text>
                </Pressable>
              ))}
            </View>
  
            <Text style={[styles.label, { color: palette.text }]}>Global styles</Text>
            <Text style={[styles.subLabel, { color: palette.text }]}>
              Per-type card styles and default icons
            </Text>
            <View style={styles.chips}>
              {[false, true].map((v) => (
                <Pressable
                  key={String(v)}
                  android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
                  onPress={() => {
                    setGlobalStyles(v);
                    toast.info(v ? 'Global styles on' : 'Global styles off');
                  }}
                  style={({ pressed }) => [
                    chipStyle(v === globalStyles),
                    pressed && Platform.OS !== 'android' && { opacity: 0.85 },
                  ]}
                >
                  <Text style={{ color: v === globalStyles ? palette.buttonText : palette.text }}>
                    {v ? 'on' : 'off'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: palette.text }]}>Offset</Text>
            <Text style={[styles.subLabel, { color: palette.text }]}>
              Extra inset on the active edge (top or bottom positions)
            </Text>
            <View style={styles.chips}>
              {OFFSET_CHOICES.map(({ label, value }) => (
                <Pressable
                  key={label}
                  android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
                  onPress={() => {
                    setEdgeInset(value);
                    if (value) toast.info(`offset: ${value}px on ${position}`);
                  }}
                  style={({ pressed }) => [
                    chipStyle(edgeInset === value),
                    pressed && Platform.OS !== 'android' && { opacity: 0.85 },
                  ]}
                >
                  <Text style={{ color: edgeInset === value ? palette.buttonText : palette.text }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: palette.text }]}>Peek side</Text>
            <Text style={[styles.subLabel, { color: palette.text }]}>Collapsed deck only</Text>
            <View style={styles.chips}>
              {PEEK_SIDES.map((side) => (
                <Pressable
                  key={side}
                  android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
                  onPress={() => {
                    setPeekSide(side);
                    if (stacked) toast.info(`peekSide: ${side}`);
                  }}
                  style={({ pressed }) => [
                    chipStyle(peekSide === side),
                    pressed && Platform.OS !== 'android' && { opacity: 0.85 },
                  ]}
                >
                  <Text style={{ color: peekSide === side ? palette.buttonText : palette.text }}>
                    {side}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
  
          <Text style={[styles.sectionHeading, { color: palette.text }]}>Demos</Text>
          <View style={cardStyle}>
            <Text style={[styles.subLabel, { color: palette.text }]}>Built-in</Text>
            <View style={styles.demoGroup}>
              {coreDemos.map((d) => primaryBtn(d.label, d.run, d.label))}
            </View>
  
            <Text style={[styles.subLabelSpaced, { color: palette.text }]}>Custom</Text>
            <View style={styles.demoGroup}>
              {customDemos.map((d) => primaryBtn(d.label, d.run, d.label))}
            </View>
  
            <Text style={[styles.subLabelSpaced, { color: palette.text }]}>Utilities</Text>
            <View style={styles.demoGroup}>
              <Pressable
                android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false, foreground: true }}
                onPress={() => toast.info('No close button here', { closeButton: false })}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: palette.button },
                  pressed && Platform.OS !== 'android' && { opacity: 0.92 },
                ]}
              >
                <Text style={[styles.buttonText, { color: palette.buttonText }]}>
                  Without close button
                </Text>
              </Pressable>
              <Pressable
                android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false, foreground: true }}
                onPress={() => toast.dismiss()}
                style={({ pressed }) => [
                  styles.buttonOutline,
                  { borderColor: palette.cardBorder },
                  pressed && Platform.OS !== 'android' && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.buttonText, { color: palette.text }]}>Dismiss all</Text>
              </Pressable>
            </View>
          </View>
  
          <StatusBar style="auto" />
        </ScrollView>

        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={insets.top}>
          <View style={keyboardFooterStyle}>
            <Text style={[styles.sectionHeading, { color: palette.text, marginTop: 0 }]}>
              Keyboard
            </Text>
            <View style={cardStyle}>
              <Text style={[styles.keyboardHint, { color: palette.text }]}>
                The field stays in this footer. Toasts use a bottom toaster with avoidKeyboard
                and keyboardOffset.
              </Text>
              <TextInput
                value={keyboardNote}
                onChangeText={setKeyboardNote}
                placeholder="Type a note..."
                placeholderTextColor={dark ? '#71717A' : '#A1A1AA'}
                style={[
                  styles.textInput,
                  {
                    color: palette.text,
                    borderColor: palette.cardBorder,
                    backgroundColor: dark ? '#27272A' : '#FFFFFF',
                  },
                ]}
                returnKeyType="done"
                onSubmitEditing={() =>
                  toast.success(keyboardNote.trim() || 'Saved note', { toasterId: 'keyboard' })
                }
              />
              <Pressable
                android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false, foreground: true }}
                onPress={() =>
                  toast.info('Sitting above the keyboard', {
                    toasterId: 'keyboard',
                    duration: 5000,
                  })
                }
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: palette.button },
                  pressed && Platform.OS !== 'android' && { opacity: 0.92 },
                ]}
              >
                <Text style={[styles.buttonText, { color: palette.buttonText }]}>Show toast</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      <Toaster
        position={position}
        maxWidth={300}
        offset={toasterOffset}
        animation={{ preset }}
        newestOnTop={newestOnTop}
        stacked={stacked}
        peekSide={peekSide === 'default' ? undefined : peekSide}
        styles={toasterStyles}
        icons={toasterIcons}
      />
      <Toaster
        id="keyboard"
        position="bottom"
        avoidKeyboard
        keyboardOffset={12}
      />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppBody />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  keyboardFooter: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  title: { fontSize: 28, fontWeight: '700', alignSelf: 'center' },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 8,
    maxWidth: 400,
    lineHeight: 21,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.65,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 420,
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  label: { fontSize: 13, fontWeight: '600', opacity: 0.8, marginTop: 6 },
  subLabel: { fontSize: 11, fontWeight: '600', opacity: 0.55, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  subLabelSpaced: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.55,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  demoGroup: { width: '100%', gap: 8 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 4,
    width: '100%',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
    alignItems: 'center',
  },
  buttonOutline: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonText: { fontWeight: '600', fontSize: 15 },
  keyboardHint: { fontSize: 13, lineHeight: 19, opacity: 0.75, marginBottom: 4 },
  textInput: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 4,
  },
  feedbackCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  feedbackContext: { fontSize: 12, lineHeight: 17, opacity: 0.95 },
  feedbackTitle: { fontWeight: '600', fontSize: 15 },
  feedbackHint: { fontSize: 13, lineHeight: 18 },
  feedbackRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  feedbackBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  banner: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  bannerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  bannerText: { color: '#E0E7FF', fontSize: 13 },
  bannerButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  bannerButtonText: { color: '#4F46E5', fontWeight: '700' },
});
