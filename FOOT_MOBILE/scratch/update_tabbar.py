with open('src/components/navigation/AjiNqssroTabBar.tsx', 'r', encoding='utf-8') as f:
    text = f.read().replace('\r\n', '\n')

old_code = """          const isActive =
            activeTab === tab.key ||
            pathname === tab.route ||
            (tab.key === 'home' && (pathname === '/(public)' || pathname === '/(public)/' || pathname === '/' || pathname === '/(manager)' || pathname === '/(manager)/'));"""

new_code = """          const isActive =
            activeTab === tab.key ||
            pathname === tab.route ||
            (tab.key === 'team' && (pathname.startsWith('/(manager)/team') || pathname === '/(manager)/team')) ||
            (tab.key === 'home' && (pathname === '/(public)' || pathname === '/(public)/' || pathname === '/' || pathname === '/(manager)' || pathname === '/(manager)/'));"""

assert old_code in text, "old_code not found"
text = text.replace(old_code, new_code)

old_pill = """          if (mode === 'manager' && tab.key === 'home' && isActive) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.activePill}
                onPress={handlePress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
              >
                <Home size={18} color="#FFFFFF" />
                <Text style={styles.activePillText}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }"""

new_pill = """          if (mode === 'manager' && isActive) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.activePill}
                onPress={handlePress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
              >
                {tab.icon('#FFFFFF', 18)}
                <Text style={styles.activePillText}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }"""

assert old_pill in text, "old_pill not found"
text = text.replace(old_pill, new_pill)

with open('src/components/navigation/AjiNqssroTabBar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated AjiNqssroTabBar.tsx successfully')
