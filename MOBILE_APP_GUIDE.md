# NomadPilot Mobile App — React Native Setup

## Overview
The mobile app wraps your existing Next.js backend using React Native + Expo.
It uses the same Supabase auth and APIs — no backend changes needed.

## Quick Start

```bash
npx create-expo-app NomadPilotMobile --template blank-typescript
cd NomadPilotMobile
npx expo install expo-router expo-web-browser expo-secure-store
npm install @supabase/supabase-js @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-safe-area-context react-native-screens
```

## Environment (.env)
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_BASE=https://your-vercel-app.vercel.app
```

## Core App File: app/_layout.tsx
```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: '#0a1628', borderTopColor: '#1e3358' },
      tabBarActiveTintColor: '#e8a020',
      tabBarInactiveTintColor: '#4e6585',
      headerStyle: { backgroundColor: '#0a1628' },
      headerTintColor: '#e8dcc8',
    }}>
      <Tabs.Screen name="index"       options={{ title: 'Search',      tabBarIcon: ({ color }) => <Ionicons name="search" size={22} color={color} /> }} />
      <Tabs.Screen name="mytrips"     options={{ title: 'My Trips',    tabBarIcon: ({ color }) => <Ionicons name="airplane" size={22} color={color} /> }} />
      <Tabs.Screen name="destination" options={{ title: 'Destination', tabBarIcon: ({ color }) => <Ionicons name="earth" size={22} color={color} /> }} />
      <Tabs.Screen name="account"     options={{ title: 'Account',     tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} /> }} />
    </Tabs>
  );
}
```

## Search Screen: app/index.tsx
```tsx
import { WebView } from 'react-native-webview';

// Simplest approach: embed your web app in a WebView
export default function SearchScreen() {
  return (
    <WebView
      source={{ uri: 'https://your-app.vercel.app' }}
      style={{ flex: 1 }}
      injectedJavaScript={`
        // Hide the header and tab nav since we use native ones
        document.querySelector('header').style.display = 'none';
        document.querySelector('[data-tab-nav]').style.display = 'none';
      `}
    />
  );
}
```

## Push Notifications (Expo Push)
```tsx
// In your app entry point
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Send token to your backend
  await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/api/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId, subscription: token, type: 'subscribe' }),
  });
  
  return token;
}
```

## Supabase Auth in React Native
```tsx
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,         // React Native secure storage
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

## My Trips Screen: app/mytrips.tsx
```tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function MyTripsScreen() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    supabase
      .from('my_trips')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTrips(data || []));
  }, []);

  return (
    <FlatList
      data={trips}
      style={{ backgroundColor: '#0a1628', flex: 1 }}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.type} via {item.partner_name}</Text>
          <Text style={styles.sub}>{item.details?.from} → {item.details?.to}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card:  { backgroundColor: '#0f1f3d', margin: 12, padding: 16, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#e8a020' },
  title: { color: '#e8dcc8', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sub:   { color: '#8fa3c0', fontSize: 13 },
});
```

## App Store Deployment
1. `npx expo build:ios` / `npx expo build:android`
2. For iOS: Need Apple Developer account ($99/year)
3. For Android: Need Google Play Developer account ($25 one-time)
4. Or use `expo-updates` for OTA updates without app store approval

## Recommended Timeline
- Week 1: Set up Expo app, WebView embedding your web app → working mobile app
- Week 2: Native screens for Search, My Trips, Account
- Week 3: Push notifications, offline support
- Week 4: App store submission
