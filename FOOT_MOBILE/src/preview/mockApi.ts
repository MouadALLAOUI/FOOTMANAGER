import {
  MOCK_BOOKINGS,
  MOCK_CITIES,
  MOCK_MATCH_REQUESTS,
  MOCK_NOTIFICATIONS,
  MOCK_PLAYERS,
  MOCK_PUBLIC_FEED,
  MOCK_RECEIVED_CHALLENGES,
  MOCK_REGISTERED_TEAMS,
  MOCK_STADIUMS,
  MOCK_TOURNAMENTS,
  getMockUserForPersona,
} from './mockData';
import { getActivePreviewPersona } from './previewState';

export interface MockRequestOptions {
  method: string;
  json?: unknown;
  params?: Record<string, unknown>;
}

export async function handleMockApiRequest<T = unknown>(
  path: string,
  options: MockRequestOptions = { method: 'GET' },
): Promise<T | undefined> {
  const method = (options.method || 'GET').toUpperCase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const persona = getActivePreviewPersona();
  const mockUser = getMockUserForPersona(persona);

  // Short simulated micro-delay for realistic UI transitions (30ms)
  await new Promise((resolve) => setTimeout(resolve, 30));

  // ── 1. Authentication & Session ──
  if (cleanPath === '/me' || cleanPath.endsWith('/me')) {
    return { user: mockUser } as T;
  }

  if (cleanPath === '/login' || cleanPath.endsWith('/login')) {
    return {
      token: 'preview-jwt-mock-token-morocco',
      user: mockUser ?? getMockUserForPersona('manager_approved'),
    } as T;
  }

  if (cleanPath === '/logout' || cleanPath.endsWith('/logout')) {
    return { message: 'تم تسجيل الخروج بنجاح (وضع المعاينة)' } as T;
  }

  // ── 2. Cities ──
  if (cleanPath.startsWith('/cities')) {
    return { data: MOCK_CITIES } as T;
  }

  // ── 3. Home Feed ──
  if (cleanPath === '/v1/home' || cleanPath === '/home' || cleanPath.endsWith('/home')) {
    return {
      tournaments: MOCK_TOURNAMENTS,
      matches: MOCK_PUBLIC_FEED,
      stadiums: MOCK_STADIUMS,
      stats: {
        teams_count: 56,
        matches_played: 148,
        players_count: 890,
      },
    } as T;
  }

  // ── 4. Stadiums ──
  if (cleanPath === '/stadiums' || cleanPath === '/terrains') {
    return { data: MOCK_STADIUMS } as T;
  }
  if (cleanPath.startsWith('/stadiums/') || cleanPath.startsWith('/terrains/')) {
    const id = parseInt(cleanPath.split('/')[2], 10);
    const stadium = MOCK_STADIUMS.find((s) => s.id === id) ?? MOCK_STADIUMS[0];
    return { data: stadium } as T;
  }

  // ── 5. Tournaments ──
  if (cleanPath === '/tournaments' || cleanPath === '/committee/tournaments') {
    return { data: MOCK_TOURNAMENTS, meta: { total: MOCK_TOURNAMENTS.length } } as T;
  }
  if (cleanPath.includes('/tournaments/') && cleanPath.endsWith('/standings')) {
    return { data: MOCK_TOURNAMENTS[0].groups } as T;
  }
  if (cleanPath.includes('/tournaments/') && cleanPath.endsWith('/fixtures')) {
    return {
      data: [
        {
          id: 1,
          round_label: 'الجولة الأولى',
          home_team: MOCK_REGISTERED_TEAMS[0],
          away_team: MOCK_REGISTERED_TEAMS[1],
          match: { home_score: 3, away_score: 2, status: 'finished' },
          scheduled_at: '2026-11-12T20:00:00Z',
          stadium: MOCK_STADIUMS[0],
          group: { name: 'المجموعة A' },
        },
        {
          id: 2,
          round_label: 'الجولة الأولى',
          home_team: MOCK_REGISTERED_TEAMS[2],
          away_team: MOCK_REGISTERED_TEAMS[3],
          match: { home_score: 1, away_score: 1, status: 'finished' },
          scheduled_at: '2026-11-13T20:00:00Z',
          stadium: MOCK_STADIUMS[1],
          group: { name: 'المجموعة B' },
        },
      ],
    } as T;
  }
  if (cleanPath.includes('/tournaments/') && cleanPath.endsWith('/teams')) {
    return { data: MOCK_REGISTERED_TEAMS } as T;
  }
  if (cleanPath.includes('/tournaments/') && cleanPath.endsWith('/draw')) {
    return {
      data: [
        { group_id: 1, name: 'A' },
        { group_id: 2, name: 'B' },
      ],
    } as T;
  }
  if (cleanPath.startsWith('/tournaments/') || cleanPath.startsWith('/committee/tournaments/')) {
    const id = parseInt(cleanPath.split('/')[2], 10);
    const tournament = MOCK_TOURNAMENTS.find((t) => t.id === id) ?? MOCK_TOURNAMENTS[0];
    return { data: tournament } as T;
  }

  // ── 6. Manager Team & Squad ──
  if (cleanPath === '/manager/team' || cleanPath === '/team') {
    return { data: mockUser?.team ?? MOCK_REGISTERED_TEAMS[0] } as T;
  }
  if (cleanPath === '/manager/team/members' || cleanPath === '/team/members') {
    return { data: MOCK_PLAYERS } as T;
  }
  if (cleanPath.startsWith('/manager/team/player/') || cleanPath.startsWith('/team/player/')) {
    const id = parseInt(cleanPath.split('/').pop() || '1', 10);
    const player = MOCK_PLAYERS.find((p) => p.id === id) ?? MOCK_PLAYERS[0];
    return { data: player } as T;
  }

  // ── 7. Manager Matches & Challenges ──
  if (cleanPath === '/manager/my-match-requests' || cleanPath === '/manager/matches') {
    return { data: MOCK_MATCH_REQUESTS } as T;
  }
  if (cleanPath === '/manager/match-feed' || cleanPath === '/challenges') {
    return { data: MOCK_PUBLIC_FEED } as T;
  }
  if (cleanPath === '/manager/received-challenges') {
    return { data: MOCK_RECEIVED_CHALLENGES } as T;
  }
  if (cleanPath === '/manager/registered-teams') {
    return { data: MOCK_REGISTERED_TEAMS } as T;
  }
  if (cleanPath.startsWith('/manager/matches/') || cleanPath.startsWith('/manager/match-requests/')) {
    const id = parseInt(cleanPath.split('/').pop() || '1', 10);
    const match = MOCK_MATCH_REQUESTS.find((m) => m.id === id || m.match_id === id) ?? MOCK_MATCH_REQUESTS[0];
    return { data: match } as T;
  }
  if (cleanPath.startsWith('/matches/')) {
    const id = parseInt(cleanPath.split('/').pop() || '1', 10);
    const match = MOCK_MATCH_REQUESTS.find((m) => m.id === id) ?? MOCK_MATCH_REQUESTS[0];
    return { data: match } as T;
  }

  // ── 8. Bookings ──
  if (cleanPath === '/manager/bookings' || cleanPath.startsWith('/bookings')) {
    return { data: MOCK_BOOKINGS } as T;
  }

  // ── 9. Notifications ──
  if (cleanPath === '/notifications/unread-count') {
    return { count: 3 } as T;
  }
  if (cleanPath.startsWith('/notifications')) {
    return { data: MOCK_NOTIFICATIONS } as T;
  }

  // ── 10. Admin Approvals & Users ──
  if (cleanPath.startsWith('/admin/approvals')) {
    return {
      data: [
        {
          id: 1,
          type: 'manager',
          name: 'رشيد الإدريسي',
          phone: '+212662345678',
          team_name: 'نهضة البرنوصي',
          city: 'الدار البيضاء',
          status: 'pending',
          created_at: '2026-11-10T12:00:00Z',
        },
      ],
    } as T;
  }
  if (cleanPath.startsWith('/admin/')) {
    return { data: MOCK_REGISTERED_TEAMS } as T;
  }

  // ── 11. Generic Mutations (POST, PUT, PATCH, DELETE) ──
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    return {
      success: true,
      message: 'تمت العملية بنجاح في وضع المعاينة',
      data: options.json ?? {},
    } as T;
  }

  // Fallback empty object
  return { data: {} } as T;
}
