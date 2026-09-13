import { seedAdmin, currentUser } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  await seedAdmin();
  event.locals.user = await currentUser(event.cookies.get('session'));
  return resolve(event);
};
