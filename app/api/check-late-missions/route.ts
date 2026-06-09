import { getAllConciergeries } from '@/app/db/conciergerieDb';
import { getAllEmployees } from '@/app/db/employeeDb';
import { getAllHomes } from '@/app/db/homeDb';
import { claimLateNotification, getLateMissionsForCron } from '@/app/db/missionDb';
import { sendLateCompletionEmail } from '@/app/actions/email';
import { getUserKey } from '@/app/contexts/authProvider';
import { Conciergerie, Employee, Home, Mission } from '@/app/types/dataTypes';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron endpoint that checks for late missions and sends notifications.
 *
 * Secured via a bearer token in the Authorization header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Should be called every ~10-15 minutes by an external scheduler (cron-job.org,
 * GitHub Actions, Vercel Cron, ...).
 *
 * This endpoint independently checks for missions that are:
 * - Past their end date
 * - Not completed
 * - Not yet notified (late_notified_at IS NULL)
 *
 * For each late mission, it:
 * 1. Checks if the conciergerie has missionsEndedWithoutCompletion enabled
 * 2. Claims the notification (atomically sets late_notified_at)
 * 3. Sends the email if claim succeeds
 */
async function handleCheckLateMissions(request: NextRequest) {
  // Auth: require a bearer token matching CRON_SECRET
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all necessary data
  const [missions, conciergeries, employees, homes] = await Promise.all([
    getLateMissionsForCron(),
    getAllConciergeries(),
    getAllEmployees(),
    getAllHomes(),
  ]);

  if (!missions || missions.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, skipped: 0 });
  }

  if (!conciergeries || !employees || !homes) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }

  // Create lookup maps
  const conciergerieMap = new Map<string, Conciergerie>(conciergeries.map(c => [c.name, c]));
  const employeeMap = new Map<string, Employee>(employees.map(e => [getUserKey(e), e]));
  const homeMap = new Map<string, Home>(homes.map(h => [h.id, h]));

  // Group missions by conciergerie
  const missionsByConciergerie = new Map<string, Mission[]>();
  missions.forEach(mission => {
    const existing = missionsByConciergerie.get(mission.conciergerieName) || [];
    missionsByConciergerie.set(mission.conciergerieName, [...existing, mission]);
  });

  let sent = 0;
  let skipped = 0;

  // Process each conciergerie's late missions
  for (const [conciergerieName, conciergerieMissions] of missionsByConciergerie.entries()) {
    const conciergerie = conciergerieMap.get(conciergerieName);
    if (!conciergerie) {
      skipped += conciergerieMissions.length;
      continue;
    }

    // Check if conciergerie has notifications enabled
    if (!conciergerie.notificationSettings?.missionsEndedWithoutCompletion) {
      skipped += conciergerieMissions.length;
      continue;
    }

    // Process each mission
    for (const mission of conciergerieMissions) {
      const home = homeMap.get(mission.homeId);
      const employee = mission.employeeId ? employeeMap.get(mission.employeeId) : null;

      if (!home || !employee) {
        skipped++;
        continue;
      }

      // Claim the notification (prevents duplicates)
      const claimed = await claimLateNotification(mission.id);
      if (!claimed) {
        skipped++;
        continue;
      }

      // Send the email
      try {
        await sendLateCompletionEmail(mission, home, employee, conciergerie);
        sent++;
      } catch (error) {
        skipped++;
      }
    }
  }

  return NextResponse.json({
    processed: missions.length,
    sent,
    skipped,
  });
}

export async function GET(request: NextRequest) {
  return handleCheckLateMissions(request);
}

export async function POST(request: NextRequest) {
  return handleCheckLateMissions(request);
}
