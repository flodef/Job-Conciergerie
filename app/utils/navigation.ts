export enum Page {
  Welcome = '',
  Missions = 'Missions',
  Calendar = 'Calendrier',
  Homes = 'Biens',
  Employees = 'Prestataires',
  Settings = 'Paramètres',
}
export const defaultPage = Page.Welcome;
export const pages = Object.values(Page);

// Map page enum to route paths
export const routeMap: Record<Page, string> = {
  [Page.Welcome]: '/',
  [Page.Missions]: '/missions',
  [Page.Calendar]: '/calendar',
  [Page.Homes]: '/homes',
  [Page.Employees]: '/employees',
  [Page.Settings]: '/settings',
};
