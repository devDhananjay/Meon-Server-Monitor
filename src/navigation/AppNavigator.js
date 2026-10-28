import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, DrawerActions } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassChip, glassSurface } from '../theme/glass';
import DrawerMenuButton from '../components/DrawerMenuButton';
import GlassBackButton from '../components/GlassBackButton';
import ThemeToggleButton from '../components/ThemeToggleButton';
import {
  IconActivity,
  IconGauge,
  IconLink,
  IconLock,
  IconLogout,
  IconMail,
  IconServer,
  IconShield,
  IconUser,
  IconUsers,
} from '../components/Icons';
import LoginScreen from '../screens/LoginScreen';
import OverviewScreen from '../screens/OverviewScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ServerDetailScreen from '../screens/ServerDetailScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import MailAlertsScreen from '../screens/MailAlertsScreen';
import ReverseProxyScreen from '../screens/ReverseProxyScreen';
import RiskScreen from '../screens/RiskScreen';
import SecurityScreen from '../screens/SecurityScreen';
import UserAccessScreen from '../screens/UserAccessScreen';
import ProductApisScreen from '../screens/ProductApisScreen';
import UsageApisScreen from '../screens/UsageApisScreen';
import NotificationDeepLinkBridge from '../components/NotificationDeepLinkBridge';
import { navigationRef } from './navigationRef';

const Drawer = createDrawerNavigator();
const RootStack = createNativeStackNavigator();

const SHARED_HEADER = {
  headerTitleAlign: 'left',
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '700', fontSize: 17, letterSpacing: -0.2 },
};

function NavItem({ label, hint, active, onPress, c, theme, icon: Icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          marginHorizontal: 12,
          marginVertical: 4,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 16,
          overflow: 'hidden',
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          ...(active ? glassChip(true, c, theme) : {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }),
        },
      ]}
    >
      {active ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '48%',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        />
      ) : null}
      {Icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? `${c.cyan}22` : c.inputBg,
            borderWidth: 1,
            borderColor: active ? `${c.cyan}44` : c.line,
          }}
        >
          <Icon size={16} color={active ? c.cyan : c.muted} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: active ? c.cyan : c.text, fontWeight: '700', fontSize: 15 }}>{label}</Text>
        {hint ? <Text style={{ color: c.muted, marginTop: 2, fontSize: 11 }}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

function DrawerActionButton({ label, onPress, c, theme, danger, icon: Icon }) {
  const glass = glassSurface(c, theme);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          overflow: 'hidden',
          opacity: pressed ? 0.85 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          ...(danger
            ? {
                backgroundColor: 'rgba(255,91,119,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(255,91,119,0.28)',
                borderTopColor: 'rgba(255,180,190,0.35)',
              }
            : glass),
        },
      ]}
    >
      {!danger ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        />
      ) : null}
      {Icon ? <Icon size={16} color={danger ? c.red : c.text} /> : null}
      <Text style={{ color: danger ? c.red : c.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function CustomDrawerContent(props) {
  const {
    theme, currentUser, handleLogout, canManageUsers, canManageProducts, canManageUsage,
    currentNotifications, stats, liveProducts, displayProducts,
  } = useMonitor();
  const c = getColors(theme);
  const { state, navigation } = props;
  const active = state.routeNames[state.index];
  const [profileOpen, setProfileOpen] = useState(false);
  const liveCount = liveProducts?.length ?? stats?.liveCount ?? displayProducts?.filter(item => item.hasLiveData).length ?? 0;

  const go = (name, params) => {
    navigation.navigate(name, params);
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <Text style={{ color: c.cyan, fontWeight: '900', fontSize: 24, letterSpacing: 1.2 }}>MEON</Text>
        <Text style={{ color: c.muted, marginTop: 4, fontSize: 12 }}>Infrastructure observability</Text>
        <Pressable
          onPress={() => setProfileOpen(true)}
          style={[
            glassSurface(c, theme),
            {
              marginTop: 14,
              padding: 12,
              borderRadius: 16,
              overflow: 'hidden',
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          />
          <Text style={{ color: c.text, fontWeight: '700' }}>{currentUser || 'Signed in'}</Text>
          <Text style={{ color: c.amber, marginTop: 4, fontSize: 12 }}>
            {currentNotifications.length} open notifications · tap for profile
          </Text>
        </Pressable>
      </View>

      <View style={{ paddingTop: 10 }}>
        <NavItem icon={IconActivity} label="Overview" hint="Health center & product grid" active={active === 'Overview'} onPress={() => go('Overview')} c={c} theme={theme} />
        <NavItem
          icon={IconServer}
          label="Servers"
          hint="Jump to product server grid"
          active={false}
          onPress={() => go('Overview', { scrollToServers: true })}
          c={c}
          theme={theme}
        />
        <NavItem icon={IconLink} label="Reverse proxy" hint="Proxy health endpoints" active={active === 'ReverseProxy'} onPress={() => go('ReverseProxy')} c={c} theme={theme} />
        <NavItem icon={IconMail} label="Mail ack" hint="Acknowledge alert emails" active={active === 'MailAlerts'} onPress={() => go('MailAlerts')} c={c} theme={theme} />
        {canManageUsers ? (
          <NavItem icon={IconUsers} label="User access" hint="Users & recipients" active={active === 'UserAccess'} onPress={() => go('UserAccess')} c={c} theme={theme} />
        ) : null}
        {canManageProducts ? (
          <NavItem icon={IconServer} label="Product APIs" hint="Custom product health APIs" active={active === 'ProductApis'} onPress={() => go('ProductApis')} c={c} theme={theme} />
        ) : null}
        {canManageUsage ? (
          <NavItem icon={IconGauge} label="Usage APIs" hint="Usage history & thresholds" active={active === 'UsageApis'} onPress={() => go('UsageApis')} c={c} theme={theme} />
        ) : null}
        <NavItem icon={IconShield} label="Risk management" hint="Product risk checklist" active={active === 'Risk'} onPress={() => go('Risk')} c={c} theme={theme} />
        <NavItem icon={IconLock} label="Security" hint="Password & account security" active={active === 'Security'} onPress={() => go('Security')} c={c} theme={theme} />
      </View>

      <View
        style={[
          glassSurface(c, theme),
          {
            marginHorizontal: 12,
            marginTop: 16,
            padding: 14,
            borderRadius: 18,
            overflow: 'hidden',
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        />
        <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>LIVE TELEMETRY</Text>
        <Text style={{ color: c.cyan, fontSize: 30, fontWeight: '900', marginTop: 4 }}>{liveCount} live</Text>
        <Text style={{ color: c.muted, marginTop: 4, fontSize: 12 }}>
          Product catalogue is always visible; server health appears after sync.
        </Text>
      </View>

      <View style={{ marginTop: 'auto', padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ThemeToggleButton size={46} />
          <View style={{ flex: 1 }}>
            <DrawerActionButton icon={IconUser} label="Profile" onPress={() => setProfileOpen(true)} c={c} theme={theme} />
          </View>
        </View>
        <DrawerActionButton icon={IconLogout} label="Logout" onPress={handleLogout} c={c} theme={theme} danger />
      </View>

      <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
          <View
            style={[
              glassSurface(c, theme),
              {
                backgroundColor: c.panelStrong,
                borderRadius: 22,
                padding: 18,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 60,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
            />
            <Text style={{ color: c.cyan, fontWeight: '800', fontSize: 18 }}>Profile</Text>
            <Text style={{ color: c.muted, marginTop: 4 }}>Signed-in MEON monitor account</Text>
            <Text style={{ color: c.text, marginTop: 14, fontWeight: '700' }}>{currentUser}</Text>
            <Text style={{ color: c.muted, marginTop: 4 }}>Account status: Active</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {[
                { label: 'User access', ok: canManageUsers },
                { label: 'Product APIs', ok: canManageProducts },
                { label: 'Usage APIs', ok: canManageUsage },
              ].map(item => (
                <View
                  key={item.label}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: item.ok ? `${c.green}22` : c.inputBg,
                    borderWidth: 1,
                    borderColor: item.ok ? `${c.green}44` : c.line,
                  }}
                >
                  <Text style={{ color: item.ok ? c.green : c.muted, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <Pressable
                style={[glassSurface(c, theme), { flex: 1, padding: 12, borderRadius: 14 }]}
                onPress={() => setProfileOpen(false)}
              >
                <Text style={{ color: c.text, textAlign: 'center', fontWeight: '700' }}>Close</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: c.cyan }}
                onPress={() => {
                  setProfileOpen(false);
                  go('Security');
                }}
              >
                <Text style={{ color: '#041018', textAlign: 'center', fontWeight: '800' }}>Security</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </DrawerContentScrollView>
  );
}

function MainDrawer() {
  const { theme } = useMonitor();
  const c = getColors(theme);
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        ...SHARED_HEADER,
        headerStyle: {
          backgroundColor: theme === 'light' ? 'rgba(238,247,249,0.92)' : 'rgba(5,14,18,0.92)',
        },
        headerTintColor: c.text,
        drawerStyle: {
          backgroundColor: c.bg,
          width: 304,
          borderRightWidth: 1,
          borderRightColor: c.line,
        },
        sceneStyle: { backgroundColor: c.bg },
        headerLeft: () => <DrawerMenuButton />,
        headerLeftContainerStyle: { paddingLeft: 4 },
      }}
    >
      <Drawer.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          title: 'Overview',
          headerRight: () => <ThemeToggleButton style={{ marginRight: 10 }} />,
          headerRightContainerStyle: { paddingRight: 4 },
        }}
      />
      <Drawer.Screen name="ReverseProxy" component={ReverseProxyScreen} options={{ title: 'Reverse proxy' }} />
      <Drawer.Screen name="MailAlerts" component={MailAlertsScreen} options={{ title: 'Mail ack' }} />
      <Drawer.Screen name="UserAccess" component={UserAccessScreen} options={{ title: 'User access' }} />
      <Drawer.Screen name="ProductApis" component={ProductApisScreen} options={{ title: 'Product APIs' }} />
      <Drawer.Screen name="UsageApis" component={UsageApisScreen} options={{ title: 'Usage APIs' }} />
      <Drawer.Screen name="Risk" component={RiskScreen} options={{ title: 'Risk management' }} />
      <Drawer.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
    </Drawer.Navigator>
  );
}

function AuthenticatedRoot() {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const detailOptions = title => ({
    title,
    headerTitle: title,
    headerLeft: () => <GlassBackButton />,
    headerLeftContainerStyle: { paddingLeft: 4 },
  });

  return (
    <RootStack.Navigator
      screenOptions={{
        ...SHARED_HEADER,
        headerStyle: {
          backgroundColor: theme === 'light' ? 'rgba(238,247,249,0.92)' : 'rgba(5,14,18,0.92)',
        },
        headerTintColor: c.text,
        contentStyle: { backgroundColor: c.bg },
        headerBackTitleVisible: false,
      }}
    >
      <RootStack.Screen name="MainDrawer" component={MainDrawer} options={{ headerShown: false }} />
      <RootStack.Screen name="ProductDetail" component={ProductDetailScreen} options={detailOptions('Product')} />
      <RootStack.Screen name="ServerDetail" component={ServerDetailScreen} options={detailOptions('Server')} />
      <RootStack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={detailOptions('Service')} />
      <RootStack.Screen name="RiskDetail" component={RiskScreen} options={detailOptions('Risk detail')} />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme, currentUser, authChecked } = useMonitor();
  const c = getColors(theme);
  const navTheme = {
    ...(theme === 'light' ? DefaultTheme : DarkTheme),
    colors: {
      ...(theme === 'light' ? DefaultTheme.colors : DarkTheme.colors),
      background: c.bg,
      card: c.panelStrong,
      text: c.text,
      border: c.line,
      primary: c.cyan,
    },
  };

  if (!authChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.muted }}>Checking session…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {currentUser ? (
        <>
          <NotificationDeepLinkBridge />
          <AuthenticatedRoot />
        </>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
