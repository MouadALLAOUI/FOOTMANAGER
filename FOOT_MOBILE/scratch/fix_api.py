with open('src/api/managerTeam.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'return put<SquadPlayerResponse>(/manager/players/, data);',
    'return put<SquadPlayerResponse>(`/manager/players/${id}`, data);'
)

with open('src/api/managerTeam.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated successfully!')
