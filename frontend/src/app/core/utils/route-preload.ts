/** Prefetch lazy route chunks so navigation feels instant on mobile */
const APP_ROUTES = [
  () => import('../../shared/layout/main-layout.component'),
  () => import('../../features/dashboard/dashboard.component'),
  () => import('../../features/schedule/schedule.component'),
  () => import('../../features/locations/locations.component'),
  () => import('../../features/employees/employees.component'),
  () => import('../../features/settings/settings.component'),
];

let prefetched = false;

export function prefetchAppRoutes(): void {
  if (prefetched) return;
  prefetched = true;
  APP_ROUTES.forEach((load) => { load().catch(() => {}); });
}
