export default async function handler(req, res) {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Missing API Key in Environment Variables' });
  }

  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: {
        'X-Auth-Token': API_KEY,
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // 篩選與格式化資料
    // 世界盃 API 會回傳所有賽事，我們可以根據 stage 或 status 挑選
    // 這裡我們示範如何轉換格式以符合前端原本的需求
    const formattedMatches = data.matches
      // 可選：如果你只要特定階段，可以加上 filter 例如 .filter(m => m.stage === 'LAST_16')
      .map((match, index) => {
        // Football-Data.org 的狀態：SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, SUSPENDED, POSTPONED, CANCELLED, AWARDED
        let appStatus = 'upcoming';
        if (match.status === 'FINISHED') appStatus = 'finished';
        else if (match.status === 'IN_PLAY' || match.status === 'PAUSED') appStatus = 'live';

        // 讓前端去處理時區轉換，這裡直接傳原始的 UTC 時間字串
        const timeStr = match.utcDate;

        // 我們目前前端用 Emoji 顯示國旗，API 通常給圖片網址(crest)。
        // 為了簡單兼容，這裡先給個預設 Emoji，進階可將前端改為顯示 crest 圖片。
        return {
          id: index + 1, // 改為直接使用順序編號 (1, 2, 3...)，而不是 API 給的超長流水號
          teamA: {
            name: match.homeTeam?.name || 'TBD',
            code: match.homeTeam?.tla || 'TBD',
            flag: '🏳️', 
            crest: match.homeTeam?.crest || ''
          },
          teamB: {
            name: match.awayTeam?.name || 'TBD',
            code: match.awayTeam?.tla || 'TBD',
            flag: '🏳️',
            crest: match.awayTeam?.crest || ''
          },
          time: timeStr,
          status: appStatus,
          actualScore: match.score?.fullTime?.home !== null && match.score?.fullTime?.away !== null
            ? `${match.score.fullTime.home} - ${match.score.fullTime.away}`
            : null
        };
      });

    // 實作 Vercel Edge Cache (SWR) 快取機制
    // 讓 CDN 快取 6 秒，確保 API 額度每分鐘均勻消耗在 10 次內
    res.setHeader('Cache-Control', 's-maxage=6, stale-while-revalidate=86400');
    res.status(200).json(formattedMatches);

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch matches data' });
  }
}
