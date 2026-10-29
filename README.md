# Forky — customer app (Expo / React Native)

Food, grocery, convenience and pharmacy delivery for Forky, built from the Forky canvas design.
Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android), or press `a` / `i` / `w` for Android emulator, iOS simulator or web.
Everything used here ships in Expo Go — no custom native build needed.

## What's inside

```
src/
  app/
    _layout.tsx            fonts, cart provider, root stack
    (tabs)/_layout.tsx     custom bottom bar: Home · Explore · raised Cart · Orders · Profile
    (tabs)/index.tsx       Home — search + Delivery/Pickup toggle, Shop-by grid, Combine & save,
                           Order again, store carousels, deal tickets, stores around you
    (tabs)/explore.tsx     search + category filter over all stores
    (tabs)/cart.tsx        combined multi-store checkout (one delivery fee, tip, HST, priority)
    (tabs)/orders.tsx      live tracking (illustrated map, driver pulse, steps, driver card)
    (tabs)/profile.tsx     account menu incl. "Partner with Forky"
    store/[id].tsx         restaurant menu or grocery aisle grid, floating cart bar + combine nudge
  components/
    ModeToggle.tsx         icon-only Delivery/Pickup toggle; active tab springs its label out
    ui.tsx                 StoreCard, DealTicket, Stepper, Photo placeholder, Monogram, buttons
  cart.tsx                 cart + delivery/pickup state (React context)
  data.ts                  sample stores, menus, products, deals — replace with your API
  theme.ts                 colours (#FF6819 from the logo), fonts, radii, shadows
```

## Behaviour worth knowing

- **Delivery / Pickup** is global state: switching it updates ETAs, fees vs. distance, wording,
  and hides delivery-only lines (tip, delivery fee, speed) at checkout.
- **Combined orders:** the cart groups items by store and charges one delivery fee — the highest
  fee among the stores — and shows the saving versus separate orders. Change the rule in `cart.tsx`.
- The cart starts with demo items (`DEMO` in `cart.tsx`) so checkout isn't empty — set it to `{}`.
- Photos are tinted placeholders (`Photo` in `ui.tsx`); swap in `<Image>` with merchant banner URLs.
- The tracking map is illustrated with `react-native-svg`; swap for `react-native-maps` and live
  driver coordinates when your dispatch backend is ready.
- Taxes use Ontario HST (13%) and a flat $1.99 service fee — constants at the top of `src/app/(tabs)/cart.tsx`.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npx expo lint
```
