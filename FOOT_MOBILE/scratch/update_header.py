with open('src/screens/SquadMemberDetailScreen.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

target = """  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,"""

replacement = """  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,"""

if target in c:
    c = c.replace(target, replacement, 1)
    with open('src/screens/SquadMemberDetailScreen.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('Updated headerContainer')
else:
    print('Target not found')
